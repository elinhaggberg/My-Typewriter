// "Öva": ghost letters on the paper to type over, one word per line.
// Three levels: letter drills row by row, short words, longer words.
// Every EXERCISES_PER_LEVEL finished exercises moves up a level.

export const EXERCISES_PER_LEVEL = 3;
export const MAX_LEVEL = 3;
const UNITS = 8; // words per exercise

// Level 1 walks the keyboard a few keys at a time.
const LETTER_GROUPS = ["ASDF", "JKLÖ", "GH", "QWER", "TYU", "IOPÅ", "ZXCV", "BNM", "ÄÖÅ"];

const SHORT_WORDS = [
  "SOL", "KATT", "HUND", "LAVA", "MUS", "BIL", "HUS", "BOK", "KO", "ÄGG", "ÖGA", "FISK",
  "GLASS", "ORM", "BÅT", "TÅG", "RÄV", "BJÖRN", "STEN", "ASKA", "IS", "MÅNE", "HAV", "BERG",
];

const LONG_WORDS = [
  "VULKAN", "MAGMA", "KRATER", "ISLAND", "JORDSKALV", "LAVAFÄLT", "FORSKARE", "SKRIVMASKIN",
  "PANNKAKA", "REGNBÅGE", "ELEFANT", "DINOSAURIE", "FJÄRIL", "SNÖGUBBE", "BIBLIOTEK", "ÄVENTYR",
];

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// progress: { level, done } -- done = exercises finished on this level.
export function makeExercise({ level, done }) {
  if (level <= 1) {
    // Every letter of the two groups once, in random order, before any repeats.
    const letters = [...new Set(LETTER_GROUPS[done % LETTER_GROUPS.length] + LETTER_GROUPS[(done + 1) % LETTER_GROUPS.length])];
    let order = [];
    while (order.length < UNITS) {
      let round = shuffled(letters);
      if (round[0] === order[order.length - 1]) round.push(round.shift()); // no letter twice in a row
      order = order.concat(round);
    }
    return order.slice(0, UNITS).map((ch) => ch.repeat(3)).join("\n");
  }
  const words = level === 2 ? SHORT_WORDS : LONG_WORDS;
  return shuffled(words).slice(0, level === 2 ? UNITS : 6).join("\n");
}

// Returns the new progress and whether that finished a level.
export function finishExercise({ level, done }) {
  done += 1;
  if (done >= EXERCISES_PER_LEVEL && level < MAX_LEVEL) return { progress: { level: level + 1, done: 0 }, levelUp: true };
  return { progress: { level, done }, levelUp: false };
}
