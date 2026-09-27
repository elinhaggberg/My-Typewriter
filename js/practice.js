// "Öva": ghost letters on the paper to type over, one word per line.
//
// Level 1 follows the classic touch-typing order: start on the home row at
// F and J (the keys with bumps), add a pair of keys at a time working
// outwards, then the top row and the bottom row. Every exercise drills the
// new keys first, then mixes them with the ones already learned.
// Level 2 is short words, level 3 long words.

export const MAX_LEVEL = 3;
export const LEVELS = { 1: "Bokstäver", 2: "Ord", 3: "Långa ord" };
const EXERCISES_PER_LEVEL = 3; // for levels 2 and 3
const UNITS = 8; // lines per exercise

export const LESSONS = [
  "FJ", "DK", "SL", "AÖ", "GH", "Ä", // home row
  "EI", "RU", "TY", "WO", "QP", "Å", // top row
  "VM", "BN", "C", "XZ", // bottom row (the keys with punctuation are left out)
];

const SHORT_WORDS = [
  "SOL", "KATT", "HUND", "LAVA", "MUS", "BIL", "HUS", "BOK", "KO", "ÄGG", "ÖGA", "FISK",
  "GLASS", "ORM", "BÅT", "TÅG", "RÄV", "BJÖRN", "STEN", "ASKA", "IS", "MÅNE", "HAV", "BERG",
];

const LONG_WORDS = [
  "VULKAN", "MAGMA", "KRATER", "ISLAND", "JORDSKALV", "LAVAFÄLT", "FORSKARE", "SKRIVMASKIN",
  "PANNKAKA", "REGNBÅGE", "ELEFANT", "DINOSAURIE", "FJÄRIL", "SNÖGUBBE", "BIBLIOTEK", "ÄVENTYR",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function lessonOf(progress) {
  return Math.min(progress.lesson ?? 0, LESSONS.length - 1);
}

// The new keys for the current level-1 exercise, e.g. "D K".
export function newLetters(progress) {
  return [...LESSONS[lessonOf(progress)]].join(" ");
}

function letterExercise(lesson) {
  const fresh = [...LESSONS[lesson]];
  const known = LESSONS.slice(0, lesson).join("").split("");
  const units = [];
  // 1. The new keys on their own: FFF, JJJ
  for (const k of fresh) units.push(k.repeat(3));
  // 2. The new keys together: FJF, JFJ
  if (fresh.length === 2) {
    const [a, b] = fresh;
    units.push(a + b + a, b + a + b);
  }
  // 3. Mixed with keys learned before: FDF, KJK ... (or more new-key drills on the first lesson)
  while (units.length < UNITS) {
    const k = pick(fresh);
    const other = known.length ? pick(known) : pick(fresh.filter((f) => f !== k).concat(k));
    const unit = pick([k + other + k, other + k + other, k + k + other, other + other + k]);
    if (unit !== units[units.length - 1]) units.push(unit);
  }
  return units.slice(0, UNITS).join("\n");
}

// progress: { level, done, lesson } -- done = exercises finished on level 2/3,
// lesson = where level 1 has got to.
export function makeExercise(progress) {
  if (progress.level <= 1) return letterExercise(lessonOf(progress));
  const words = progress.level === 2 ? SHORT_WORDS : LONG_WORDS;
  return shuffled(words).slice(0, progress.level === 2 ? UNITS : 6).join("\n");
}

// Returns the new progress, and whether that finished a level.
export function finishExercise(progress) {
  if (progress.level <= 1) {
    const lesson = (progress.lesson ?? 0) + 1;
    if (lesson >= LESSONS.length) return { progress: { ...progress, level: 2, done: 0, lesson: 0 }, levelUp: true };
    return { progress: { ...progress, lesson }, levelUp: false };
  }
  const done = (progress.done ?? 0) + 1;
  if (done >= EXERCISES_PER_LEVEL && progress.level < MAX_LEVEL) {
    return { progress: { ...progress, level: progress.level + 1, done: 0 }, levelUp: true };
  }
  return { progress: { ...progress, done }, levelUp: false };
}
