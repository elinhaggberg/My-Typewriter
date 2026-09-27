// The paper is a fixed grid, like a real typewriter: COLS characters per
// line, ROWS lines per page. All sizes are in em of the paper's font size,
// so the same paper scales from folder thumbnail to full typewriter.
// Keep these in sync with the .paper / .page rules in css/style.css.
export const COLS = 36;
export const ROWS = 22;
export const BELL_AT = COLS - 6;

export const CW = 0.6;   // character cell width
export const LH = 1.5;   // line height
export const MX = 2.4;   // left/right margin
export const MT = 2.2;   // top margin
export const MB = 2.5;   // bottom margin
export const PAPER_W = COLS * CW + 2 * MX; // 26.4
export const PAPER_H = MT + ROWS * LH + MB; // 37.7

// Text -> lines of { ch, i } where i is the character's index in the text
// (used to seed its ink wobble). Lines hard-wrap at COLS, "\n" starts a new one.
export function layout(text) {
  const lines = [[]];
  let i = 0;
  for (const ch of text) {
    if (ch === "\n") {
      lines.push([]);
    } else {
      let line = lines[lines.length - 1];
      if (line.length >= COLS) {
        line = [];
        lines.push(line);
      }
      line.push({ ch, i });
    }
    i++;
  }
  return lines;
}

// Where the next character will land. A full line means the carriage has
// already returned to the start of the next one.
export function cursorOf(lines) {
  const last = lines[lines.length - 1];
  if (last.length >= COLS) return { row: lines.length, col: 0 };
  return { row: lines.length - 1, col: last.length };
}

export function pageOf(row) {
  return Math.floor(row / ROWS);
}

// Pages that actually hold something (always at least one).
export function pagesOf(text) {
  const lines = layout(text.replace(/\s+$/, ""));
  const pages = [];
  for (let r = 0; r < lines.length; r += ROWS) pages.push(lines.slice(r, r + ROWS));
  return pages.length ? pages : [[]];
}
