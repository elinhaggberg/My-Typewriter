import { ink } from "./ink.js";
import { ROWS, PAPER_W } from "./layout.js";
import { rubberSVG, dateStampText, DATE_STAMP, INKS } from "./decor.js";

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

export const dateTilt = (seed) => ink(seed, 200000).r * 1.2;

// Everything that sits on page `page` of a document besides its letters.
export function docPageOpts(doc, page) {
  return {
    stamps: pageStamps(doc.stamps, page),
    pageStart: page * ROWS,
    art: (doc.art || []).filter((a) => (a.p || 0) === page),
    date: page === 0 ? doc.dateStamp : null,
  };
}

// HTML for one page (the inside of a .paper element).
// ghostFrom: characters from this index on are shown as faint practice letters.
// stamps: rows within the page that get a stamp just after the line's last letter.
// art: rubber stamps ({ k, ink, x, y, r } in paper em); date: ISO date for the date stamp.
export function pageHTML(
  pageLines,
  seed,
  { strikeIndex = -1, ghostFrom = Infinity, stamps = [], freshStamp = -1, pageStart = 0, art = [], freshArt = null, date = null, freshDate = false } = {}
) {
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
  html += "</div>";
  // Rubber stamps and the date stamp are placed on the whole sheet, not the text area.
  for (const a of art) {
    const cls = a === freshArt ? "rubber fresh" : "rubber";
    html += `<span class="${cls}" style="left:${a.x.toFixed(2)}em;top:${a.y.toFixed(2)}em;--tilt:${(a.r || 0).toFixed(1)}deg;color:${INKS[a.ink] || INKS.red}">${rubberSVG(a.k)}</span>`;
  }
  if (date) {
    const { w, h, right, top } = DATE_STAMP;
    html += `<span class="date-stamp${freshDate ? " fresh" : ""}" style="left:${PAPER_W - right - w}em;top:${top}em;width:${w}em;height:${h}em;--tilt:${dateTilt(seed).toFixed(1)}deg"><span>${dateStampText(date)}</span></span>`;
  }
  return html;
}

// A whole sheet: paper type plus everything on page `page` of `doc`.
export function paperHTML(pageLines, seed, doc = {}, page = 0) {
  return `<div class="paper" data-paper="${doc.paper || "plain"}">${pageHTML(pageLines, seed, docPageOpts(doc, page))}</div>`;
}
