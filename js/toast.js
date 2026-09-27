let current = null;

// Small message under the toolbar, optionally with one action button.
export function toast(message, { action, onAction, duration = 2600 } = {}) {
  if (current) current.dismiss();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  const text = document.createElement("span");
  text.textContent = message;
  el.append(text);
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
    if (current?.el === el) current = null;
  };
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action;
    btn.addEventListener("click", () => {
      dismiss();
      onAction?.();
    });
    el.append(btn);
  }
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("show"));
  timer = setTimeout(dismiss, duration);
  current = { el, dismiss };
  return dismiss;
}
