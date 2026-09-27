// Machine settings: the machine's name, its colour, the paper type and the
// on-screen keyboard. Opened from the gear in the top row (wide screens), the
// tab on the right edge (narrow screens) or by tapping the nameplate.
import { MACHINE_COLORS, PAPERS } from "./decor.js";

const $ = (s) => document.querySelector(s);

export function applyMachine({ color, name }) {
  document.documentElement.dataset.machine = MACHINE_COLORS[color] ? color : "pistachio";
  $("#nameplate").textContent = (name || "").trim() || "My Typewriter";
}

export function initSettings({ prefs, onChange }) {
  const panel = $("#settings");
  const plate = $("#nameplate");
  const nameInput = $("#set-name");

  $("#set-colors").innerHTML = Object.entries(MACHINE_COLORS)
    .map(([k, c]) => `<button type="button" data-color="${k}" aria-label="${c.label}" style="--c:${c.swatch}"></button>`)
    .join("");
  $("#set-papers").innerHTML = Object.entries(PAPERS)
    .map(([k, p]) => `<button type="button" data-paper="${k}"><span class="paper" data-paper="${k}"></span>${p.label}</button>`)
    .join("");

  function paint() {
    panel.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === prefs.machineColor)));
    panel.querySelectorAll("button[data-paper]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.paper === prefs.paper)));
    $("#set-keyboard").setAttribute("aria-pressed", String(prefs.keyboard));
  }

  const openers = [plate, ...document.querySelectorAll(".settings-btn")];
  let anchor = plate;

  // Next to whatever opened it: above the nameplate, below the gear, left of the side tab.
  function place() {
    const r = anchor.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    const clampX = (x) => Math.max(12, Math.min(x, window.innerWidth - w - 12));
    panel.style.width = `${w}px`;
    panel.style.top = panel.style.bottom = "auto";
    if (anchor === plate) {
      panel.style.left = `${clampX(r.left + r.width / 2 - w / 2)}px`;
      panel.style.bottom = `${Math.max(12, window.innerHeight - r.top + 10)}px`;
    } else if (anchor.classList.contains("side-tab")) {
      panel.style.left = `${clampX(r.left - w - 10)}px`;
      panel.style.top = `${Math.max(12, Math.min(r.top + r.height / 2 - panel.offsetHeight / 2, window.innerHeight - panel.offsetHeight - 12))}px`;
    } else {
      panel.style.left = `${clampX(r.right - w)}px`;
      panel.style.top = `${r.bottom + 8}px`;
    }
  }

  function toggle(show, from = plate) {
    if (show) {
      anchor = from;
      nameInput.value = prefs.machineName || "";
      paint();
      panel.hidden = false;
      place();
    } else {
      nameInput.blur();
      panel.hidden = true;
    }
    openers.forEach((b) => b.setAttribute("aria-expanded", String(show && b === anchor)));
  }

  openers.forEach((b) => b.addEventListener("click", () => toggle(panel.hidden || anchor !== b, b)));
  document.addEventListener("pointerdown", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !openers.some((b) => b.contains(e.target))) toggle(false);
  });
  window.addEventListener("resize", () => !panel.hidden && place());

  nameInput.addEventListener("input", () => onChange({ machineName: nameInput.value }));
  nameInput.addEventListener("keydown", (e) => e.key === "Enter" && toggle(false));
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.color) onChange({ machineColor: b.dataset.color });
    else if (b.dataset.paper) onChange({ paper: b.dataset.paper });
    else if (b.id === "set-keyboard") onChange({ keyboard: !prefs.keyboard });
    paint();
  });

  return { close: () => toggle(false), isOpen: () => !panel.hidden };
}
