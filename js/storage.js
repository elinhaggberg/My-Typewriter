// Everything lives in localStorage under the mt_ prefix. Only text is
// stored; images are drawn on demand when exporting.
const CURRENT_KEY = "mt_current_v1";
const SAVED_KEY = "mt_saved_v1";
const TRASH_KEY = "mt_trash_v1";
const PREFS_KEY = "mt_prefs_v1";

const TRASH_DAYS = 30;

let onError = () => {};
export function onStorageError(fn) {
  onError = fn;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    onError(err);
    return false;
  }
}

const now = () => new Date().toISOString();

export function newDoc() {
  const t = now();
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    text: "",
    createdAt: t,
    updatedAt: t,
  };
}

export function loadCurrent() {
  const doc = readJSON(CURRENT_KEY, null);
  return doc && typeof doc.text === "string" && doc.id ? doc : null;
}

export function saveCurrent(doc) {
  return writeJSON(CURRENT_KEY, doc);
}

// ---------- folder ----------
export function getSaved() {
  return readJSON(SAVED_KEY, []);
}

export function addSaved(doc) {
  const list = getSaved().filter((d) => d.id !== doc.id);
  list.unshift({ ...doc, savedAt: now() });
  return writeJSON(SAVED_KEY, list);
}

export function takeFromSaved(id) {
  const list = getSaved();
  const item = list.find((d) => d.id === id);
  if (!item) return null;
  writeJSON(SAVED_KEY, list.filter((d) => d.id !== id));
  return item;
}

// ---------- trash ----------
export function getTrash() {
  const cutoff = Date.now() - TRASH_DAYS * 864e5;
  const list = readJSON(TRASH_KEY, []);
  const kept = list.filter((d) => Date.parse(d.trashedAt) > cutoff);
  if (kept.length !== list.length) writeJSON(TRASH_KEY, kept);
  return kept;
}

export function addTrash(doc) {
  const list = getTrash().filter((d) => d.id !== doc.id);
  list.unshift({ ...doc, trashedAt: now() });
  return writeJSON(TRASH_KEY, list);
}

export function takeFromTrash(id) {
  const list = getTrash();
  const item = list.find((d) => d.id === id);
  if (!item) return null;
  writeJSON(TRASH_KEY, list.filter((d) => d.id !== id));
  const { trashedAt, ...doc } = item;
  return doc;
}

export function emptyTrash() {
  writeJSON(TRASH_KEY, []);
}

// ---------- preferences ----------
const DEFAULT_PREFS = { sound: true, keyboard: true, caps: true, installHintDismissed: false, practice: { level: 1, done: 0, lesson: 0 } };

export function getPrefs() {
  return { ...DEFAULT_PREFS, ...readJSON(PREFS_KEY, {}) };
}

export function setPrefs(patch) {
  writeJSON(PREFS_KEY, { ...getPrefs(), ...patch });
}
