import { ink } from "./ink.js";
import { ROWS } from "./layout.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// A star in a round ink stamp, given for every finished practice word.
export const STAMP_SIZE = 1.65; // em; keep in sync with .stamp in the CSS
export const STAMP_PATH = "M20 8.5l3.4 7.2 7.8.9-5.8 5.3 1.6 7.7L20 25.6l-7 4 1.6-7.7-5.8-5.3 7.8-.9z";
const STAMP_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="7 1.5 11 1.2"/><path d="${STAMP_PATH}" fill="currentColor"/></svg>`;

export const stampTilt = (seed, row) => ink(seed, 100000 + row).r * 5;

// Stamped rows (global line numbers) that fall on page `page`, as rows within it.
export function pageStamps(stamps = [], page) {
  return stamps.filter((r) => Math.floor(r / ROWS) === page).map((r) => r % ROWS);
}

// HTML for one page of lines (the inside of a .paper element).
// ghostFrom: characters from this index on are shown as faint practice letters.
// stamps: rows within the page that get a stamp just after the line's last letter.
export function pageHTML(pageLines, seed, { strikeIndex = -1, ghostFrom = Infinity, stamps = [], freshStamp = -1, pageStart = 0 } = {}) {
  let html = '<div class="page">';
  for (const line of pageLines) {
    html += '<div class="ln">';
    for (const { ch, i } of line) {
      if (i >= ghostFrom) {
        const next = i === ghostFrom ? " next" : "";
        html += `<span class="c ghost${next}">${ch === " " ? "" : ESC[ch] || ch}</span>`;
        continue;
      }
      if (ch === " ") {
        html += '<span class="c"></span>';
        continue;
      }
      const j = ink(seed, i);
      const cls = i === strikeIndex ? "c strike" : "c";
      html += `<span class="${cls}" style="--r:${j.r};--x:${j.x};--y:${j.y};--a:${j.a}">${ESC[ch] || ch}</span>`;
    }
    html += "</div>";
  }
  for (const row of stamps) {
    const cls = row === freshStamp ? "stamp fresh" : "stamp";
    html += `<span class="${cls}" style="--row:${row};--col:${pageLines[row]?.length ?? 0};--tilt:${stampTilt(seed, pageStart + row).toFixed(1)}deg">${STAMP_SVG}</span>`;
  }
  return html + "</div>";
}

export function paperHTML(pageLines, seed, stamps = [], pageStart = 0) {
  return `<div class="paper">${pageHTML(pageLines, seed, { stamps, pageStart })}</div>`;
}
