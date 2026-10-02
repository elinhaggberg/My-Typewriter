// The time trial's result card, and confetti for a new record.

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const STAR = "M20 3l5 10.6 11.6 1.3-8.6 7.9 2.3 11.5L20 28.6 9.7 34.3 12 22.8 3.4 14.9 15 13.6z";

let card = null;

// { levelLabel, count, best, isRecord, onAgain, onDone }
export function showResultCard({ levelLabel, count, best, isRecord, onAgain, onDone }) {
  closeResultCard();
  card = document.createElement("div");
  card.className = "result";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-label", "Resultat");
  const word = count === 1 ? "stämpel" : "stämplar";
  card.innerHTML = `
    <div class="result-backdrop"></div>
    <div class="result-card${isRecord ? " record" : ""}">
      <div class="result-kicker">Skriv på tid · ${levelLabel}</div>
      <div class="result-stamp" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="7 1.5 11 1.2"/><path d="M20 8.5l3.4 7.2 7.8.9-5.8 5.3 1.6 7.7L20 25.6l-7 4 1.6-7.7-5.8-5.3 7.8-.9z" fill="currentColor"/></svg></div>
      <div class="result-count">${count}</div>
      <div class="result-unit">${word} på en minut</div>
      <div class="result-note">${
        isRecord ? "Nytt rekord!" : best > 0 ? `Bra jobbat! Rekordet är ${best}.` : "Bra jobbat!"
      }</div>
      <div class="result-actions">
        <button type="button" class="tool" data-act="done">Klar</button>
        <button type="button" class="tool primary" data-act="again">Igen!</button>
      </div>
    </div>`;
  document.body.append(card);
  requestAnimationFrame(() => card.classList.add("open"));
  card.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    closeResultCard();
    if (act === "again") onAgain();
    else onDone();
  });
  if (isRecord) confetti();
}

// "Tävla": choose a level (with its record) and start.
export function showTrialPicker({ levels, records, level, onStart }) {
  closeResultCard();
  card = document.createElement("div");
  card.className = "result";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-label", "Tävla");
  let chosen = level;
  card.innerHTML = `
    <div class="result-backdrop" data-act="close"></div>
    <div class="result-card picker">
      <div class="result-kicker">Skriv på tid</div>
      <div class="picker-title">En minut – hur många stämplar hinner du?</div>
      <div class="picker-levels" role="radiogroup" aria-label="Nivå">${Object.entries(levels)
        .map(
          ([n, label]) => `<button type="button" role="radio" data-level="${n}" aria-checked="${Number(n) === chosen}">
            <b>${n}</b><span>${label}</span><small>${records[n] ? `Rekord: ${records[n]}` : "Inget rekord än"}</small>
          </button>`
        )
        .join("")}</div>
      <div class="result-actions">
        <button type="button" class="tool" data-act="close">Avbryt</button>
        <button type="button" class="tool primary" data-act="start">Starta!</button>
      </div>
    </div>`;
  document.body.append(card);
  requestAnimationFrame(() => card.classList.add("open"));
  card.addEventListener("click", (e) => {
    const lv = e.target.closest("[data-level]");
    if (lv) {
      chosen = Number(lv.dataset.level);
      card.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-checked", String(b === lv)));
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    closeResultCard();
    if (act === "start") onStart(chosen);
  });
}

export function closeResultCard() {
  if (!card) return;
  const old = card;
  card = null;
  old.classList.remove("open");
  setTimeout(() => old.remove(), 250);
}

export const resultCardOpen = () => Boolean(card);

// Paper confetti and little stars, falling over everything for a few seconds.
export function confetti() {
  if (reduceMotion()) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  document.body.append(cv);
  const c = cv.getContext("2d");
  c.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const colors = [
    css.getPropertyValue("--machine").trim() || "#8cbcab",
    css.getPropertyValue("--machine-deep").trim() || "#467566",
    "#c8453a", "#3b5ea8", "#e9b949", "#fffdf7", "#7a4fa0",
  ];
  const star = new Path2D(STAR);
  const bits = Array.from({ length: 140 }, (_, k) => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 14,
    vy: -6 - Math.random() * 10,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    color: colors[k % colors.length],
    star: k % 9 === 0,
  }));
  const start = performance.now();
  function frame(now) {
    const t = now - start;
    c.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += 0.32;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      c.save();
      c.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2400) / 800);
      c.translate(b.x, b.y);
      c.rotate(b.r);
      c.fillStyle = b.color;
      if (b.star) {
        c.scale(0.5, 0.5);
        c.translate(-20, -20);
        c.fill(star);
      } else {
        c.scale(1, Math.cos(b.r * 3)); // flutter
        c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      }
      c.restore();
    }
    if (t < 3200) requestAnimationFrame(frame);
    else cv.remove();
  }
  requestAnimationFrame(frame);
}
