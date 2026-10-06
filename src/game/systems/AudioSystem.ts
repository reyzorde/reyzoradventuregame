
let ctx: AudioContext | null = null;
let unlocked = false;
let walkCd = 0;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

export function unlockAudio(): void {
  const a = ac();
  if (!a) return;
  if (a.state === "suspended") void a.resume();
  unlocked = true;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.05, slide = 0): void {
  const a = ac();
  if (!a || !unlocked) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}

export function sfx(id: string, now = 0): void {
  unlockAudio();
  switch (id) {
    case "ui": tone(520, 0.06, "triangle", 0.04); break;
    case "plant": tone(220, 0.12, "sine", 0.05, 40); break;
    case "till": tone(140, 0.1, "square", 0.03); break;
    case "water": tone(480, 0.08, "sine", 0.04, -80); tone(620, 0.12, "sine", 0.03, -120); break;
    case "harvest": tone(360, 0.08, "triangle", 0.05, 80); tone(540, 0.14, "triangle", 0.04, 120); break;
    case "coin": tone(880, 0.07, "square", 0.035, 200); tone(1320, 0.12, "square", 0.025); break;
    case "quest": tone(392, 0.12, "triangle", 0.05); tone(523, 0.16, "triangle", 0.05); tone(659, 0.22, "triangle", 0.045); break;
    case "talk": tone(300, 0.05, "sine", 0.03); break;
    case "walk":
      if (now - walkCd < 280) return;
      walkCd = now;
      tone(90, 0.04, "sine", 0.02);
      break;
  }
}
