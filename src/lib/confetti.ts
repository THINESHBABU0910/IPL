import confetti from "canvas-confetti";

export function fireSoldConfetti(): void {
  const count = 120;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#FFD700", "#22C55E"] });
  fire(0.2, { spread: 60, colors: ["#EC4899", "#8B5CF6"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#3B82F6", "#F97316"] });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
