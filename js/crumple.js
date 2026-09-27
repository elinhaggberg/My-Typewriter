// Trash animation: the visible part of the paper gets creased and squeezed
// into a ball (a clip-path polygon morph), which is then swapped for a drawn
// paper ball and tossed in an arc into the trash button.

const N = 24; // polygon points; every stage must use the same count

const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
const jitter = (amount) => (Math.random() * 2 - 1) * amount;

function rectPoints(w, h) {
  // N points evenly spread along the rectangle's outline, clockwise from top-left.
  const perim = 2 * (w + h);
  const pts = [];
  for (let k = 0; k < N; k++) {
    let d = (k / N) * perim;
    if (d < w) pts.push([d, 0]);
    else if ((d -= w) < h) pts.push([w, d]);
    else if ((d -= h) < w) pts.push([w - d, h]);
    else pts.push([0, h - (d - w)]);
  }
  return pts;
}

function towards(pts, cx, cy, t, wobble) {
  return pts.map(([x, y]) => [
    x + (cx - x) * (t + jitter(wobble)),
    y + (cy - y) * (t + jitter(wobble)),
  ]);
}

function blobPoints(rect, cx, cy, r) {
  // Same angular order as the rectangle points so the morph doesn't twist.
  return rect.map(([x, y]) => {
    const a = Math.atan2(y - cy, x - cx);
    const rr = r * (1 + jitter(0.18));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
}

function creasesSVG(w, h) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("creases");
  let d = "";
  for (let k = 0; k < 16; k++) {
    let x = Math.random() * w;
    let y = Math.random() * h;
    d += `M${x.toFixed(0)} ${y.toFixed(0)}`;
    for (let s = 0; s < 3; s++) {
      x += jitter(w * 0.35);
      y += jitter(h * 0.3);
      d += `L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
  }
  const shade = document.createElementNS(ns, "path");
  let tri = "";
  for (let k = 0; k < 10; k++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    tri += `M${x.toFixed(0)} ${y.toFixed(0)}l${jitter(w * 0.3).toFixed(0)} ${jitter(h * 0.2).toFixed(0)}l${jitter(w * 0.3).toFixed(0)} ${jitter(h * 0.2).toFixed(0)}z`;
  }
  shade.setAttribute("d", tri);
  shade.setAttribute("fill", "rgba(90,70,40,.08)");
  const lines = document.createElementNS(ns, "path");
  lines.setAttribute("d", d);
  lines.setAttribute("fill", "none");
  lines.setAttribute("stroke", "rgba(90,70,40,.28)");
  lines.setAttribute("stroke-width", "1.2");
  svg.append(shade, lines);
  return svg;
}

export function ballSVG() {
  const n = 12;
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + jitter(0.15);
    const r = 44 + jitter(5);
    pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
  }
  const outline = pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
  let facets = "";
  let creases = "";
  const inner = [];
  for (let k = 0; k < 5; k++) inner.push([50 + jitter(22), 50 + jitter(22)]);
  for (let k = 0; k < n; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[(k + 1) % n];
    const [cx, cy] = inner[k % inner.length];
    const alpha = (0.03 + Math.random() * 0.12).toFixed(2);
    facets += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}L${cx.toFixed(1)} ${cy.toFixed(1)}Z" fill="rgba(110,85,50,${alpha})"/>`;
    creases += `M${cx.toFixed(1)} ${cy.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`;
  }
  let scribbles = "";
  for (let k = 0; k < 7; k++) {
    const x = 25 + Math.random() * 45;
    const y = 25 + Math.random() * 50;
    scribbles += `M${x.toFixed(1)} ${y.toFixed(1)}h${(4 + Math.random() * 10).toFixed(1)}`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="${outline}" fill="#fffcf3" stroke="#c9bb99" stroke-width="1.6" stroke-linejoin="round"/>
    ${facets}
    <path d="${creases}" fill="none" stroke="rgba(120,95,60,.35)" stroke-width="1"/>
    <path d="${scribbles}" fill="none" stroke="rgba(42,35,32,.35)" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// paper: the sheet in the machine; area: the on-screen box above the roller
// (where the sheet is visible); target: the element the ball flies into.
// The sheet is pulled out and held up whole, crumpled, then tossed.
export async function crumple({ paper, area, target, onSqueeze, onLand }) {
  const pr = paper.getBoundingClientRect();
  const w = pr.width;
  const h = pr.height;
  if (reduceMotion() || w < 20 || h < 20) {
    paper.style.visibility = "hidden";
    onLand?.();
    return;
  }

  // The part of the sheet that's visible right now, in sheet coordinates.
  const vx = Math.max(0, area.left - pr.left);
  const vy = Math.max(0, area.top - pr.top);
  const vw = Math.max(1, Math.min(pr.right, area.right) - pr.left - vx);
  const vh = Math.max(1, Math.min(pr.bottom, area.bottom) - pr.top - vy);

  // Where the whole sheet is held up: centered in the area, scaled to fit.
  const areaW = area.right - area.left;
  const areaH = area.bottom - area.top;
  const s = Math.min(1, (areaH * 0.9) / h, (areaW * 0.8) / w);
  const tx = area.left + areaW / 2 - (pr.left + w / 2);
  const ty = area.top + areaH / 2 - (pr.top + h / 2);
  const radius = Math.max(34, Math.min(70, areaH * 0.13)); // ball radius on screen

  const wrap = document.createElement("div");
  wrap.className = "crumple";
  Object.assign(wrap.style, { left: `${pr.left}px`, top: `${pr.top}px`, width: `${w}px`, height: `${h}px` });
  const clone = paper.cloneNode(true);
  clone.removeAttribute("id");
  Object.assign(clone.style, { transform: "none", transition: "none", left: "0", top: "0", fontSize: getComputedStyle(paper).fontSize });
  const creases = creasesSVG(w, h);
  wrap.append(clone, creases);
  document.body.append(wrap);
  paper.style.visibility = "hidden";

  const cx = w / 2;
  const cy = h / 2;
  const full = rectPoints(w, h);
  const visible = rectPoints(vw, vh).map(([x, y]) => [x + vx, y + vy]);
  const squeeze = towards(full, cx, cy, 0.42, 0.12);
  const ball = blobPoints(full, cx, cy, radius / s);
  const held = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(3)})`;

  const lift = wrap.animate(
    [
      { clipPath: poly(visible), transform: "none" },
      { clipPath: poly(full), transform: `${held} rotate(-2deg)` },
    ],
    { duration: 340, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" }
  );
  await lift.finished;
  onSqueeze?.();

  const morph = wrap.animate(
    [
      { clipPath: poly(full), transform: `${held} rotate(-2deg)` },
      { clipPath: poly(squeeze), transform: `${held} rotate(-7deg)`, offset: 0.45 },
      { clipPath: poly(ball), transform: `${held} rotate(14deg)` },
    ],
    { duration: 640, easing: "cubic-bezier(.5,0,.35,1)", fill: "forwards" }
  );
  creases.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, fill: "forwards" });
  clone.animate([{ filter: "brightness(1)" }, { filter: "brightness(.92)" }], { duration: 640, fill: "forwards" });
  await morph.finished;

  // Swap in a drawn paper ball and toss it.
  const size = radius * 2.3;
  const sx = pr.left + w / 2 + tx;
  const sy = pr.top + h / 2 + ty;
  const ballEl = document.createElement("div");
  ballEl.className = "paper-ball";
  ballEl.innerHTML = ballSVG();
  Object.assign(ballEl.style, {
    left: `${sx - size / 2}px`,
    top: `${sy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  document.body.append(ballEl);
  wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }).finished.then(() => wrap.remove());

  const tr = target.getBoundingClientRect();
  const ex = tr.left + tr.width / 2;
  const ey = tr.top + tr.height / 2;
  const peak = Math.max(size * 0.3, Math.min(sy, ey) - Math.max(90, Math.abs(ex - sx) * 0.3));
  const frames = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const x = sx + (ex - sx) * t;
    const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peak + t * t * ey;
    const sc = 1 - 0.72 * t;
    frames.push({ transform: `translate(${(x - sx).toFixed(1)}px, ${(y - sy).toFixed(1)}px) rotate(${(420 * t).toFixed(0)}deg) scale(${sc.toFixed(2)})` });
  }
  frames[frames.length - 1].opacity = 0.2;
  await ballEl.animate(frames, { duration: 620, easing: "cubic-bezier(.3,.1,.6,1)", fill: "forwards" }).finished;
  ballEl.remove();
  onLand?.();
  target.animate(
    [
      { transform: "scale(1) rotate(0)" },
      { transform: "scale(1.15) rotate(-8deg)" },
      { transform: "scale(.95) rotate(6deg)" },
      { transform: "scale(1) rotate(0)" },
    ],
    { duration: 380, easing: "ease-out" }
  );
}
