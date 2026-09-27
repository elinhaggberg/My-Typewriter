// Deterministic "uneven ink": every character gets a tiny rotation, offset
// and darkness that depend only on the paper id and the character's index,
// so the screen, the folder and the exported image all look identical.

export function hashString(s) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed, i, salt) {
  let t = (seed ^ Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function ink(seed, i) {
  const r = (rand(seed, i, 1) - 0.5) * 3.4;   // degrees
  const x = (rand(seed, i, 2) - 0.5) * 0.06;  // em
  const y = (rand(seed, i, 3) - 0.5) * 0.09;  // em
  let a = 0.8 + rand(seed, i, 4) * 0.2;
  if (rand(seed, i, 5) < 0.07) a -= 0.22;     // the odd faint strike
  return { r: +r.toFixed(2), x: +x.toFixed(3), y: +y.toFixed(3), a: +a.toFixed(2) };
}
