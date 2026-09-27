// All sounds are synthesized with Web Audio -- no audio files to download
// or cache. iOS only starts audio from a real gesture (touchend/click/keydown,
// not pointerdown), so unlock() is called from those.

let ctx = null;
let out = null;
let noise = null;
let enabled = true;

export function setEnabled(value) {
  enabled = value;
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      const soften = ctx.createBiquadFilter();
      soften.type = "lowpass";
      soften.frequency.value = 4200; // takes the sharp edge off every click
      soften.Q.value = 0.5;
      out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(soften);
      soften.connect(comp);
      comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    // Play like a media app, so the iPad's silent mode doesn't mute the typewriter.
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    if (ctx.state !== "running") {
      ctx.resume();
      // Starting a (silent) sound inside the gesture is what actually wakes iOS audio.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    // no sound is fine
  }
}

const ready = () => enabled && ctx && ctx.state === "running";
const vary = (v, amount) => v * (1 + (Math.random() * 2 - 1) * amount);

function burst(t, { dur, freq, freqEnd, q = 1, gain, type = "bandpass", attack = 0.001 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function tone(t, { freq, freqEnd, dur, gain, type = "sine", attack = 0.002 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function ratchet(t, count, span, gain = 0.16) {
  for (let i = 0; i < count; i++) {
    burst(t + (i / count) * span, { dur: 0.014, freq: vary(4200, 0.12), q: 3, gain: vary(gain, 0.2) });
  }
}

export function key() {
  if (!ready()) return;
  const t = ctx.currentTime;
  burst(t, { dur: 0.03, freq: vary(2600, 0.15), q: 0.9, gain: 0.35, attack: 0.003 });
  burst(t + 0.004, { dur: 0.05, freq: vary(1100, 0.1), q: 1.2, gain: 0.15 });
  tone(t, { freq: vary(180, 0.1), freqEnd: 110, dur: 0.04, gain: 0.08, type: "sine" });
  burst(t + 0.05, { dur: 0.015, freq: 3800, q: 2, gain: 0.05 });
}

export function space() {
  if (!ready()) return;
  const t = ctx.currentTime;
  burst(t, { dur: 0.045, freq: vary(1300, 0.1), q: 0.8, gain: 0.2, attack: 0.004 });
  tone(t, { freq: 130, freqEnd: 90, dur: 0.05, gain: 0.07, type: "sine" });
}

export function back() {
  if (!ready()) return;
  const t = ctx.currentTime;
  burst(t, { dur: 0.03, freq: vary(2000, 0.1), q: 1, gain: 0.2, attack: 0.003 });
  tone(t, { freq: 200, freqEnd: 140, dur: 0.04, gain: 0.06, type: "sine" });
}

export function thunk() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { freq: 140, freqEnd: 100, dur: 0.06, gain: 0.08, type: "sine" });
}

export function bell() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.03;
  burst(t, { dur: 0.012, freq: 6000, q: 2, gain: 0.2 });
  tone(t, { freq: 1760, dur: 1.4, gain: 0.22, attack: 0.004 });
  tone(t, { freq: 1760 * 2.76, dur: 0.6, gain: 0.06 });
}

// distance: 0..1 of a full line, longer returns zip for longer.
export function carriageReturn(distance = 1) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const span = 0.12 + 0.3 * distance;
  ratchet(t, 2, 0.05, 0.12); // line feed
  ratchet(t + 0.05, Math.round(3 + 12 * distance), span, 0.12);
  burst(t + 0.04, { dur: span + 0.05, freq: 900, q: 0.6, gain: 0.1, type: "lowpass", attack: 0.03 });
  tone(t + 0.05 + span, { freq: 150, freqEnd: 100, dur: 0.08, gain: 0.1, type: "sine" });
  burst(t + 0.05 + span, { dur: 0.05, freq: 1500, q: 1, gain: 0.15, attack: 0.004 });
}

export function feed(duration = 0.55) {
  if (!ready()) return;
  const t = ctx.currentTime;
  ratchet(t, 10, duration, 0.12);
  burst(t, { dur: duration, freq: 3500, q: 0.5, gain: 0.05, attack: 0.1 });
}

export function swoosh() {
  if (!ready()) return;
  const t = ctx.currentTime;
  burst(t, { dur: 0.5, freq: 700, freqEnd: 4200, q: 0.8, gain: 0.3, attack: 0.12 });
}

export function crumple() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 38; i++) {
    const at = t + Math.pow(Math.random(), 1.4) * 0.65;
    burst(at, {
      dur: 0.01 + Math.random() * 0.04,
      freq: 700 + Math.random() * 6500,
      q: 1 + Math.random() * 3,
      gain: 0.08 + Math.random() * 0.25,
    });
  }
  burst(t, { dur: 0.65, freq: 1600, q: 0.5, gain: 0.12, type: "lowpass", attack: 0.05 });
}

export function toss() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { freq: 160, freqEnd: 110, dur: 0.07, gain: 0.08, type: "sine" });
  burst(t, { dur: 0.07, freq: 700, q: 0.8, gain: 0.12, attack: 0.004 });
}

export function pop() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { freq: 520, freqEnd: 880, dur: 0.08, gain: 0.15 });
}

// A finished practice word: the stamp lands, then a small two-note chime.
export function stamp() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { freq: 170, freqEnd: 110, dur: 0.08, gain: 0.14, type: "sine" });
  burst(t, { dur: 0.05, freq: 900, q: 0.8, gain: 0.14, attack: 0.003 });
  tone(t + 0.12, { freq: 1047, dur: 0.35, gain: 0.12, attack: 0.005 });
  tone(t + 0.22, { freq: 1319, dur: 0.55, gain: 0.12, attack: 0.005 });
}

// A whole exercise done: a little rising arpeggio.
export function cheer() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.35;
  [1047, 1319, 1568, 2093].forEach((f, k) => tone(t + k * 0.1, { freq: f, dur: 0.5, gain: 0.1, attack: 0.005 }));
}

// A rubber stamp (or the date stamp) pressed onto the paper.
export function rubber() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { freq: 140, freqEnd: 90, dur: 0.09, gain: 0.16, type: "sine" });
  burst(t, { dur: 0.06, freq: 700, q: 0.7, gain: 0.16, attack: 0.004 });
  burst(t + 0.02, { dur: 0.05, freq: 2500, q: 1, gain: 0.05 });
}
