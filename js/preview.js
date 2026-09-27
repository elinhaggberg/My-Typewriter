// "Titta": the paper zooms up out of the typewriter so the whole thing can be
// read (and scrolled, if it has several pages), then zooms back down again.
import { pagesOf } from "./layout.js";
import { paperHTML } from "./render.js";

const EASE = "cubic-bezier(.2,.8,.25,1)";
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initPreview({ onOpen, onClose }) {
  const root = document.createElement("div");
  root.className = "preview";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Titta på papperet");
  root.innerHTML = `
    <div class="preview-backdrop"></div>
    <div class="preview-scroll"><div class="preview-pages"></div></div>
    <button class="tool icon-only preview-close" aria-label="Stäng">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
    </button>`;
  document.body.append(root);
  const backdrop = root.querySelector(".preview-backdrop");
  const scroller = root.querySelector(".preview-scroll");
  const pagesEl = root.querySelector(".preview-pages");

  let state = null; // { paper, area, wraps, idx }
  let busy = false;

  // Transform + clip that make `el` (at rest) sit exactly on the machine's
  // paper, showing only the part that's visible above the roller.
  function onMachine(el, paper, area) {
    const to = el.getBoundingClientRect();
    const from = paper.getBoundingClientRect();
    const s = from.width / to.width;
    const clip = [
      Math.max(0, area.top - from.top),
      Math.max(0, from.right - area.right),
      Math.max(0, from.bottom - area.bottom),
      Math.max(0, area.left - from.left),
    ].map((v) => `${(v / s).toFixed(1)}px`);
    return {
      transform: `translate(${(from.left - to.left).toFixed(1)}px, ${(from.top - to.top).toFixed(1)}px) scale(${s.toFixed(4)})`,
      clipPath: `inset(${clip.join(" ")})`,
    };
  }

  async function open({ doc, seed, page, paper, area }) {
    if (state || busy) return;
    busy = true;
    const pages = pagesOf(doc.text);
    const idx = Math.min(page, pages.length - 1);
    pagesEl.innerHTML = pages
      .map((p, k) => `<div class="page-wrap">${paperHTML(p, seed, doc, k)}${pages.length > 1 ? `<div class="page-no">${k + 1} / ${pages.length}</div>` : ""}</div>`)
      .join("");
    root.hidden = false;
    const wraps = [...pagesEl.children];
    scroller.scrollTop = Math.max(0, wraps[idx].offsetTop - parseFloat(getComputedStyle(scroller).paddingTop));
    state = { paper, area, wraps, idx };
    onOpen?.();

    const start = onMachine(wraps[idx], paper, area);
    paper.style.visibility = "hidden";
    const ms = reduceMotion() ? 1 : 460;
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, fill: "forwards" });
    root.querySelector(".preview-close").animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, fill: "forwards" });
    wraps.forEach((w, k) => {
      if (k !== idx) w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, delay: ms * 0.5, fill: "backwards" });
    });
    await wraps[idx].animate([start, { transform: "none", clipPath: "inset(0px 0px 0px 0px)" }], { duration: ms, easing: EASE }).finished;
    busy = false;
  }

  async function close() {
    if (!state || busy) return;
    busy = true;
    const { paper, area, wraps, idx } = state;
    const end = onMachine(wraps[idx], paper, area);
    const ms = reduceMotion() ? 1 : 400;
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: "forwards" });
    root.querySelector(".preview-close").animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.5, fill: "forwards" });
    wraps.forEach((w, k) => {
      if (k !== idx) w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.5, fill: "forwards" });
    });
    await wraps[idx].animate([{ transform: "none", clipPath: "inset(0px 0px 0px 0px)" }, end], { duration: ms, easing: EASE, fill: "forwards" }).finished;
    paper.style.visibility = "";
    root.hidden = true;
    pagesEl.innerHTML = "";
    state = null;
    busy = false;
    onClose?.();
  }

  // Tapping outside a paper (or the X) closes; tapping the paper itself doesn't.
  root.addEventListener("click", (e) => {
    if (e.target.closest(".preview-close") || !e.target.closest(".page-wrap")) close();
  });

  return { open, close, isOpen: () => Boolean(state) };
}
