// Things that decorate the machine or the paper: machine colours, paper
// types, rubber stamps and the date stamp. Used by the screen (render.js)
// and by the image export (export.js), so both draw the same thing.

export const MACHINE_COLORS = {
  pistachio: { label: "Pistage", swatch: "#8cbcab" },
  tomato: { label: "Tomat", swatch: "#e0877a" },
  sky: { label: "Himmel", swatch: "#8fb3d6" },
  mustard: { label: "Senap", swatch: "#d9b45f" },
  lavender: { label: "Lavendel", swatch: "#b3a3d4" },
  graphite: { label: "Grafit", swatch: "#6f6a66" },
};

export const PAPERS = {
  plain: { label: "Vanligt" },
  lined: { label: "Linjerat" },
  grid: { label: "Rutat" },
  old: { label: "Gammalt" },
};

export const INKS = {
  red: "#c8453a",
  blue: "#3b5ea8",
  green: "#3f8a5a",
  purple: "#7a4fa0",
};

// Rubber stamps, drawn in a 40 x 40 box.
export const RUBBER = {
  volcano: {
    label: "Vulkan",
    d: "M3 35L14 17.5Q15.6 15.2 17.2 17.5L18.6 19.6 20 17.4Q21.4 15.2 22.9 17.5L37 35ZM15.5 12.8a3.2 3.2 0 1 1 2.6-5 3.8 3.8 0 0 1 6.6.9 3.1 3.1 0 1 1 .4 5.6Z",
  },
  star: { label: "Stjärna", d: "M20 3l5 10.6 11.6 1.3-8.6 7.9 2.3 11.5L20 28.6 9.7 34.3 12 22.8 3.4 14.9 15 13.6z" },
  heart: { label: "Hjärta", d: "M20 35C9 27 4 21 4 14a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 7-5 13-16 21z" },
  sun: {
    label: "Sol",
    d: "M27 20a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM19 2h2v7h-2zM19 31h2v7h-2zM2 19h7v2H2zM31 19h7v2h-7zM6.6 8L8 6.6l5 5-1.4 1.4zM27 28.4l1.4-1.4 5 5-1.4 1.4zM6.6 32l5-5 1.4 1.4-5 5zM27 11.6l5-5 1.4 1.4-5 5z",
  },
  cat: {
    label: "Katt",
    d: "M7 6l8 7h10l8-7v17a13 13 0 0 1-26 0zM14 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM22 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM18 26h4l-2 2.5z",
    rule: "evenodd",
  },
  flower: {
    label: "Blomma",
    d: "M26 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM34.6 17.2a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM31.3 27.3a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM20.7 27.3a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM17.4 17.2a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM19 28h2v10h-2z",
  },
};

export const RUBBER_SIZE = 3.4; // em, on the paper

export function rubberSVG(kind, extra = "") {
  const s = RUBBER[kind] || RUBBER.star;
  return `<svg viewBox="0 0 40 40" aria-hidden="true" ${extra}><path d="${s.d}" fill="currentColor" fill-rule="${s.rule || "nonzero"}"/></svg>`;
}

// ---------- date stamp ----------
const MONTHS = ["JAN", "FEB", "MARS", "APR", "MAJ", "JUNI", "JULI", "AUG", "SEP", "OKT", "NOV", "DEC"];

export function dateStampText(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Size and place of the date stamp on page one, in em (top-right corner).
export const DATE_STAMP = { w: 7.6, h: 1.4, right: 1.4, top: 0.45, ink: "#3b5ea8" };

// ---------- drawing on a canvas (export) ----------
// Paper backgrounds, in paper em (fs = px per em).
export function drawPaperType(c, type, w, h, fs) {
  if (type === "old") {
    c.fillStyle = "#f3e4c2";
    c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(150,110,50,0)");
    g.addColorStop(1, "rgba(150,110,50,.28)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    return;
  }
  c.fillStyle = "#fffdf7";
  c.fillRect(0, 0, w, h);
  if (type === "lined") {
    c.fillStyle = "rgba(80,120,170,.3)";
    for (let y = 0.3 * fs; y < h; y += 1.5 * fs) c.fillRect(0, y - 0.06 * fs, w, 0.06 * fs);
    c.fillStyle = "rgba(220,80,70,.4)";
    c.fillRect(1.9 * fs, 0, 0.08 * fs, h);
  } else if (type === "grid") {
    c.fillStyle = "rgba(80,120,170,.2)";
    for (let y = 0.3 * fs; y < h; y += 0.75 * fs) c.fillRect(0, y - 0.04 * fs, w, 0.04 * fs);
    for (let x = 0.15 * fs; x < w; x += 0.75 * fs) c.fillRect(x - 0.04 * fs, 0, 0.04 * fs, h);
  }
}

export function drawRubber(c, art, fs) {
  const s = RUBBER[art.k] || RUBBER.star;
  const size = RUBBER_SIZE * fs;
  c.save();
  c.translate(art.x * fs, art.y * fs);
  c.rotate(((art.r || 0) * Math.PI) / 180);
  c.scale(size / 40, size / 40);
  c.translate(-20, -20);
  c.globalAlpha = 0.85;
  c.fillStyle = INKS[art.ink] || INKS.red;
  c.fill(new Path2D(s.d), s.rule || "nonzero");
  c.restore();
}

export function drawDateStamp(c, iso, paperW, fs, tilt) {
  const { w, h, right, top, ink } = DATE_STAMP;
  c.save();
  c.translate((paperW - right - w / 2) * fs, (top + h / 2) * fs);
  c.rotate((tilt * Math.PI) / 180);
  c.globalAlpha = 0.85;
  c.strokeStyle = c.fillStyle = ink;
  c.lineWidth = 0.08 * fs;
  c.strokeRect((-w / 2) * fs, (-h / 2) * fs, w * fs, h * fs);
  c.lineWidth = 0.04 * fs;
  c.strokeRect((-w / 2 + 0.14) * fs, (-h / 2 + 0.14) * fs, (w - 0.28) * fs, (h - 0.28) * fs);
  c.font = `${0.78 * fs}px "Special Elite", "Courier New", monospace`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(dateStampText(iso), 0, 0.04 * fs);
  c.restore();
}

// ---------- ink pictures (the keyboard's emoji keys) ----------
// The emoji keys on a Logitech POP keyboard only reach an iPad as a lone
// Control press, so we can't tell which one was pressed. Each press prints the
// next of these instead, in typewriter ink. Single code points only, so every
// picture takes exactly one character cell.
export const INK_PICTURES = ["😀", "⭐", "🌋", "🐱", "🌞", "😂", "🌸", "🚀", "💖", "🦄", "🍦"];
export const isPicture = (ch) => /\p{Extended_Pictographic}/u.test(ch);
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
export const PICTURE_SCALE = 0.62; // of the paper's font size; keep in sync with .c.pic in the CSS

// An emoji redrawn as typewriter ink: dark lines stay strong, light areas fade.
// (Done by hand because Safari has no canvas filters.)
const inkCache = new Map();
export function inkPicture(ch, px) {
  const key = `${ch}@${px}`;
  if (inkCache.has(key)) return inkCache.get(key);
  const size = Math.ceil(px * 1.4);
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const c = cv.getContext("2d");
  c.font = `${px}px ${EMOJI_FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(ch, size / 2, size / 2);
  const img = c.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    d[i + 3] = d[i + 3] * (1 - lum * 0.78);
    d[i] = 42;
    d[i + 1] = 35;
    d[i + 2] = 32;
  }
  c.putImageData(img, 0, 0);
  inkCache.set(key, cv);
  return cv;
}
