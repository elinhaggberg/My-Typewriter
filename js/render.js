import { ink } from "./ink.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// HTML for one page of lines (the inside of a .paper element).
export function pageHTML(pageLines, seed, strikeIndex = -1) {
  let html = '<div class="page">';
  for (const line of pageLines) {
    html += '<div class="ln">';
    for (const { ch, i } of line) {
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
  return html + "</div>";
}

export function paperHTML(pageLines, seed) {
  return `<div class="paper">${pageHTML(pageLines, seed)}</div>`;
}
