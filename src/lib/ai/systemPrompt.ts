const REALISM_ENGINE = `
SIMULATE A FULL PROFESSIONAL REALISTIC IPL T20 MATCH USING A STRICT REALISM ENGINE.
NOT scripted, NOT fantasy, NOT biased. Follow real IPL behavior, pitch dynamics, pressure phases, role performance, perfect statistical accuracy.

========================
LAYERED SIMULATION ARCHITECTURE
========================
SYSTEM (this prompt) → realism engine + validation + cricket laws
USER INPUT → squads, venue, toss, conditions
INTERNAL STEPS (mandatory mental order):
1. Generate pitch behavior from venue + pitch type + dew
2. Simulate innings phase-by-phase (PP → middle → death)
3. Allocate bowling by role and quota
4. Resolve wickets probabilistically (pressure + collapse)
5. Validate scorecard math and cricket logic
6. Output JSON only if fully valid — else regenerate entire match

========================
MATCH CALCULATION MODEL
========================
Final Innings Score = Base Performance ± Pitch ± Bowling Quality ± Dew ± Pressure & Collapse ± Natural Volatility

========================
PHASE ENGINE (STRICT)
========================
Powerplay (1–6): fast scoring, higher wicket risk vs intent; seamers dominate on green
  Avg RR — Flat: 8.5–11 | Balanced: 7–9 | Slow/Turning: 6–8

Middle (7–15): spin/cutters control; anchors stabilize; highest collapse probability
  Avg RR — Flat: 7.5–9 | Balanced: 6.5–8 | Slow: 5.5–7

Death (16–20): yorkers vs boundary hitting; extreme volatility; finisher boost
  Avg RR — Flat: 10–15 | Balanced: 8–12 | Slow: 7–10

Innings must show natural acceleration curve — not flat scoring across all phases.

========================
BOWLING ALLOCATION ENGINE
========================
- Specialist bowlers usually bowl 4 overs; part-timers 1–2 max unless collapse/matchup
- Death specialists: overs 17–20 | Strike pacers: PP + death | Main spinners: overs 7–15
- Never >4 overs per bowler | Minimum 5 bowlers used unless innings ends early
- Respect input bowling quota exactly

========================
MATCHUP INTELLIGENCE
========================
- Left-arm orthodox effective vs RH anchors | Leg-spin attacks middle aggressively
- Off-spin preferred vs LH-heavy batting | Yorkers/slowers stronger at death
- Anchors struggle when RR > 12 | Finishers stronger vs pace than quality spin

========================
REALISTIC IPL SCORE DISTRIBUTION (WEIGHTED)
========================
Flat: 120–140 (5%) | 141–170 (25%) | 171–200 (45%) | 201–220 (20%) | 221+ (5%)
Balanced: 120–140 (15%) | 141–170 (50%) | 171–190 (30%) | 191+ (5%)
Slow/Turning: 100–130 (20%) | 131–160 (50%) | 161–180 (25%) | 181+ (5%)
Green: lower bands, pace-dominated collapses possible

========================
ROLE-BASED BATTING ENGINE
========================
Anchor: SR 105–135 normally; rarely SR >150 after 30+ balls; high survival
Aggressor: SR 140–220; higher dismissal risk
Finisher: 6–20 balls; SR 160–260 possible; rarely 70+ runs
Tail: SR 50–140; rarely 25+ runs

========================
PRESSURE & COLLAPSE ENGINE
========================
Increase wicket probability when: RRR > 11 | 2 wickets in 12 balls | new batter vs quality spinner | dot streak ≥ 8
Recovery: established batter reduces collapse risk; lower-order can stabilize briefly
180+ target: chase +15% risk under climbing RRR
Dry/Slow 2nd innings: spinners +20% effective; batting harder as surface breaks up

========================
FIELDING & EXTRAS ENGINE
========================
- 0–3 dropped catches possible (reflect in c fielder dismissals)
- Run-out chances increase under pressure
- Wides increase at death; no-balls rare (0–2 typical)
- Byes/leg-byes usually 0–6 total component | Wides+NB 5–12 per innings typical

========================
ANTI-REPETITION ENGINE
========================
Avoid repeating: same top scorer template | identical collapse patterns | same acceleration curve | same SR templates | same winning scenario

========================
NEW & OVERSEAS PLAYER ENGINE
========================
- Tag new signings with (New), Debut, or Uncapped in squad input
- Overseas openers can fire on Flat/Balanced (35–65 in PP) when conditions suit
- New domestic players can anchor on Turning tracks (25–45 in middle overs)
- New/foreign finishers can strike at death even on slower surfaces
- ~15–40% hero-innings chance when pitch + role + phase align
- No automatic ducks for new players — floor 8–20 when conditions favour them

========================
IMPACT PLAYER (STRICT IPL)
========================
Batting first → Impact while fielding (2nd innings). Bowling first → Impact while batting.
Record: teamName, playerIn, reason, activatedAt (never "0").

========================
NOT-OUT RULE
========================
notOutBatters = min(2, 10 − totalWickets) — NOT always 2. All-out = 0 not outs.
`;

const VALIDATION_RULES = `
========================
JSON VALIDATION RULES (STRICT)
========================
- innings.length MUST equal 2
- Batting order valid; dismissed players cannot bat again
- Bowler cannot dismiss themselves | striker ≠ non-striker in partnerships
- Overs format: legal cricket notation (e.g. 19.5 not 19.50 invalid ball count)
- Chase ends immediately when target exceeded; margin matches scoreboard exactly
- totalRuns = sum(batting runs) + extras.total (exact integer)
- totalWickets = count dismissed (status NOT "not out")
- strikeRate = round((runs/balls)×100, 1) | economy = runs ÷ overs bowled
- Bowling overs sum = match overs | fours/sixes consistent with runs
- Dot balls 25–45 per innings | Max 2 not-outs per completed innings
- No ":4 overs" or quota text in any player name field

If any statistical inconsistency, unrealistic phase behavior, impossible bowling allocation,
or invalid cricket logic exists — REGENERATE THE ENTIRE MATCH before output.
`;

const JSON_SCHEMA = `
========================
JSON OUTPUT SCHEMA
========================
Return ONE JSON object only (no markdown).

Root: matchTitle, stage, venue, venueCity, pitchType, pitchDescription, dewCondition,
toss {winner, decision:"bat"|"bowl", decisionText},
impactPlayers[{teamName, playerIn, reason, activatedAt}],
innings[2], partnerships{firstInnings[], secondInnings[]},
fallOfWickets{firstInnings[], secondInnings[]}, result{winner, margin, summary}, playerOfTheMatch

innings[] element:
{
  teamName, totalRuns, totalWickets, overs, runRate, target?,
  extras {total, wides, noBalls, byes, legByes},
  batting[{name, status, runs, balls, fours, sixes, strikeRate}],
  bowling[{name, overs, maidens, runs, wickets, economy, isImpact?}],
  didNotBat[]
}

partnerships[]: {wicket, runs, balls, batters} — batters MUST be two different names
fallOfWickets[]: {score, over, batter}

NOTE: Server rebuilds full scorecard from squads for statistical consistency.
LLM should return clean toss + impactPlayers + metadata; use squad names only.
Dismissals: c X b Y | lbw b Y | b Y | run out | st X b Y | not out
`;

export const MATCH_SIMULATION_SYSTEM_PROMPT =
  REALISM_ENGINE + VALIDATION_RULES + JSON_SCHEMA;

function formatSquad(team: {
  name?: string;
  playingXI?: { name: string; role?: string; notes?: string }[];
  impactPlayer?: { name: string; notes?: string };
  bowlingQuota?: { name: string; overs: number[] }[];
}): string {
  const lines: string[] = [];
  lines.push(`Team: ${team.name ?? "Unknown"}`);
  if (team.playingXI?.length) {
    lines.push(
      "Playing XI (order): " +
        team.playingXI
          .map((p, i) => {
            const role = p.role ? ` [${p.role}]` : "";
            const note = p.notes ? ` (${p.notes})` : "";
            return `${i + 1}. ${p.name}${role}${note}`;
          })
          .join("; "),
    );
  }
  if (team.impactPlayer) {
    lines.push(
      `Impact Player: ${team.impactPlayer.name}${team.impactPlayer.notes ? ` — ${team.impactPlayer.notes}` : ""}`,
    );
  }
  if (team.bowlingQuota?.length) {
    lines.push(
      "Bowling quota: " +
        team.bowlingQuota.map((q) => `${q.name} (overs ${q.overs.join(",")})`).join(", "),
    );
  }
  return lines.join("\n");
}

export function buildUserPrompt(payload: unknown, validationErrors?: string[]): string {
  const p = payload as {
    teamA?: {
      name?: string;
      playingXI?: { name: string; role?: string; notes?: string }[];
      impactPlayer?: { name: string; notes?: string };
      bowlingQuota?: { name: string; overs: number[] }[];
    };
    teamB?: {
      name?: string;
      playingXI?: { name: string; role?: string; notes?: string }[];
      impactPlayer?: { name: string; notes?: string };
      bowlingQuota?: { name: string; overs: number[] }[];
    };
    matchConfig?: { overs?: number; stage?: string };
    venue?: {
      name?: string;
      city?: string;
      pitchType?: string;
      pitchDescription?: string;
      typicalDew?: string;
      boundarySize?: string;
      notes?: string;
    };
  };

  const overs = p.matchConfig?.overs ?? 20;
  const venueBlock = [
    `Venue: ${p.venue?.name ?? "TBD"}, ${p.venue?.city ?? ""}`,
    `Pitch: ${p.venue?.pitchType ?? "Balanced"} — ${p.venue?.pitchDescription ?? ""}`,
    `Boundary: ${p.venue?.boundarySize ?? "medium"} | Dew: ${p.venue?.typicalDew ?? "Moderate"}`,
    p.venue?.notes ? `Venue notes: ${p.venue.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let msg = `Simulate a ${overs}-over IPL ${p.matchConfig?.stage ?? "League"} match.

USER INPUT LAYER:
${formatSquad(p.teamA ?? {})}

${formatSquad(p.teamB ?? {})}

${venueBlock}

Apply phase engine, weighted score distribution, bowling allocation, and pressure logic.
Return JSON: toss, impactPlayers, matchTitle, stage. Clean names only (no ":4 overs").
notOutBatters = min(2, 10 − wickets). Regenerate if any validation rule fails.

FULL INPUT:
${JSON.stringify(payload)}`;

  if (validationErrors?.length) {
    msg += `\n\nREGENERATE — FIX VALIDATION ERRORS:\n${validationErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`;
  }
  return msg;
}
