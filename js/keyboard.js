// The on-screen keyboard: a Swedish layout with round typewriter keys.
// Letters are stored uppercase; the ABC/abc key switches what gets typed.

const BACK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6-6.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const RETURN_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v6a3 3 0 0 1-3 3H5.5M9.5 9.5L5 14l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", { k: "back", w: 1.6, label: BACK_ICON, aria: "Sudda" }],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Å"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä", { k: "return", w: 1.6, label: RETURN_ICON, aria: "Ny rad" }],
  [{ k: "caps", w: 1.6, aria: "Stora eller små bokstäver" }, "Z", "X", "C", "V", "B", "N", "M", ",", ".", "?"],
  ["!", "-", { k: "space", w: 5.6, label: "", aria: "Mellanslag" }, ":", "'"],
];

// Widest row in key units, including gaps (0.14 per gap).
export const KEYBOARD_UNITS = 12.6 + 11 * 0.14;

export function buildKeyboard(root, { onChar, onBack, onReturn, caps, onCapsChange }) {
  let capsOn = caps;
  const byChar = new Map();

  for (const row of LAYOUT) {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    for (const def of row) {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      key.tabIndex = -1;
      if (typeof def === "string") {
        key.dataset.char = def;
        key.textContent = def;
        key.setAttribute("aria-label", def);
        byChar.set(def, key);
      } else {
        key.dataset.k = def.k;
        key.classList.add("wide", `key-${def.k}`);
        key.style.setProperty("--w", def.w);
        key.innerHTML = def.label ?? "";
        key.setAttribute("aria-label", def.aria);
        byChar.set(def.k, key);
      }
      rowEl.append(key);
    }
    root.append(rowEl);
  }

  function paintCaps() {
    root.classList.toggle("lower", !capsOn);
    const capsKey = byChar.get("caps");
    capsKey.textContent = capsOn ? "ABC" : "abc";
    capsKey.setAttribute("aria-pressed", String(capsOn));
  }
  paintCaps();

  function fire(key) {
    const k = key.dataset.k;
    if (k === "back") return onBack();
    if (k === "return") return onReturn();
    if (k === "space") return onChar(" ");
    if (k === "caps") {
      capsOn = !capsOn;
      paintCaps();
      onCapsChange(capsOn);
      return;
    }
    const ch = key.dataset.char;
    onChar(capsOn ? ch : ch.toLowerCase());
  }

  // pointerdown (not click) so typing feels instant and several fingers work.
  const held = new Map();
  root.addEventListener("pointerdown", (e) => {
    const key = e.target.closest(".key");
    if (!key) return;
    e.preventDefault();
    key.classList.add("down");
    fire(key);
    const hold = { key, timer: null };
    if (key.dataset.k === "back") {
      // Holding backspace keeps erasing, like a real keyboard.
      hold.timer = setTimeout(function again() {
        onBack();
        hold.timer = setTimeout(again, 90);
      }, 450);
    }
    held.set(e.pointerId, hold);
  });

  function release(e) {
    const h = held.get(e.pointerId);
    if (!h) return;
    clearTimeout(h.timer);
    h.key.classList.remove("down");
    held.delete(e.pointerId);
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  root.addEventListener("contextmenu", (e) => e.preventDefault());

  return {
    // Light up the matching on-screen key when a hardware key is pressed.
    flash(name) {
      const key = byChar.get(name) || byChar.get(String(name).toUpperCase());
      if (!key) return;
      key.classList.add("down");
      setTimeout(() => key.classList.remove("down"), 110);
    },
  };
}
