// "Skicka i kuvert": the letter folds into an envelope, the flap closes, the
// envelope turns over and gets a postage stamp and a postmark. Write who it's
// to, and it's shared as images (the envelope first, then the letter pages).
import { pagesOf } from "./layout.js";
import { hashString } from "./ink.js";
import { paperHTML } from "./render.js";
import { RUBBER, dateStampText } from "./decor.js";
import { imageFiles, shareFiles } from "./export.js";
import * as store from "./storage.js";
import * as sound from "./sound.js";

const FONT = '"Special Elite", "Courier New", monospace';
const PAPER_COLOR = "#f4ead3";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let root = null;
let current = null; // { doc, letters, token }

function build() {
  root = document.createElement("div");
  root.className = "envelope-sheet";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Skicka i kuvert");
  root.innerHTML = `
    <div class="env-backdrop"></div>
    <button class="tool icon-only env-close" aria-label="Stäng">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
    </button>
    <div class="env-scene">
      <div class="env">
        <div class="env-back">
          <div class="env-inside"></div>
          <div class="env-letter"></div>
          <div class="env-pocket"></div>
          <div class="env-flap"></div>
        </div>
        <div class="env-front" hidden>
          <label class="env-from"><span>Från:</span><input type="text" maxlength="24" autocomplete="off" spellcheck="false"></label>
          <div class="env-postage"><div class="env-postage-inner"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="${RUBBER.volcano.d}" fill="currentColor"/></svg><span>POST</span></div></div>
          <div class="env-postmark"><span></span></div>
          <svg class="env-waves" viewBox="0 0 120 40" aria-hidden="true"><path d="M0 8q10-6 20 0t20 0 20 0 20 0 20 0 20 0M0 20q10-6 20 0t20 0 20 0 20 0 20 0 20 0M0 32q10-6 20 0t20 0 20 0 20 0 20 0 20 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <label class="env-to"><span>Till:</span><input type="text" maxlength="28" autocomplete="off" spellcheck="false" placeholder="Vem ska få brevet?"></label>
        </div>
      </div>
    </div>
    <div class="env-actions"><button class="tool primary env-send" disabled>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5l17-7.5-6 16-3-6.5z M11.5 13.5l9-9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
      <span>Skicka</span></button></div>`;
  document.body.append(root);
  root.querySelector(".env-backdrop").addEventListener("click", closeEnvelope);
  root.querySelector(".env-close").addEventListener("click", closeEnvelope);
  root.querySelector(".env-send").addEventListener("click", send);
  root.querySelector(".env-from input").addEventListener("input", (e) => store.setPrefs({ letterFrom: e.target.value }));
}

export const envelopeOpen = () => Boolean(root && !root.hidden);

export function closeEnvelope() {
  if (!envelopeOpen()) return;
  current = null;
  root.querySelectorAll("input").forEach((i) => i.blur());
  root.classList.remove("open");
  setTimeout(() => {
    if (!current) root.hidden = true;
  }, 250);
}

export async function openEnvelope(doc) {
  if (!root) build();
  const token = {};
  current = { doc, letters: null, token };
  const seed = hashString(doc.id);
  const pages = pagesOf(doc.text);
  const env = root.querySelector(".env");
  const back = root.querySelector(".env-back");
  const front = root.querySelector(".env-front");
  const letter = root.querySelector(".env-letter");
  const flap = root.querySelector(".env-flap");
  const sendBtn = root.querySelector(".env-send");

  letter.innerHTML = paperHTML(pages[0], seed, doc, 0);
  back.hidden = false;
  front.hidden = true;
  flap.classList.remove("closed");
  sendBtn.disabled = true;
  root.querySelector(".env-from input").value = store.getPrefs().letterFrom || "";
  root.querySelector(".env-to input").value = "";
  root.querySelector(".env-postmark span").textContent = dateStampText(new Date().toISOString());
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("open"));

  // The letter pages are drawn now, so sharing can start right from the tap.
  imageFiles(doc).then((files) => {
    if (current?.token !== token) return;
    current.letters = files;
    if (!front.hidden) sendBtn.disabled = false;
  });

  const quick = reduceMotion();
  const run = (el, frames, opts) => el.animate(frames, { fill: "forwards", ...opts, duration: quick ? 1 : opts.duration }).finished;
  const up = "translateY(-78%)";
  letter.getAnimations().forEach((a) => a.cancel());
  env.getAnimations().forEach((a) => a.cancel());
  flap.getAnimations().forEach((a) => a.cancel());
  letter.style.transform = `${up} scaleY(1)`;

  await wait(quick ? 0 : 450);
  if (current?.token !== token) return;
  // fold in three
  await run(letter, [{ transform: `${up} scaleY(1)` }, { transform: `${up} scaleY(.34)` }], { duration: 480, easing: "ease-in-out" });
  if (current?.token !== token) return;
  // slide in
  sound.swoosh();
  await run(letter, [{ transform: `${up} scaleY(.34)` }, { transform: "translateY(0) scaleY(.34)" }], { duration: 520, easing: "cubic-bezier(.5,0,.3,1)" });
  if (current?.token !== token) return;
  // close the flap
  flap.classList.add("closed");
  await run(flap, [{ transform: "scaleY(-1)" }, { transform: "scaleY(1)" }], { duration: 380, easing: "ease-in" });
  sound.rubber();
  await wait(quick ? 0 : 250);
  if (current?.token !== token) return;
  // turn it over
  await run(env, [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: 200, easing: "ease-in" });
  back.hidden = true;
  front.hidden = false;
  await run(env, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 220, easing: "ease-out" });
  const mark = root.querySelector(".env-postmark");
  mark.classList.remove("fresh");
  void mark.offsetWidth;
  mark.classList.add("fresh");
  setTimeout(() => sound.rubber(), 100);
  if (current?.letters) sendBtn.disabled = false;
}

// ---------- the envelope as an image ----------
function drawEnvelope(from, to) {
  const W = 1200;
  const H = 750;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const machine = css.getPropertyValue("--machine").trim() || "#8cbcab";
  const machineDeep = css.getPropertyValue("--machine-deep").trim() || "#467566";

  c.fillStyle = PAPER_COLOR;
  c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, "rgba(150,110,50,0)");
  g.addColorStop(1, "rgba(150,110,50,.18)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // postage stamp with perforated edges
  const sx = W - 250;
  const sy = 50;
  const sw = 190;
  const sh = 230;
  c.fillStyle = "#fffdf7";
  c.fillRect(sx, sy, sw, sh);
  c.fillStyle = PAPER_COLOR;
  for (let x = sx; x <= sx + sw; x += 19) {
    c.beginPath(); c.arc(x, sy, 7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x, sy + sh, 7, 0, Math.PI * 2); c.fill();
  }
  for (let y = sy; y <= sy + sh; y += 23) {
    c.beginPath(); c.arc(sx, y, 7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(sx + sw, y, 7, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = machine;
  c.fillRect(sx + 16, sy + 16, sw - 32, sh - 32);
  c.save();
  c.translate(sx + 35, sy + 30);
  c.scale(3, 3);
  c.fillStyle = machineDeep;
  c.fill(new Path2D(RUBBER.volcano.d));
  c.restore();
  c.fillStyle = "#fff";
  c.font = `32px ${FONT}`;
  c.textAlign = "center";
  c.fillText("POST", sx + sw / 2, sy + sh - 30);

  // postmark
  c.save();
  c.translate(W - 300, 205);
  c.rotate(-0.2);
  c.strokeStyle = c.fillStyle = "rgba(55,60,85,.7)";
  c.lineWidth = 5;
  c.beginPath(); c.arc(0, 0, 88, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, 76, 0, Math.PI * 2); c.stroke();
  c.font = `26px ${FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(dateStampText(new Date().toISOString()), 0, 0);
  c.restore();
  c.strokeStyle = "rgba(55,60,85,.6)";
  c.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    for (let x = 0; x <= 200; x += 5) {
      const y = 160 + k * 38 + Math.sin(x / 16) * 9;
      if (x === 0) c.moveTo(W - 590 + x, y);
      else c.lineTo(W - 590 + x, y);
    }
    c.stroke();
  }

  // from, to
  c.fillStyle = "#2a2320";
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.font = `34px ${FONT}`;
  c.fillText(`Från: ${from}`, 60, 95);
  c.font = `42px ${FONT}`;
  c.fillText("Till:", 330, 480);
  c.font = `68px ${FONT}`;
  c.fillText(to, 330, 575);
  c.fillStyle = "rgba(42,35,32,.35)";
  c.fillRect(330, 600, 760, 3);
  c.fillRect(330, 680, 760, 3);
  return canvas;
}

function canvasFile(canvas, name) {
  // Synchronous on purpose: Safari only opens the share sheet straight from a tap.
  const data = atob(canvas.toDataURL("image/png").split(",")[1]);
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
  return new File([bytes], name, { type: "image/png" });
}

function send() {
  if (!current?.letters) return;
  const from = root.querySelector(".env-from input").value.trim();
  const to = root.querySelector(".env-to input").value.trim();
  const envelope = canvasFile(drawEnvelope(from, to), "kuvert.png");
  shareFiles([envelope, ...current.letters]);
}
