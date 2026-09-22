import { useStore } from "../store/store";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function click(when = 0, gain = 0.05) {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.03);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + when);
}

const SOUNDS = {
  perfect: () => {
    tone(660, 0.1, "triangle", 0.06);
    tone(990, 0.16, "triangle", 0.05, 0.08);
  },
  good: () => tone(740, 0.14, "triangle", 0.05),
  bad: () => {
    tone(196, 0.18, "sine", 0.07);
    tone(165, 0.22, "sine", 0.05, 0.1);
  },
  chip: () => {
    click(0, 0.08);
    click(0.05, 0.05);
  },
  deal: () => click(0, 0.035),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.05, i * 0.09)),
};

export type SoundName = keyof typeof SOUNDS;

export function play(name: SoundName): void {
  if (!useStore.getState().settings.sound) return;
  SOUNDS[name]();
}
