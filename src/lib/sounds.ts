let enabled = true;

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  try { localStorage.setItem("iplSound", v ? "1" : "0"); } catch { /* ignore */ }
}

export function isSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem("iplSound");
    if (v !== null) enabled = v === "1";
  } catch { /* ignore */ }
  return enabled;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch { /* no audio */ }
}

export function playBidSound(): void {
  playTone(440, 0.12, "square", 0.05);
}

export function playSoldSound(): void {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.2), 120);
  setTimeout(() => playTone(784, 0.25), 240);
}

export function playUnsoldSound(): void {
  playTone(220, 0.3, "sawtooth", 0.06);
}

export function playTimerWarning(secondsLeft?: number): void {
  const sec = secondsLeft ?? 5;
  const freq = sec <= 2 ? 1100 : sec <= 3 ? 950 : 820;
  const vol = sec <= 2 ? 0.09 : 0.07;
  playTone(freq, 0.1, "square", vol);
}

export function playTimerFinalBeep(): void {
  playTone(1200, 0.15, "square", 0.1);
}

export function playRTMSound(): void {
  playTone(330, 0.2);
  setTimeout(() => playTone(440, 0.2), 150);
}
