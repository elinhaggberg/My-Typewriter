// Machine settings, opened by tapping the nameplate: the machine's name,
// its colour, the paper type, sound and the on-screen keyboard.
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
    $("#set-sound").setAttribute("aria-pressed", String(prefs.sound));
    $("#set-keyboard").setAttribute("aria-pressed", String(prefs.keyboard));
  }

  function place() {
    const r = plate.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    panel.style.width = `${w}px`;
    panel.style.left = `${Math.max(12, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 12))}px`;
    panel.style.bottom = `${Math.max(12, window.innerHeight - r.top + 10)}px`;
  }

  function toggle(show = panel.hidden) {
    if (show) {
      nameInput.value = prefs.machineName || "";
      paint();
      place();
    } else {
      nameInput.blur();
    }
    panel.hidden = !show;
    plate.setAttribute("aria-expanded", String(show));
  }

  plate.addEventListener("click", () => toggle());
  document.addEventListener("pointerdown", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !plate.contains(e.target)) toggle(false);
  });
  window.addEventListener("resize", () => !panel.hidden && place());

  nameInput.addEventListener("input", () => onChange({ machineName: nameInput.value }));
  nameInput.addEventListener("keydown", (e) => e.key === "Enter" && toggle(false));
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.color) onChange({ machineColor: b.dataset.color });
    else if (b.dataset.paper) onChange({ paper: b.dataset.paper });
    else if (b.id === "set-sound") onChange({ sound: !prefs.sound });
    else if (b.id === "set-keyboard") onChange({ keyboard: !prefs.keyboard });
    paint();
  });

  return { close: () => toggle(false), isOpen: () => !panel.hidden };
}
