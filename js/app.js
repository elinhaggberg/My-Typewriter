import * as store from "./storage.js";
import { COLS, ROWS, BELL_AT, CW, LH, MX, MT, PAPER_H, layout, cursorOf, pageOf } from "./layout.js";
import { hashString } from "./ink.js";
import { pageHTML } from "./render.js";
import * as sound from "./sound.js";
import { buildKeyboard, KEYBOARD_UNITS } from "./keyboard.js";
import { crumple } from "./crumple.js";
import { initFolder } from "./folder.js";
import { toast } from "./toast.js";
import { initPreview } from "./preview.js";
import { PLAY_MODES } from "./texts.js";

const $ = (s) => document.querySelector(s);
const stage = $("#stage");
const carriage = $("#carriage");
const paper = $("#paper");
const guide = $("#typeguide");
const pageTag = $("#page-tag");
const machine = $("#machine");
const btnSave = $("#btn-save");
const btnTrash = $("#btn-trash");
const btnFolder = $("#btn-folder");
const btnSound = $("#btn-sound");
const btnKeyboard = $("#btn-keyboard");
const btnPreview = $("#btn-preview");
const btnPlay = $("#btn-play");
const playMenu = $("#play-menu");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- state ----------
let prefs = store.getPrefs();
let doc = store.loadCurrent() || store.newDoc();
let seed = hashString(doc.id);
let length = [...doc.text].length;
let lines = layout(doc.text);
let cursor = cursorOf(lines);
let shownPage = pageOf(cursor.row);
let geo = { sw: 0, sh: 0, fs: 16, typeLineY: 0, knob: 0 };

sound.setEnabled(prefs.sound);
store.onStorageError(() => toast("Minnet är fullt – släng några gamla papper i mappen.", { duration: 5000 }));

function relayout() {
  length = [...doc.text].length;
  lines = layout(doc.text);
  cursor = cursorOf(lines);
}

const hasContent = () => doc.text.trim().length > 0;

let saveTimer = null;
function persist() {
  doc.updatedAt = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveCurrent(doc), 250);
}
function flush() {
  clearTimeout(saveTimer);
  store.saveCurrent(doc);
}
document.addEventListener("visibilitychange", () => document.hidden && flush());
window.addEventListener("pagehide", flush);

// ---------- geometry ----------
function measure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Key size: fit the widest row, and let the keyboard take at most ~45% of the height.
  const u = Math.max(26, Math.min(80, (vw - 40) / KEYBOARD_UNITS, (vh * 0.45 - 40) / 5.7));
  document.documentElement.style.setProperty("--u", `${u.toFixed(1)}px`);

  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  const fs = Math.max(13, Math.min(30, sw / 36, (sh - 10) / 8.5));
  const typeLineY = sh - 1.95 * fs;
  geo = { sw, sh, fs, typeLineY, knob: 2.6 * fs };
  stage.style.setProperty("--fs", `${fs.toFixed(2)}px`);
  stage.style.setProperty("--type-line", `${typeLineY.toFixed(1)}px`);
  place(0, 0);
}

const carriageX = (col) => geo.sw / 2 - (geo.knob + (MX + (col + 0.5) * CW) * geo.fs);
const paperY = (rowInPage) => geo.typeLineY - (MT + (rowInPage + 1) * LH) * geo.fs + 0.25 * geo.fs;
const offTop = () => -(PAPER_H * geo.fs) - 40;

function moveCarriage(col, ms, ease = "cubic-bezier(.2,.7,.3,1)") {
  carriage.style.transition = `transform ${ms}ms ${ease}`;
  carriage.style.transform = `translate3d(${carriageX(col).toFixed(1)}px,0,0)`;
}

function movePaper(y, ms, ease = "cubic-bezier(.2,.7,.3,1)") {
  paper.style.transition = `transform ${ms}ms ${ease}`;
  paper.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
}

function place(msX = 70, msY = 160) {
  moveCarriage(cursor.col, msX);
  movePaper(paperY(cursor.row - shownPage * ROWS), msY);
}

// ---------- rendering ----------
function renderPaper(strikeIndex = -1) {
  const start = shownPage * ROWS;
  paper.innerHTML = pageHTML(lines.slice(start, start + ROWS), seed, strikeIndex);
  const pages = Math.max(pageOf(cursor.row), pageOf(lines.length - 1)) + 1;
  pageTag.hidden = pages < 2;
  pageTag.textContent = `Sida ${shownPage + 1}`;
}

function strike() {
  guide.classList.remove("hit");
  void guide.offsetWidth;
  guide.classList.add("hit");
}

// ---------- input queue ----------
// Everything that changes the paper runs in order, so fast typing during a
// carriage return or a page feed lands in the right place.
let chain = Promise.resolve();
let queued = 0;
function enqueue(fn) {
  if (queued > 60) return;
  queued++;
  chain = chain
    .then(fn)
    .catch((err) => console.error(err))
    .finally(() => queued--);
}

// ---------- typing ----------
function typeChar(ch) {
  const before = cursor;
  doc.text += ch;
  relayout();
  persist();
  strike();
  if (ch === " ") sound.space();
  else sound.key();

  if (cursor.row !== before.row) {
    // The line is full: show the last letter, then the carriage returns by itself.
    renderPaper(length - 1);
    moveCarriage(before.col + 1, 70);
    return lineChange(before.col + 1, 110);
  }
  if (cursor.col === BELL_AT) sound.bell();
  renderPaper(ch === " " ? -1 : length - 1);
  place();
}

function carriageReturn() {
  const fromCol = cursor.col;
  doc.text += "\n";
  relayout();
  persist();
  return lineChange(fromCol, 0);
}

async function lineChange(fromCol, delay) {
  if (delay) await wait(delay);
  const dist = fromCol / COLS;
  sound.carriageReturn(dist);
  const ms = 160 + 320 * dist;
  moveCarriage(0, ms, "cubic-bezier(.45,0,.2,1)");
  if (pageOf(cursor.row) !== shownPage) {
    await wait(ms);
    await feedTo(pageOf(cursor.row));
  } else {
    movePaper(paperY(cursor.row - shownPage * ROWS), 180);
    await wait(Math.min(ms, 200));
  }
}

function backspace() {
  if (!doc.text) {
    sound.thunk();
    return;
  }
  const chars = [...doc.text];
  chars.pop();
  doc.text = chars.join("");
  relayout();
  persist();
  sound.back();
  const p = pageOf(cursor.row);
  if (p !== shownPage) {
    shownPage = p;
    renderPaper();
    place(200, 250);
  } else {
    renderPaper();
    place(90, 160);
  }
}

// Roll the current sheet out the top and feed the next page in.
async function feedTo(page) {
  sound.feed(0.4);
  movePaper(offTop(), 420, "cubic-bezier(.5,0,.8,.6)");
  await wait(420);
  shownPage = page;
  renderPaper();
  movePaper(geo.sh + 10, 0);
  void paper.offsetWidth;
  sound.feed(0.5);
  movePaper(paperY(cursor.row - shownPage * ROWS), 560, "cubic-bezier(.2,.8,.25,1)");
  await wait(560);
}

// Put a (new or restored) paper into the machine with a feed animation.
async function loadDoc(next) {
  doc = next;
  if (play) nextPlayText();
  seed = hashString(doc.id);
  relayout();
  flush();
  shownPage = pageOf(cursor.row);
  renderPaper();
  movePaper(geo.sh + 10, 0);
  paper.style.visibility = "";
  void paper.offsetWidth;
  moveCarriage(cursor.col, 350, "cubic-bezier(.45,0,.2,1)");
  sound.feed(0.6);
  movePaper(paperY(cursor.row - shownPage * ROWS), 650, "cubic-bezier(.2,.8,.25,1)");
  await wait(650);
}

// The part of the stage where the paper shows, above the roller.
function paperArea() {
  const sr = stage.getBoundingClientRect();
  return { left: sr.left, top: sr.top, right: sr.right, bottom: sr.top + geo.typeLineY + 0.2 * geo.fs };
}

function nudge(el) {
  el.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
    { duration: 320 }
  );
}

async function savePaper() {
  if (!hasContent()) {
    nudge(btnSave);
    sound.thunk();
    return;
  }
  flush();
  sound.swoosh();
  moveCarriage(Math.round(COLS / 2), 300, "ease-in-out");
  movePaper(offTop(), 560, "cubic-bezier(.5,0,.75,.4)");
  await wait(520);
  if (!store.addSaved(doc)) return;
  folder.refresh();
  sound.pop();
  btnFolder.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 340, easing: "ease-out" });
  toast("Sparat i mappen");
  await loadDoc(store.newDoc());
}

async function trashPaper() {
  if (!hasContent()) {
    nudge(btnTrash);
    sound.thunk();
    return;
  }
  const trashed = doc;
  flush();
  sound.swoosh();
  await crumple({ paper, area: paperArea(), target: btnTrash, onSqueeze: sound.crumple, onLand: sound.toss });
  store.addTrash(trashed);
  folder.refresh();
  toast("Papperet hamnade i papperskorgen", {
    action: "Ångra",
    duration: 7000,
    onAction: () => enqueue(() => undoTrash(trashed.id)),
  });
  await loadDoc(store.newDoc());
}

async function undoTrash(id) {
  const item = store.takeFromTrash(id);
  if (!item) return;
  if (!hasContent()) {
    movePaper(offTop(), 300, "ease-in");
    await wait(300);
    await loadDoc(item);
  } else {
    store.addSaved(item);
    toast("Papperet ligger i mappen igen");
  }
  folder.refresh();
}

async function continueDoc(id) {
  const item = store.takeFromSaved(id);
  if (!item) return;
  folder.close();
  let stashed = false;
  if (hasContent()) {
    flush();
    store.addSaved(doc);
    stashed = true;
  }
  sound.swoosh();
  movePaper(offTop(), 380, "ease-in");
  await wait(420);
  await loadDoc(item);
  folder.refresh();
  if (stashed) toast("Papperet du skrev på ligger i mappen");
}

// ---------- folder ----------
const folderCount = $("#folder-count");
const folder = initFolder({
  onContinue: (id) => enqueue(() => continueDoc(id)),
  onChange: (count) => {
    folderCount.hidden = !count;
    folderCount.textContent = count;
  },
});
folder.refresh();

// ---------- play mode ----------
// In play mode every key types the next letter of a ready-made text.
let play = null; // { mode, textIndex, pos }

function startPlay(mode) {
  if (!PLAY_MODES[mode]) {
    play = null;
    return;
  }
  play = { mode, textIndex: Math.floor(Math.random() * PLAY_MODES[mode].texts.length), pos: 0 };
}

function nextPlayText() {
  play.textIndex = (play.textIndex + 1) % PLAY_MODES[play.mode].texts.length;
  play.pos = 0;
}

function playStep() {
  // A blank line after each text, then the next one starts.
  const script = PLAY_MODES[play.mode].texts[play.textIndex] + "\n\n";
  const ch = script[play.pos++];
  if (play.pos >= script.length) nextPlayText();
  return ch === "\n" ? carriageReturn() : typeChar(ch);
}

const press = (ch) => enqueue(() => (play ? playStep() : typeChar(ch)));
const pressReturn = () => enqueue(() => (play ? playStep() : carriageReturn()));
const pressBack = () =>
  enqueue(() => {
    if (play && play.pos > 0 && doc.text) play.pos--;
    return backspace();
  });

// ---------- preview ----------
const preview = initPreview({ onOpen: () => sound.swoosh() });
btnPreview.addEventListener("click", () =>
  enqueue(() => preview.open({ text: doc.text, seed, page: shownPage, paper, area: paperArea() }))
);

// ---------- keyboard ----------
const keyboard = buildKeyboard($("#keyboard"), {
  onChar: press,
  onBack: pressBack,
  onReturn: pressReturn,
  caps: prefs.caps,
  onCapsChange: (caps) => store.setPrefs({ caps }),
});

const TYPEABLE = /^[\x20-\x7E¡-ÿ–—‘’“”…€]$/;

window.addEventListener("keydown", (e) => {
  sound.unlock();
  if (folder.isOpen()) {
    if (e.key === "Escape") folder.back();
    return;
  }
  if (preview.isOpen()) {
    if (e.key === "Escape") preview.close();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (e.key === "Backspace") {
    e.preventDefault();
    keyboard.flash("back");
    pressBack();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (e.repeat) return;
    keyboard.flash("return");
    pressReturn();
  } else if (TYPEABLE.test(e.key)) {
    e.preventDefault();
    if (e.repeat) return;
    keyboard.flash(e.key === " " ? "space" : e.key);
    press(e.key);
  }
});

// ---------- toolbar ----------
btnSave.addEventListener("click", () => enqueue(savePaper));
btnTrash.addEventListener("click", () => enqueue(trashPaper));
btnFolder.addEventListener("click", () => folder.open());
$("#lever").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  enqueue(carriageReturn);
});

function paintSound() {
  btnSound.setAttribute("aria-pressed", String(prefs.sound));
  btnSound.classList.toggle("muted", !prefs.sound);
}
btnSound.addEventListener("click", () => {
  prefs.sound = !prefs.sound;
  store.setPrefs({ sound: prefs.sound });
  sound.setEnabled(prefs.sound);
  paintSound();
  sound.pop();
});
paintSound();

function paintKeyboard() {
  machine.classList.toggle("kb-hidden", !prefs.keyboard);
  btnKeyboard.setAttribute("aria-pressed", String(prefs.keyboard));
}
btnKeyboard.addEventListener("click", () => {
  prefs.keyboard = !prefs.keyboard;
  store.setPrefs({ keyboard: prefs.keyboard });
  paintKeyboard();
});
paintKeyboard();

// ---------- play menu ----------
function paintPlay() {
  btnPlay.classList.toggle("active", Boolean(play));
  btnPlay.querySelector(".label").textContent = play ? PLAY_MODES[play.mode].label : "Lek";
  playMenu.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-checked", String((play?.mode || "") === b.dataset.mode)));
}

const MENU = [["", "Skriv själv", "Du bestämmer bokstäverna"], ...Object.entries(PLAY_MODES).map(([k, m]) => [k, m.label, m.hint])];
playMenu.innerHTML = MENU.map(
  ([mode, label, hint]) =>
    `<button type="button" role="menuitemradio" data-mode="${mode}"><strong>${label}</strong><span>${hint}</span></button>`
).join("");

function toggleMenu(show = playMenu.hidden) {
  if (show) {
    const r = btnPlay.getBoundingClientRect();
    playMenu.style.top = `${r.bottom + 8}px`;
    playMenu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 268))}px`;
  }
  playMenu.hidden = !show;
  btnPlay.setAttribute("aria-expanded", String(show));
}
btnPlay.addEventListener("click", () => toggleMenu());
playMenu.addEventListener("click", (e) => {
  const item = e.target.closest("[data-mode]");
  if (!item) return;
  startPlay(item.dataset.mode);
  store.setPrefs({ play: item.dataset.mode });
  paintPlay();
  toggleMenu(false);
  sound.pop();
  toast(play ? `${PLAY_MODES[play.mode].label}: tryck på vilka tangenter som helst!` : "Nu skriver du själv igen");
});
document.addEventListener("pointerdown", (e) => {
  if (!playMenu.hidden && !playMenu.contains(e.target) && !btnPlay.contains(e.target)) toggleMenu(false);
});
startPlay(prefs.play);
paintPlay();

// Audio may only start after a gesture. iOS doesn't count pointerdown/touchstart,
// so also unlock on touchend and click (keydown is handled above).
for (const type of ["pointerdown", "touchend", "click"]) {
  window.addEventListener(type, () => sound.unlock(), { capture: true });
}

// ---------- boot ----------
new ResizeObserver(() => measure()).observe(stage);
window.addEventListener("resize", measure);
measure();

document.fonts.load('20px "Special Elite"').finally(() => {
  renderPaper();
  movePaper(geo.sh + 10, 0);
  moveCarriage(cursor.col, 0);
  void paper.offsetWidth;
  document.body.classList.add("ready");
  movePaper(paperY(cursor.row - shownPage * ROWS), 700, "cubic-bezier(.2,.8,.25,1)");
});

navigator.storage?.persist?.().catch(() => {});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// iPad/iPhone Safari keeps data for sites only ~7 days without a visit;
// an app on the Home Screen keeps it for good.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
if (isIOS && !standalone && !prefs.installHintDismissed) {
  setTimeout(() => {
    toast("Tips: Dela → Lägg till på hemskärmen, så sparas papperen säkert.", {
      action: "OK",
      duration: 15000,
      onAction: () => store.setPrefs({ installHintDismissed: true }),
    });
  }, 1500);
}
