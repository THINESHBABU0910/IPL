/** SR caps by pitch phase — prevents 230 SR on turning tracks */
export function pitchSrLimits(
  pitchType: string,
  phase: "powerplay" | "middle" | "death",
  roleKind: "anchor" | "aggressor" | "finisher" | "tail" | "notout",
): { min: number; max: number } {
  const turning = pitchType === "Turning" || pitchType === "Slow";
  const green = pitchType === "Green";

  if (turning) {
    if (roleKind === "aggressor")
      return phase === "powerplay" ? { min: 105, max: 155 } : { min: 95, max: 135 };
    if (roleKind === "anchor") return { min: 85, max: 125 };
    if (roleKind === "finisher" || roleKind === "notout")
      return phase === "death" ? { min: 115, max: 185 } : { min: 100, max: 150 };
    return { min: 45, max: 110 };
  }
  if (green) {
    if (roleKind === "aggressor") return { min: 100, max: 175 };
    if (roleKind === "anchor") return { min: 90, max: 120 };
    if (roleKind === "finisher" || roleKind === "notout") return { min: 110, max: 200 };
    return { min: 40, max: 120 };
  }
  if (roleKind === "aggressor")
    return phase === "powerplay" ? { min: 130, max: 220 } : { min: 120, max: 190 };
  if (roleKind === "anchor") return { min: 105, max: 135 };
  if (roleKind === "finisher" || roleKind === "notout") return { min: 140, max: 260 };
  return { min: 50, max: 140 };
}

export function pitchMaxTotal(pitchType: string): number {
  switch (pitchType) {
    case "Flat":
      return 240;
    case "Green":
      return 185;
    case "Slow":
    case "Turning":
      return 195;
    default:
      return 210;
  }
}

/** Weighted IPL score bands by pitch type (percentages from realism spec) */
export function weightedInningsTotal(
  pitchType: string,
  matchOvers: number,
  homeBoost: number,
  rng: () => number,
): { total: number; firestorm: boolean } {
  const scale = matchOvers / 20;
  type Band = { min: number; max: number; weight: number };

  let bands: Band[];
  switch (pitchType) {
    case "Flat":
      bands = [
        { min: 120, max: 140, weight: 5 },
        { min: 141, max: 170, weight: 25 },
        { min: 171, max: 200, weight: 45 },
        { min: 201, max: 220, weight: 20 },
        { min: 221, max: 240, weight: 5 },
      ];
      break;
    case "Green":
      bands = [
        { min: 100, max: 130, weight: 25 },
        { min: 131, max: 155, weight: 45 },
        { min: 156, max: 170, weight: 25 },
        { min: 171, max: 185, weight: 5 },
      ];
      break;
    case "Slow":
    case "Turning":
      bands = [
        { min: 100, max: 130, weight: 20 },
        { min: 131, max: 160, weight: 50 },
        { min: 161, max: 180, weight: 25 },
        { min: 181, max: 195, weight: 5 },
      ];
      break;
    default:
      bands = [
        { min: 120, max: 140, weight: 15 },
        { min: 141, max: 170, weight: 50 },
        { min: 171, max: 190, weight: 30 },
        { min: 191, max: 210, weight: 5 },
      ];
  }

  const totalWeight = bands.reduce((s, b) => s + b.weight, 0);
  let roll = rng() * totalWeight;
  for (const band of bands) {
    roll -= band.weight;
    if (roll <= 0) {
      const raw = band.min + Math.floor(rng() * (band.max - band.min + 1));
      const total = Math.round((raw + homeBoost) * scale);
      const firestorm = pitchType === "Flat" && raw >= 201;
      return { total, firestorm };
    }
  }
  const fallback = Math.round((bands[1].min + homeBoost) * scale);
  return { total: fallback, firestorm: false };
}

/** Phase run-rate targets (runs per over bands) */
export function phaseRunBudget(
  batRuns: number,
  pitchType: string,
  rng: () => number,
): { powerplay: number; middle: number; death: number } {
  const ppShare =
    pitchType === "Flat" ? 0.32 + rng() * 0.08 : pitchType === "Green" ? 0.28 + rng() * 0.06 : 0.26 + rng() * 0.06;
  const deathShare =
    pitchType === "Flat" ? 0.28 + rng() * 0.07 : pitchType === "Slow" || pitchType === "Turning" ? 0.22 + rng() * 0.05 : 0.25 + rng() * 0.06;
  const middleShare = Math.max(0.35, 1 - ppShare - deathShare);

  return {
    powerplay: Math.round(batRuns * ppShare),
    middle: Math.round(batRuns * middleShare),
    death: Math.max(0, batRuns - Math.round(batRuns * ppShare) - Math.round(batRuns * middleShare)),
  };
}

function clampStrikeRate(
  runs: number,
  balls: number,
  minSr: number,
  maxSr: number,
): { runs: number; balls: number } {
  if (balls < 1) balls = 1;
  const sr = (runs / balls) * 100;
  if (sr > maxSr) {
    balls = Math.max(1, Math.round((runs / maxSr) * 100));
  } else if (runs > 0 && sr < minSr) {
    balls = Math.max(1, Math.min(balls, Math.round((runs / minSr) * 100)));
  }
  return { runs, balls: Math.max(1, balls) };
}

/** Role-based batting with SR bands from realism spec */
export function roleBasedInnings(
  idx: number,
  role: string,
  isNotOut: boolean,
  phaseHint: "powerplay" | "middle" | "death",
  pitchType: string,
  rng: () => number,
): { runs: number; balls: number } {
  const roleKind: "anchor" | "aggressor" | "finisher" | "tail" | "notout" = isNotOut
    ? idx >= 5 || /finisher/i.test(role)
      ? "notout"
      : "finisher"
    : /anchor|wicketkeeper/i.test(role) || idx === 2
      ? "anchor"
      : idx <= 1 || /aggressor|batter/i.test(role)
        ? "aggressor"
        : /finisher|allrounder/i.test(role)
          ? "finisher"
          : "tail";

  const limits = pitchSrLimits(pitchType, phaseHint, roleKind);

  if (isNotOut) {
    if (idx >= 5 || /finisher/i.test(role)) {
      const balls = 6 + Math.floor(rng() * 15);
      const sr = limits.min + rng() * (limits.max - limits.min);
      const runs = Math.min(45, Math.max(8, Math.round((balls * sr) / 100)));
      return clampStrikeRate(runs, balls, limits.min, limits.max);
    }
    const runs = 8 + Math.floor(rng() * 35);
    const balls = Math.max(4, Math.round(runs * (0.75 + rng() * 0.35)));
    return clampStrikeRate(runs, balls, limits.min, limits.max);
  }

  if (roleKind === "anchor") {
    const runs = 12 + Math.floor(rng() * 56);
    const balls = Math.round(runs * (0.74 + rng() * 0.22));
    return clampStrikeRate(runs, balls, limits.min, limits.max);
  }

  if (roleKind === "aggressor") {
    const runs = 6 + Math.floor(rng() * 52);
    const balls = Math.max(4, Math.round(runs / (1.4 + rng() * 0.8)));
    return clampStrikeRate(runs, balls, limits.min, limits.max);
  }

  if (roleKind === "finisher") {
    const balls = 6 + Math.floor(rng() * 14);
    const runs = Math.min(40, Math.round(balls * (1.55 + rng() * 1.05)));
    return clampStrikeRate(runs, balls, limits.min, limits.max);
  }

  const runs = Math.floor(rng() * 26);
  const balls =
    runs > 0 ? Math.max(1, Math.round(runs / (0.5 + rng() * 0.9))) : 1 + Math.floor(rng() * 4);
  return clampStrikeRate(runs, balls, limits.min, limits.max);
}

export function phaseHintForIndex(idx: number): "powerplay" | "middle" | "death" {
  if (idx <= 1) return "powerplay";
  if (idx <= 4) return "middle";
  return "death";
}

/** Extras with death-over wides pressure and rare no-balls */
export function generateExtras(
  rng: () => number,
  isChase: boolean,
  highPressure: boolean,
): { wides: number; noBalls: number; byes: number; legByes: number; total: number } {
  const deathBoost = isChase && highPressure ? 2 + Math.floor(rng() * 3) : 0;
  const wides = 2 + Math.floor(rng() * 4) + deathBoost;
  const noBalls = Math.min(2, Math.floor(rng() * 3));
  const byes = Math.floor(rng() * 3);
  let legByes = Math.floor(rng() * 4);
  let total = wides + noBalls + byes + legByes;
  if (total < 5) {
    legByes += 5 - total;
    total = wides + noBalls + byes + legByes;
  }
  if (total > 12) {
    const trim = total - 12;
    const newWides = Math.max(2, wides - trim);
    total = newWides + noBalls + byes + legByes;
    return { wides: newWides, noBalls, byes, legByes, total };
  }
  return { wides, noBalls, byes, legByes, total };
}

/** Wicket split weighted by overs bowled (specialists with 4 overs get more) */
export function distributeWicketsByQuota(
  totalWickets: number,
  oversPerBowler: number[],
): number[] {
  if (totalWickets <= 0 || oversPerBowler.length === 0) {
    return new Array(oversPerBowler.length).fill(0);
  }
  const weights = oversPerBowler.map((o) => Math.max(1, o));
  const sum = weights.reduce((a, b) => a + b, 0);
  const wkts = weights.map((w) => Math.floor((w / sum) * totalWickets));
  let assigned = wkts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (assigned < totalWickets) {
    wkts[i % wkts.length]++;
    assigned++;
    i++;
  }
  return wkts;
}

/** Collapse / pressure modifier on wicket count */
export function pressureWicketAdjust(
  baseWickets: number,
  isChase: boolean,
  chaseWon: boolean,
  requiredRr: number,
  rng: () => number,
): number {
  let w = baseWickets;
  if (isChase && !chaseWon && requiredRr > 11) {
    w += 1 + Math.floor(rng() * 2);
  }
  if (isChase && chaseWon && rng() > 0.65) {
    w = Math.max(3, w - 1);
  }
  return Math.min(10, Math.max(0, w));
}

export function pickDismissalType(bowler: string, rng: () => number, isSpinner: boolean): string {
  const b = bowler.trim();
  if (isSpinner) {
    const spinTypes = [`lbw b ${b}`, `b ${b}`, `c fielder b ${b}`, `st ${b}`];
    return spinTypes[Math.floor(rng() * spinTypes.length)];
  }
  const types = [`c sub b ${b}`, `lbw b ${b}`, `b ${b}`, `c fielder b ${b}`, `run out`];
  return types[Math.floor(rng() * types.length)];
}

export function isSpinnerName(name: string, role?: string): boolean {
  return /spin|leg|off|left.?arm|mystery|kuldeep|chahal|ashwin|axar|jadeja|theekshana|varun|bishnoi|moeen|rashid/i.test(
    `${name} ${role ?? ""}`,
  );
}
