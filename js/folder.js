// The folder: saved papers and the trash, plus a detail view per paper
// with "continue writing", "save as image" and "save as text".
import * as store from "./storage.js";
import { pagesOf } from "./layout.js";
import { hashString } from "./ink.js";
import { paperHTML } from "./render.js";
import { docTitle, textFile, imageFiles, shareFiles } from "./export.js";
import { toast } from "./toast.js";

const $ = (s) => document.querySelector(s);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);

const ICONS = {
  write: '<path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  text: '<path d="M6.5 3.5h8l4 4v13h-12z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 11h6M9 14.5h6M9 18h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  trash: '<path d="M5.5 8h13l-1.2 11.2a2 2 0 0 1-2 1.8H8.7a2 2 0 0 1-2-1.8zM4 5.5h16M9.5 5.5V4h5v1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  restore: '<path d="M5 12a7 7 0 1 0 2.1-5M5 4v4h4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
};

function fmtDate(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

function pagesLabel(n) {
  return n === 1 ? "1 sida" : `${n} sidor`;
}

export function initFolder({ onContinue, onChange }) {
  const folder = $("#folder");
  const body = $("#folder-body");
  const detail = $("#detail");
  const detailPages = $("#detail-pages");
  const detailActions = $("#detail-actions");
  const detailTitle = $("#detail-title");
  let tab = "saved";
  let detailToken = 0;

  const list = () => (tab === "saved" ? store.getSaved() : store.getTrash());

  function show(el) {
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
  }
  function hide(el) {
    el.classList.remove("open");
    setTimeout(() => {
      if (!el.classList.contains("open")) el.hidden = true;
    }, 320);
  }

  function renderCounts() {
    const saved = store.getSaved().length;
    const trash = store.getTrash().length;
    $("#count-saved").textContent = saved || "";
    $("#count-trash").textContent = trash || "";
    onChange(saved);
  }

  function render() {
    renderCounts();
    folder.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const items = list();
    let html = "";
    if (tab === "trash" && items.length) {
      html += `<div class="trash-bar"><span>Papper i papperskorgen försvinner efter 30 dagar.</span><button class="tool small" id="empty-trash">Töm papperskorgen</button></div>`;
    }
    if (!items.length) {
      html += `<div class="empty">${
        tab === "saved"
          ? "<strong>Mappen är tom.</strong><span>Tryck på <em>Spara</em> så hamnar papperet här.</span>"
          : "<strong>Papperskorgen är tom.</strong>"
      }</div>`;
    } else {
      html += '<div class="grid">';
      for (const doc of items) {
        const seed = hashString(doc.id);
        const pages = pagesOf(doc.text);
        const tilt = ((seed % 7) - 3) * 0.45;
        const when = tab === "saved" ? doc.savedAt : doc.trashedAt;
        html += `<button class="card" data-id="${esc(doc.id)}">
          <div class="thumb" style="--tilt:${tilt}deg">${paperHTML(pages[0], seed)}${pages.length > 1 ? '<div class="stack"></div>' : ""}</div>
          <div class="meta"><strong>${esc(docTitle(doc))}</strong><span>${fmtDate(when)} · ${pagesLabel(pages.length)}</span></div>
        </button>`;
      }
      html += "</div>";
    }
    body.innerHTML = html;
    body.scrollTop = 0;
  }

  body.addEventListener("click", (e) => {
    if (e.target.closest("#empty-trash")) {
      if (confirm("Vill du tömma papperskorgen? Papperen försvinner för alltid.")) {
        store.emptyTrash();
        render();
      }
      return;
    }
    const card = e.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });

  folder.querySelectorAll("[role=tab]").forEach((b) =>
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      render();
    })
  );
  $("#folder-close").addEventListener("click", close);
  $("#detail-back").addEventListener("click", closeDetail);

  function actionButton(icon, label, cls = "") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tool action ${cls}`;
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg><span>${label}</span>`;
    return b;
  }

  function openDetail(id) {
    const doc = list().find((d) => d.id === id);
    if (!doc) return;
    const token = ++detailToken;
    const seed = hashString(doc.id);
    const pages = pagesOf(doc.text);
    detailTitle.textContent = docTitle(doc);
    detailPages.innerHTML = pages
      .map((p, k) => `<div class="page-wrap">${paperHTML(p, seed)}${pages.length > 1 ? `<div class="page-no">${k + 1} / ${pages.length}</div>` : ""}</div>`)
      .join("");
    detailPages.scrollTop = 0;
    detailActions.innerHTML = "";

    if (tab === "saved") {
      const write = actionButton("write", "Skriv vidare", "primary");
      write.addEventListener("click", () => onContinue(doc.id));

      const image = actionButton("image", "Spara som bild");
      image.disabled = true;
      let files = null;
      imageFiles(doc).then((f) => {
        if (token !== detailToken) return;
        files = f;
        image.disabled = false;
      });
      image.addEventListener("click", () => files && shareFiles(files));

      const text = actionButton("text", "Spara som text");
      text.addEventListener("click", () => shareFiles([textFile(doc)]));

      const trash = actionButton("trash", "Släng", "danger");
      trash.addEventListener("click", () => {
        store.takeFromSaved(doc.id);
        store.addTrash(doc);
        closeDetail();
        render();
        toast("Papperet hamnade i papperskorgen", {
          action: "Ångra",
          duration: 6000,
          onAction: () => {
            const back = store.takeFromTrash(doc.id);
            if (back) store.addSaved(back);
            render();
          },
        });
      });
      detailActions.append(write, image, text, trash);
    } else {
      const restore = actionButton("restore", "Lägg tillbaka i mappen", "primary");
      restore.addEventListener("click", () => {
        const back = store.takeFromTrash(doc.id);
        if (back) store.addSaved(back);
        closeDetail();
        render();
        toast("Tillbaka i mappen");
      });
      const remove = actionButton("trash", "Släng för alltid", "danger");
      remove.addEventListener("click", () => {
        if (!confirm("Vill du slänga papperet för alltid?")) return;
        store.takeFromTrash(doc.id);
        closeDetail();
        render();
      });
      detailActions.append(restore, remove);
    }
    show(detail);
  }

  function closeDetail() {
    detailToken++;
    hide(detail);
  }

  function open(which = "saved") {
    tab = which;
    render();
    show(folder);
  }

  function close() {
    closeDetail();
    hide(folder);
  }

  return {
    open,
    close,
    isOpen: () => !folder.hidden,
    back() {
      if (!detail.hidden) closeDetail();
      else close();
    },
    refresh: renderCounts,
  };
}
