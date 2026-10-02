import * as store from "./storage.js";
import { COLS, ROWS, BELL_AT, CW, LH, MX, MT, PAPER_W, PAPER_H, layout, cursorOf, pageOf } from "./layout.js";
import { hashString } from "./ink.js";
import { pageHTML, docPageOpts } from "./render.js";
import { initSettings, applyMachine } from "./settings.js";
import { initStampDrawer } from "./stampdrawer.js";
import { RUBBER_SIZE } from "./decor.js";
import * as sound from "./sound.js";
import { buildKeyboard, KEYBOARD_UNITS } from "./keyboard.js";
import { crumple } from "./crumple.js";
import { initFolder } from "./folder.js";
import { toast } from "./toast.js";
import { initPreview } from "./preview.js";
import { PLAY_MODES } from "./texts.js";
import { showResultCard, showTrialPicker, resultCardOpen, closeResultCard } from "./celebrate.js";
import { makeExercise, finishExercise, newLetters, LEVELS } from "./practice.js";

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
const btnPreview = $("#btn-preview");
const btnPlay = $("#btn-play");
const playMenu = $("#play-menu");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- state ----------
let prefs = store.getPrefs();
let doc = store.loadCurrent() || store.newDoc();
if (!doc.text && !doc.paper) doc.paper = prefs.paper;
applyMachine({ color: prefs.machineColor, name: prefs.machineName });
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
// fresh: { art, date } -- a rubber stamp or the date stamp that just landed.
function renderPaper(strikeIndex = -1, freshStamp = -1, fresh = {}) {
  const start = shownPage * ROWS;
  // In practice mode the page shows the whole exercise, with the untyped part as ghost letters.
  const src = practice ? practice.lines : lines;
  paper.dataset.paper = doc.paper || "plain";
  paper.innerHTML = pageHTML(src.slice(start, start + ROWS), seed, {
    ...docPageOpts(doc, shownPage),
    strikeIndex,
    ghostFrom: practice ? length : Infinity,
    freshStamp: freshStamp >= 0 ? freshStamp - start : -1,
    freshArt: fresh.art || null,
    freshDate: Boolean(fresh.date),
  });
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
  stampedLast = false;
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
  stampedLast = false;
  const fromCol = cursor.col;
  doc.text += "\n";
  relayout();
  persist();
  if (practice) renderPaper();
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
  const removed = chars.pop();
  doc.text = chars.join("");
  relayout();
  // A word that's no longer finished loses its stamp.
  if (doc.stamps?.length) doc.stamps = doc.stamps.filter((r) => r < cursor.row || (r === cursor.row && removed === "\n"));
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
  if (!doc.text && !doc.paper) doc.paper = prefs.paper;
  stampedLast = false;
  if (play) nextPlayText();
  if (practice) startPractice();
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
  if (practice) scheduleHints();
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
  // Roll back to the top of page one and stamp today's date in the corner.
  if (shownPage !== 0) {
    shownPage = 0;
    renderPaper();
  }
  sound.feed(0.35);
  moveCarriage(COLS - 6, 380, "cubic-bezier(.45,0,.2,1)");
  movePaper(Math.max(8, geo.typeLineY - (MT + 5 * LH) * geo.fs), 420);
  await wait(460);
  doc.dateStamp = new Date().toISOString();
  renderPaper(-1, -1, { date: true });
  setTimeout(() => sound.rubber(), 120);
  await wait(750);
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

// ---------- practice ("Öva") ----------
// Ghost letters on the paper to type over, one word per line. Only the right
// key types; every finished word gets a stamp. Hints glow on the on-screen
// keyboard only -- with a hardware keyboard she's on her own.
let practice = null; // { chars, lines } for the whole target text
let lastInput = "screen";
let wrongs = 0;
let hintTimers = [];
const LEVEL_NAMES = { 2: "Nu blir det ord!", 3: "Nu blir det långa ord!" };

function setPracticeTarget(target) {
  practice = { chars: [...target], lines: layout(target) };
}

// The exercise goes after whatever is on the paper, with one blank line between.
function after(text, exercise) {
  if (!text) return exercise;
  const trailing = text.length - text.replace(/\n+$/, "").length;
  return text + "\n".repeat(Math.max(0, 2 - trailing)) + exercise;
}

function startPractice() {
  setPracticeTarget(after(doc.text, makeExercise(prefs.practice)));
}

function setLevel(level) {
  stopTrial();
  prefs.practice = { ...prefs.practice, level, done: 0 };
  store.setPrefs({ practice: prefs.practice });
  clearHints();
  startPractice(); // replaces the exercise that hasn't been typed yet
  renderPaper();
  paintLevels();
  sound.pop();
  toast(level === 1 ? `Bokstäver: ${newLetters(prefs.practice)}` : LEVELS[level]);
  return rollToNextWord(200).then(() => practice && scheduleHints());
}

const keyName = (ch) => (ch === "\n" ? "return" : ch === " " ? "space" : ch.toUpperCase());

function clearHints() {
  hintTimers.forEach(clearTimeout);
  hintTimers = [];
  keyboard.hint(null);
}

function scheduleHints() {
  clearHints();
  if (!practice || lastInput !== "screen") return;
  const key = keyName(practice.chars[length]);
  hintTimers = [setTimeout(() => keyboard.hint(key, "row"), 2500), setTimeout(() => keyboard.hint(key, "key"), 5000)];
}

// In practice the machine does the carriage returns itself: as soon as a word
// is done it rolls on to the next one, so she only types letters.
async function rollToNextWord(pause = 0) {
  if (!practice || practice.chars[length] !== "\n") return;
  if (pause) await wait(pause);
  while (practice && practice.chars[length] === "\n") await carriageReturn();
}

async function practiceKey(k) {
  const expected = practice.chars[length];
  if (expected === "\n") return rollToNextWord(); // a return left over: just roll on
  if (k === "\n") return; // return isn't needed in practice
  if (k.toUpperCase() !== expected.toUpperCase()) {
    sound.thunk();
    if (++wrongs >= 2 && lastInput === "screen") keyboard.hint(keyName(expected), "key");
    return;
  }
  wrongs = 0;
  clearHints();
  const next = practice.chars[length + 1];
  await typeChar(expected);
  const wordDone = expected !== " " && (next === "\n" || next === undefined);
  if (wordDone) stampWord();
  if (length >= practice.chars.length) finishPractice();
  if (wordDone) await rollToNextWord(380); // let the stamp land first
  if (practice) scheduleHints();
}

function stampWord() {
  if (trial?.phase === "running") {
    trial.count++;
    paintClockCount();
  }
  const row = lines.length - 1; // the line the last letter landed on
  doc.stamps = [...(doc.stamps || []).filter((r) => r !== row), row];
  persist();
  renderPaper(length - 1, row);
  setTimeout(() => sound.stamp(), 90);
}

function finishPractice() {
  if (trial) {
    // In a time trial the level stays put: just keep the words coming.
    setPracticeTarget(after(practice.chars.join(""), makeExercise(prefs.practice)));
    return;
  }
  const { progress, levelUp } = finishExercise(prefs.practice);
  prefs.practice = progress;
  store.setPrefs({ practice: progress });
  sound.cheer();
  if (levelUp) toast(LEVEL_NAMES[progress.level]);
  else if (progress.level === 1) toast(`Bra jobbat! Nya bokstäver: ${newLetters(progress)}`);
  else toast("Bra jobbat! Alla ord är klara.");
  paintLevels();
  // Keep going: the next exercise starts after a blank line.
  setPracticeTarget(after(practice.chars.join(""), makeExercise(progress)));
}

function route(k) {
  if (trial?.phase === "countdown") return; // wait for "Kör!"
  if (practice) return practiceKey(k);
  if (play) return playStep();
  return k === "\n" ? carriageReturn() : typeChar(k);
}

const press = (ch) => enqueue(() => route(ch));
const pressReturn = () => enqueue(() => route("\n"));
const pressBack = () =>
  enqueue(() => {
    // Right after stamping, backspace lifts the last rubber stamp off again.
    if (stampedLast && doc.art?.length) {
      doc.art = doc.art.slice(0, -1);
      stampedLast = doc.art.length > 0;
      persist();
      renderPaper();
      sound.back();
      return;
    }
    if (play && play.pos > 0 && doc.text) play.pos--;
    backspace();
    if (practice) scheduleHints();
  });

// ---------- preview ----------
const preview = initPreview({ onOpen: () => sound.swoosh() });
btnPreview.addEventListener("click", () =>
  enqueue(() => preview.open({ doc, seed, page: shownPage, paper, area: paperArea() }))
);

// ---------- keyboard ----------
const onScreen = (fn) => (...args) => {
  lastInput = "screen";
  fn(...args);
};
const keyboard = buildKeyboard($("#keyboard"), {
  onChar: onScreen(press),
  onBack: onScreen(pressBack),
  onReturn: onScreen(pressReturn),
  caps: prefs.caps,
  onCapsChange: (caps) => store.setPrefs({ caps }),
});

const TYPEABLE = /^[\x20-\x7E¡-ÿ–—‘’“”…€]$/;

window.addEventListener("keydown", (e) => {
  sound.unlock();
  if (e.target.closest?.("input, textarea")) return; // typing a name, not on the paper
  if (folder.isOpen()) {
    if (e.key === "Escape") folder.back();
    return;
  }
  if (preview.isOpen()) {
    if (e.key === "Escape") preview.close();
    return;
  }
  if (resultCardOpen()) {
    e.preventDefault();
    if (e.key === "Escape") closeResultCard();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (lastInput !== "hw" && (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace")) {
    lastInput = "hw";
    if (practice) clearHints();
  }
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
  enqueue(() => (practice ? practiceKey("\n") : carriageReturn()));
});

// ---------- sound (top row) ----------
const btnSound = $("#btn-sound");
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

// ---------- machine settings (gear, side tab or nameplate) ----------
function paintKeyboard() {
  machine.classList.toggle("kb-hidden", !prefs.keyboard);
}
paintKeyboard();

// A hidden keyboard comes back with a tap or a swipe anywhere on the machine
// (but not on the nameplate, which opens the settings).
function showKeyboard() {
  if (prefs.keyboard) return;
  prefs.keyboard = true;
  store.setPrefs({ keyboard: true });
  paintKeyboard();
  sound.pop();
}
let machineTouch = null;
machine.addEventListener("pointerdown", (e) => {
  if (!prefs.keyboard && !e.target.closest("#nameplate")) machineTouch = { y: e.clientY, id: e.pointerId };
});
machine.addEventListener("pointermove", (e) => {
  if (machineTouch?.id === e.pointerId && Math.abs(e.clientY - machineTouch.y) > 24) {
    machineTouch = null;
    showKeyboard();
  }
});
machine.addEventListener("pointerup", (e) => {
  if (machineTouch?.id === e.pointerId) showKeyboard();
  machineTouch = null;
});
machine.addEventListener("pointercancel", () => (machineTouch = null));

initSettings({
  prefs,
  onChange(patch) {
    Object.assign(prefs, patch);
    store.setPrefs(patch);
    if ("machineColor" in patch || "machineName" in patch) applyMachine({ color: prefs.machineColor, name: prefs.machineName });
    if ("keyboard" in patch) paintKeyboard();
    if ("paper" in patch) {
      // New papers use it, and so does the one in the machine.
      doc.paper = patch.paper;
      persist();
      renderPaper();
    }
  },
});

// ---------- rubber stamps ----------
let stamper = null; // { k, ink } while stamping
let stampedLast = false; // backspace lifts the last stamp right after stamping
const drawer = initStampDrawer({
  onPick(pick) {
    const first = !stamper;
    stamper = pick;
    stage.classList.add("stamping");
    if (first) toast("Tryck på papperet för att stämpla!");
  },
  onStop() {
    stamper = null;
    stage.classList.remove("stamping");
  },
});

stage.addEventListener("pointerdown", (e) => {
  if (!stamper || !e.target.closest("#paper")) return;
  const sr = stage.getBoundingClientRect();
  if (e.clientY > sr.top + geo.typeLineY + 0.15 * geo.fs) return; // behind the roller
  e.preventDefault();
  const pr = paper.getBoundingClientRect();
  const half = RUBBER_SIZE / 2;
  const art = {
    k: stamper.k,
    ink: stamper.ink,
    p: shownPage,
    x: Math.max(half, Math.min(PAPER_W - half, (e.clientX - pr.left) / geo.fs)),
    y: Math.max(half, Math.min(PAPER_H - half, (e.clientY - pr.top) / geo.fs)),
    r: Math.round((Math.random() - 0.5) * 24),
  };
  enqueue(() => {
    doc.art = [...(doc.art || []), art];
    stampedLast = true;
    persist();
    renderPaper(-1, -1, { art });
    setTimeout(() => sound.rubber(), 60);
  });
});

// ---------- play menu ----------
// ---------- time trial ("Skriv på tid") ----------
// One minute on the current level: as many stamps (finished words) as possible.
const TRIAL_SECONDS = 60;
const clockEl = $("#trial-clock");
let trial = null; // { phase: "countdown" | "running", count, level, timer, endsAt, shown }

function showClock(text, { big = false, urgent = false } = {}) {
  clockEl.hidden = false;
  clockEl.classList.toggle("big", big);
  clockEl.classList.toggle("urgent", urgent);
  clockEl.querySelector(".t").textContent = text;
  paintClockCount();
}

function paintClockCount() {
  const n = clockEl.querySelector(".n");
  n.hidden = !trial || trial.phase !== "running";
  n.textContent = trial ? trial.count : "";
}

async function startTrial() {
  if (!practice) return;
  stopTrial();
  closeResultCard();
  clearHints();
  trial = { phase: "countdown", count: 0, level: prefs.practice.level ?? 1, timer: null };
  startPractice(); // a fresh exercise after what's on the paper
  renderPaper();
  paintLevels();
  // The machine rolls down to the first word itself, so the minute is all words.
  const run = trial;
  await rollToNextWord();
  if (trial !== run) return;
  let n = 3;
  showClock(String(n), { big: true });
  sound.tick();
  trial.timer = setInterval(() => {
    n -= 1;
    if (n > 0) {
      showClock(String(n), { big: true });
      sound.tick();
      return;
    }
    clearInterval(trial.timer);
    trial.phase = "running";
    trial.endsAt = Date.now() + TRIAL_SECONDS * 1000;
    showClock("Kör!", { big: true });
    sound.tick(true);
    scheduleHints();
    trial.timer = setInterval(updateClock, 200);
  }, 800);
}

function updateClock() {
  const left = Math.max(0, Math.ceil((trial.endsAt - Date.now()) / 1000));
  if (left !== trial.shown) {
    trial.shown = left;
    showClock(`0:${String(left).padStart(2, "0")}`, { urgent: left <= 10 });
    if (left > 0 && left <= 5) sound.tick();
  }
  if (left === 0) endTrial();
}

function endTrial() {
  const { count, level } = trial;
  stopTrial();
  const records = prefs.records || {};
  const best = records[level] || 0;
  const isRecord = count > 0 && count > best;
  if (isRecord) {
    prefs.records = { ...records, [level]: count };
    store.setPrefs({ records: prefs.records });
    sound.fanfare();
  } else {
    sound.cheer();
  }
  showResultCard({
    levelLabel: LEVELS[level],
    count,
    best,
    isRecord,
    onAgain: () => enqueue(startTrial),
    onDone: () => practice && scheduleHints(),
  });
}

function stopTrial() {
  if (!trial) return;
  clearInterval(trial.timer);
  trial = null;
  clearHints();
  clockEl.hidden = true;
  paintLevels();
}

// "Tävla" in the top row (wide screens): pick a level, then straight into a time trial.
$("#btn-trial").addEventListener("click", () => {
  if (trial) return enqueue(stopTrial);
  showTrialPicker({
    levels: LEVELS,
    records: prefs.records || {},
    level: prefs.practice?.level ?? 1,
    onStart(level) {
      const stashed = enterPractice();
      prefs.practice = { ...prefs.practice, level };
      store.setPrefs({ practice: prefs.practice });
      paintPlay();
      if (stashed) toast("Ditt papper ligger i mappen.");
      enqueue(startTrial);
    },
  });
});

// Level buttons over the paper, only in practice mode.
const levelsEl = $("#levels");
levelsEl.innerHTML =
  Object.entries(LEVELS)
    .map(([n, label]) => `<button type="button" data-level="${n}"><b>${n}</b><span>${label}</span></button>`)
    .join("") +
  `<button type="button" class="trial-btn" data-trial aria-label="Skriv på tid, en minut">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 13.5V9.5M10 3h4M18.5 6.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
    <span>1 min</span></button>`;
levelsEl.addEventListener("click", (e) => {
  if (e.target.closest("[data-trial]")) {
    if (practice) enqueue(() => (trial ? stopTrial() : startTrial()));
    return;
  }
  const b = e.target.closest("[data-level]");
  if (b && practice) enqueue(() => setLevel(Number(b.dataset.level)));
});
function paintLevels() {
  levelsEl.hidden = !practice;
  const level = prefs.practice?.level ?? 1;
  levelsEl.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.level) === level)));
  const topTrial = $("#btn-trial");
  topTrial.classList.toggle("active", Boolean(trial));
  topTrial.querySelector(".label").textContent = trial ? "Avbryt" : "Tävla";
  const trialBtn = levelsEl.querySelector("[data-trial]");
  trialBtn.setAttribute("aria-pressed", String(Boolean(trial)));
  trialBtn.querySelector("span").textContent = trial ? "Avbryt" : "1 min";
}

function paintPlay() {
  paintLevels();
  const current = practice ? "practice" : play?.mode || "";
  btnPlay.classList.toggle("active", Boolean(current));
  btnPlay.querySelector(".label").textContent = practice ? "Öva" : play ? PLAY_MODES[play.mode].label : "Läge";
  playMenu.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-checked", String(current === b.dataset.mode)));
}

const MENU = [
  ["", "Skriv själv", "Du bestämmer bokstäverna"],
  ["practice", "Öva", "Hitta bokstäverna på tangentbordet"],
  ...Object.entries(PLAY_MODES).map(([k, m]) => [k, m.label, m.hint]),
];
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
// Switch to Öva. Practice starts on a fresh paper: if the one in the machine
// has something on it, it goes to the folder. Returns whether it did.
function enterPractice() {
  play = null;
  if (practice) return false;
  startPractice();
  store.setPrefs({ play: "practice" });
  if (!hasContent()) return false;
  flush();
  store.addSaved(doc);
  folder.refresh();
  enqueue(async () => {
    sound.swoosh();
    movePaper(offTop(), 420, "ease-in");
    await wait(440);
    await loadDoc(store.newDoc());
  });
  return true;
}

playMenu.addEventListener("click", (e) => {
  const item = e.target.closest("[data-mode]");
  if (!item) return;
  const mode = item.dataset.mode;
  clearHints();
  let stashed = false;
  if (mode === "practice") {
    stashed = enterPractice();
  } else {
    stopTrial();
    practice = null;
    startPlay(mode);
  }
  store.setPrefs({ play: mode });
  paintPlay();
  toggleMenu(false);
  enqueue(() => {
    renderPaper();
    if (practice) scheduleHints();
  });
  sound.pop();
  toast(
    practice
      ? stashed
        ? "Ditt papper ligger i mappen. Nu övar vi!"
        : "Öva: skriv bokstäverna som syns på papperet!"
      : play
        ? `${PLAY_MODES[play.mode].label}: tryck på vilka tangenter som helst!`
        : "Nu skriver du själv igen"
  );
});
document.addEventListener("pointerdown", (e) => {
  if (!playMenu.hidden && !playMenu.contains(e.target) && !btnPlay.contains(e.target)) toggleMenu(false);
});
if (prefs.play === "practice") startPractice();
else startPlay(prefs.play);
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
  if (practice) enqueue(() => rollToNextWord(700).then(() => practice && scheduleHints()));
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
