#!/usr/bin/env node
import { parseBothTeams, parseTeamSheet } from "../src/lib/ai/teamInputParser.ts";
import { namesMatch } from "../src/lib/ai/playerNames.ts";

const PUNJAB = `KL rahul (WK)
Gowtham gambhir (C)
Glenn Maxwell ✈️
Ben stokes ✈️ 
Liam Livingston ✈️ 
Rashid Khan ✈️ 
Balachandra Akhil 
Mitchell McClenaghan ✈️
Harmeet singh 
Yuzvendra Chahal 
Jasprit bumrah

Bowling quota:

Jasprit bumrah -4
Mitchell McClenaghan -4
Rashid Khan -4
Yuzvendra Chahal -4
Ben stokes -4`;

const CSK = `CSK XI: 

Micheal Hussy ✈️
Mathew Hayden ✈️
Sachin Tendulkar 
Robin Uthappa 
Ambati Rayadu 
MS Dhoni (C & WK)
Ravichandran Ashwin 
Pat Cummins ✈️
Shadab Jakati
Mitchell Starc ✈️
Mitchell Johnson ✈️


Bowling : 
Mitchell Johnson: 2,4,16,19
Mitchell Starc: 1,5,18,20
Pat Cummins: 3,6,15,17
Shadab Jakati: 7,9,11,13
Ravichandran Ashwin: 8,10,12,14`;

const CSK_NO_HEADER = CSK.replace(/^CSK XI:\s*\n+/i, "");

function assertCskSheet(result, label, expectedName) {
  const { team, errors, warnings } = result;
  console.log(`\n--- ${label} ---`);
  console.log("Errors:", errors);
  console.log("Warnings:", warnings);
  console.log("XI count:", team.playingXI.length);
  console.log("Team name:", team.name);
  console.log("Captain/WK:", team.captain, "/", team.wicketkeeper);
  console.log("Quota overs:", team.bowlingQuota.reduce((s, q) => s + q.overs.length, 0));
  if (errors.length) throw new Error(`${label}: errors`);
  if (team.playingXI.length !== 11) throw new Error(`${label}: expected 11 players`);
  if (team.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20) {
    throw new Error(`${label}: expected 20 quota overs`);
  }
  if (team.captain !== "MS Dhoni" || team.wicketkeeper !== "MS Dhoni") {
    throw new Error(`${label}: captain/wk not parsed`);
  }
  if (expectedName && team.name !== expectedName) {
    throw new Error(`${label}: expected team name ${expectedName}`);
  }
}

assertCskSheet(parseTeamSheet(CSK, "CSK", 20, "test"), "with CSK XI header + name field", "CSK");
assertCskSheet(parseTeamSheet(CSK_NO_HEADER, "CSK", 20, "test"), "without CSK XI header", "CSK");
assertCskSheet(parseTeamSheet(CSK, undefined, 20, "test"), "header only (no name field)", "CSK");

const LSG = `1.Shikhar Dhawan
2.Naman Ojha (WK)
3.Ricky Ponting  ✈️(C)
4.Jacques Kallis ✈️
5.Rishi Dhawan 
6.Dwayne Bravo ✈️
7.Anil Kumble 
8.Pawan Negi
9.Shane Bond ✈️ 
10.Munaf Patel
11.Glenn McGrath ✈️


Bowling Quota (Strictly Follow this layout when we Bowl first)

Glenn McGarth ✈️ - 4 Overs(1,3,16,19)
Shane Bond ✈️ - 4 Overs(2,4,6,17)
Munaf Patel- 4 Overs(5,9,11,13)
Dwayne Bravo ✈️- 4 Overs (7,15,18,20)
Anil Kumble - 4 Overs(8,10,12,14)`;

const DC = `Virat Kohli(C)
Shubman Gill 
Shane Watson✈️
Shreyas Iyer
Kieron Pollard ✈️ 
David Miller ✈️ 
Ravindra Jadeja
Aditya Tare(WK)
Ishant Sharma 
Shaun Tait✈️
Andrew Tye ✈️

Bowling Quota -

Ravindra Jadeja -4
Shane Watson -4
Andrew Tye -4
Shaun Tait -4
Ishant Sharma -4`;

function assertLegendsPair(r) {
  if (r.errors.length) throw new Error(`errors: ${r.errors.join("; ")}`);
  if (r.teamA.playingXI.length !== 11) throw new Error(`LSG expected 11, got ${r.teamA.playingXI.length}`);
  if (r.teamB.playingXI.length !== 11) throw new Error(`DC expected 11, got ${r.teamB.playingXI.length}`);
  if (r.teamA.playingXI.some((p) => /^\d+\./.test(p.name))) {
    throw new Error("LSG player names still have list numbers");
  }
  if (r.teamA.captain !== "Ricky Ponting") throw new Error(`LSG captain: ${r.teamA.captain}`);
  if (r.teamA.bowlingQuota.length !== 5) throw new Error("LSG expected 5 bowlers in quota");
  const lsgOvers = r.teamA.bowlingQuota.flatMap((q) => q.overs).sort((a, b) => a - b);
  if (lsgOvers.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20") {
    throw new Error(`LSG quota overs wrong: ${lsgOvers.join(",")}`);
  }
  if (r.teamA.bowlingQuota.find((q) => q.name === "Glenn McGarth")?.overs.join(",") !== "1,3,16,19") {
    throw new Error("Glenn McGarth quota not parsed");
  }
  // Typo in quota should align to XI spelling when close enough
  const mcGrathQuota = r.teamA.bowlingQuota.find((q) => namesMatch(q.name, "Glenn McGrath"));
  if (!mcGrathQuota || mcGrathQuota.overs.join(",") !== "1,3,16,19") {
    throw new Error("Glenn McGrath quota not aligned to XI name");
  }
  if (r.teamB.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20) {
    throw new Error("DC quota overs wrong");
  }
}

assertLegendsPair(parseBothTeams(LSG, DC, "LSG", "DC", 20, "legends-test"));
console.log("Legends LSG/DC format: PASS");

function assertBuiltInExamples(label, teamAText, teamBText, teamAName, teamBName) {
  const r = parseBothTeams(teamAText, teamBText, teamAName, teamBName, 20, label);
  if (r.errors.length) throw new Error(`${label} errors: ${r.errors.join("; ")}`);
  if (r.teamA.playingXI.length !== 11 || r.teamB.playingXI.length !== 11) {
    throw new Error(`${label}: expected 11 players per team`);
  }
  if (
    r.teamA.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20 ||
    r.teamB.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20
  ) {
    throw new Error(`${label}: bowling quota must cover 20 overs`);
  }
}

assertBuiltInExamples("legends-examples", LEGENDS_EXAMPLE_TEAM_A, LEGENDS_EXAMPLE_TEAM_B, "SRH", "RCB");
assertBuiltInExamples("franchise-examples", FRANCHISE_EXAMPLE_TEAM_A, FRANCHISE_EXAMPLE_TEAM_B, "CSK", "DC");
console.log("Built-in example sheets: PASS");

const r = parseBothTeams(PUNJAB, CSK, "Punjab", "CSK", 20, "test");

console.log("Errors:", r.errors);
console.log("Warnings:", r.warnings);
console.log("Punjab XI:", r.teamA.playingXI.length, "overseas:", r.teamA.playingXI.filter((p) => p.overseas).length);
console.log(
  "Punjab quota total overs:",
  r.teamA.bowlingQuota.reduce((s, q) => s + q.overs.length, 0),
);
console.log(
  "Punjab quota:",
  r.teamA.bowlingQuota.map((q) => `${q.name}:${q.overs.join(",")}`).join(" | "),
);
console.log("CSK XI:", r.teamB.playingXI.length);
console.log("CSK captain:", r.teamB.captain, "wk:", r.teamB.wicketkeeper);
console.log(
  "CSK quota total:",
  r.teamB.bowlingQuota.reduce((s, q) => s + q.overs.length, 0),
);

if (r.errors.length) process.exit(1);
if (r.teamA.playingXI.length !== 11) process.exit(1);
if (r.teamB.playingXI.length !== 11) process.exit(1);
if (r.teamA.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20) process.exit(1);
if (r.teamB.bowlingQuota.reduce((s, q) => s + q.overs.length, 0) !== 20) process.exit(1);
if (!r.teamB.captain || !r.teamB.wicketkeeper) process.exit(1);

console.log("PASS");
