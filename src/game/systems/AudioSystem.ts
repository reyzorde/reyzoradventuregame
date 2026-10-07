let ctx: AudioContext | null = null;
let unlocked = false;
let walkCd = 0;
let sfxVol = 0.7;
let musicVol = 0.35;
let musicNodes: { o: OscillatorNode; g: GainNode }[] | null = null;
let musicTimer: number | null = null;

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
  // Soft ambient starts after first user gesture (Chrome autoplay policy)
  startMusic();
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
}

export function setMusicVolume(v: number): void {
  musicVol = Math.max(0, Math.min(1, v));
  if (musicNodes) {
    for (const n of musicNodes) {
      n.g.gain.setTargetAtTime(0.012 * musicVol, ac()!.currentTime, 0.05);
    }
  }
}

export function getVolumes(): { music: number; sfx: number } {
  return { music: musicVol, sfx: sfxVol };
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.05, slide = 0): void {
  const a = ac();
  if (!a || !unlocked || sfxVol <= 0.01) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, a.currentTime + dur);
  const vol = gain * sfxVol;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}

/** Soft pastoral ambient — low volume, slow pentatonic drift (no external files) */
export function startMusic(): void {
  const a = ac();
  if (!a || !unlocked || musicNodes) return;
  // G major pentatonic-ish: calm, not busy
  const pad = [196.0, 220.0, 246.94, 293.66]; // G3 A3 B3 D4
  const melody = [196, 220, 246.94, 293.66, 329.63, 293.66, 246.94, 220];
  musicNodes = pad.map((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = i % 2 === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    // Very soft bed — should not tire the player
    g.gain.value = 0.006 * musicVol * (i === 0 ? 1.1 : 0.55);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    return { o, g };
  });
  let i = 0;
  musicTimer = window.setInterval(() => {
    if (!musicNodes || !a) return;
    const f = melody[i % melody.length];
    // Gentle glide on the lead voice only
    musicNodes[0].o.frequency.setTargetAtTime(f, a.currentTime, 0.8);
    // Soft swell
    const t = a.currentTime;
    musicNodes[0].g.gain.setTargetAtTime(0.008 * musicVol, t, 0.3);
    musicNodes[0].g.gain.setTargetAtTime(0.005 * musicVol, t + 1.2, 0.5);
    i++;
  }, 3200);
}

export function stopMusic(): void {
  if (musicTimer != null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicNodes) {
    for (const n of musicNodes) {
      try { n.o.stop(); } catch { /* */ }
    }
    musicNodes = null;
  }
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
    case "pickup": tone(640, 0.07, "triangle", 0.04, 100); break;
    case "milk": tone(280, 0.1, "sine", 0.04, 60); break;
    case "egg": tone(420, 0.08, "triangle", 0.035); break;
    case "fish": tone(360, 0.1, "sine", 0.04, -40); tone(280, 0.12, "sine", 0.03); break;
    case "boundary": tone(160, 0.12, "sawtooth", 0.025, -40); break;
    case "open": tone(400, 0.06, "triangle", 0.035, 80); break;
    case "walk":
      if (now - walkCd < 300) return;
      walkCd = now;
      tone(90, 0.04, "sine", 0.018);
      break;
  }
}
