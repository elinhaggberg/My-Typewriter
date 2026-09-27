// "Save as image" / "Save as text". Files are prepared ahead of time so the
// share sheet can open straight from the tap -- Safari refuses to share if
// the tap was followed by slow async work.
import { CW, LH, MX, MT, ROWS, PAPER_W, PAPER_H, pagesOf } from "./layout.js";
import { pageStamps, stampTilt, STAMP_PATH, STAMP_SIZE } from "./render.js";
import { hashString, ink } from "./ink.js";

const FONT = '"Special Elite", "Courier New", monospace';

export function docTitle(doc) {
  const first = doc.text.trim().split(/\s+/).slice(0, 5).join(" ");
  if (!first) return "Tomt papper";
  return first.length > 28 ? first.slice(0, 27) + "…" : first;
}

function fileBase(doc) {
  const date = (doc.savedAt || doc.updatedAt || new Date().toISOString()).slice(0, 10);
  const slug = docTitle(doc)
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${slug || "papper"}-${date}`;
}

export function textFile(doc) {
  return new File([doc.text.replace(/\s+$/, "") + "\n"], `${fileBase(doc)}.txt`, {
    type: "text/plain",
  });
}

function drawPage(pageLines, seed, fs, stamps = [], pageStart = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAPER_W * fs);
  canvas.height = Math.round(PAPER_H * fs);
  const c = canvas.getContext("2d");

  // paper with a faint grain
  c.fillStyle = "#fffdf7";
  c.fillRect(0, 0, canvas.width, canvas.height);
  for (let k = 0; k < canvas.width * canvas.height * 0.002; k++) {
    c.fillStyle = `rgba(120,100,60,${(Math.random() * 0.05).toFixed(3)})`;
    c.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
  }

  c.font = `${fs * 0.9}px ${FONT}`; // same 90% glyph size as .c in the CSS
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.shadowColor = "rgba(42,35,32,.45)";
  c.shadowBlur = fs * 0.03;
  pageLines.forEach((line, row) => {
    const cy = (MT + row * LH + LH / 2) * fs;
    line.forEach(({ ch, i }, col) => {
      if (ch === " ") return;
      const j = ink(seed, i);
      c.save();
      c.translate((MX + (col + 0.5) * CW + j.x) * fs, cy + j.y * fs);
      c.rotate((j.r * Math.PI) / 180);
      c.globalAlpha = j.a;
      c.fillStyle = "#2a2320";
      c.fillText(ch, 0, 0);
      c.restore();
    });
  });
  // stamps right after each stamped line, same place and tilt as .stamp in the CSS
  c.shadowBlur = 0;
  const star = new Path2D(STAMP_PATH);
  for (const row of stamps) {
    const size = STAMP_SIZE * fs;
    c.save();
    c.translate((MX + (pageLines[row]?.length ?? 0) * CW + 0.45) * fs + size / 2, (MT + row * LH - 0.05) * fs + size / 2);
    c.rotate((stampTilt(seed, pageStart + row) * Math.PI) / 180);
    c.scale(size / 40, size / 40);
    c.translate(-20, -20);
    c.globalAlpha = 0.85;
    c.fillStyle = c.strokeStyle = "#c8453a";
    c.lineWidth = 2.4;
    c.setLineDash([7, 1.5, 11, 1.2]);
    c.beginPath();
    c.arc(20, 20, 17, 0, Math.PI * 2);
    c.stroke();
    c.fill(star);
    c.restore();
  }
  return canvas;
}

export async function imageFiles(doc) {
  const fs = 44; // ~1160 x 1660 px per page
  await document.fonts.load(`${fs}px "Special Elite"`);
  const seed = hashString(doc.id);
  const pages = pagesOf(doc.text);
  const base = fileBase(doc);
  const files = [];
  for (let p = 0; p < pages.length; p++) {
    const canvas = drawPage(pages[p], seed, fs, pageStamps(doc.stamps, p), p * ROWS);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const name = pages.length > 1 ? `${base}-sida-${p + 1}.png` : `${base}.png`;
    files.push(new File([blob], name, { type: "image/png" }));
  }
  return files;
}

// Share sheet where available (iPad/iPhone: Save Image, Save to Files,
// AirDrop...), plain downloads otherwise.
export async function shareFiles(files) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
