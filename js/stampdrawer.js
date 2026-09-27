// The rubber stamp drawer: pick a stamp and an ink, then tap the paper.
import { RUBBER, INKS, rubberSVG } from "./decor.js";

const $ = (s) => document.querySelector(s);

export function initStampDrawer({ onPick, onStop }) {
  const drawer = $("#stamp-drawer");
  const btn = $("#btn-stamps");
  let ink = "red";
  let active = null; // the stamp kind in use, or null

  function render() {
    drawer.innerHTML = `
      <div class="rubbers">${Object.entries(RUBBER)
        .map(([k, r]) => `<button type="button" data-kind="${k}" aria-label="${r.label}" aria-pressed="${k === active}" style="color:${INKS[ink]}">${rubberSVG(k)}</button>`)
        .join("")}</div>
      <div class="inks">${Object.entries(INKS)
        .map(([k, c]) => `<button type="button" data-ink="${k}" aria-label="Bläck" aria-pressed="${k === ink}" style="--c:${c}"></button>`)
        .join("")}</div>
      ${active ? '<button type="button" class="tool small stop" data-stop>Sluta stämpla</button>' : '<p class="hint">Välj en stämpel och tryck sen på papperet.</p>'}`;
  }

  function paintButton() {
    btn.classList.toggle("active", Boolean(active));
    btn.querySelector(".chosen").innerHTML = active ? rubberSVG(active) : "";
    btn.querySelector(".chosen").style.color = INKS[ink];
  }

  function toggle(show = drawer.hidden) {
    if (show) {
      render();
      const r = btn.getBoundingClientRect();
      const w = 272;
      drawer.style.top = `${r.bottom + 8}px`;
      drawer.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))}px`;
    }
    drawer.hidden = !show;
    btn.setAttribute("aria-expanded", String(show));
  }

  btn.addEventListener("click", () => toggle());
  document.addEventListener("pointerdown", (e) => {
    if (!drawer.hidden && !drawer.contains(e.target) && !btn.contains(e.target)) toggle(false);
  });
  drawer.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.ink) {
      ink = b.dataset.ink;
      render();
      paintButton();
      if (active) onPick({ k: active, ink });
      return;
    }
    if (b.dataset.kind) {
      active = b.dataset.kind;
      onPick({ k: active, ink });
    } else if ("stop" in b.dataset) {
      active = null;
      onStop();
    }
    paintButton();
    toggle(false);
  });

  return {
    stop() {
      active = null;
      paintButton();
    },
  };
}
