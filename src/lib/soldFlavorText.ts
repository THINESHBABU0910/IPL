const GENERIC_TEMPLATES = [
  "{player} goes to {team}!",
  "What a pick! {player} joins {team}!",
  "{team} seal the deal for {player}!",
  "Sold! {player} is now a {team}!",
];

const TEAM_TEMPLATES: Record<string, string[]> = {
  CSK: ["Whistle podu! {player} is a Super King!", "{player} joins the Yellow Brigade!"],
  MI: ["Dil se Mumbai! {player} is a Paltan!", "{player} wears the blue and gold!"],
  RCB: ["Ee Sala Cup Namde! {player} is a Royal!", "{player} joins the Red Army!"],
  KKR: ["Korbo, Lorbo, Jeetbo! {player} is a Knight!", "{player} joins the Purple & Gold!"],
  RR: ["Halla Bol! {player} is a Royal!", "{player} joins the Pink Brigade!"],
  DC: ["Dil Khol Ke Dilli! {player} is a Capital!", "{player} joins the Delhi squad!"],
  SRH: ["Orange Army! {player} joins SRH!", "{player} is Sunrisers now!"],
  PBKS: ["Sher aa gaya! {player} joins Punjab!", "{player} is a King now!"],
  GT: ["Aava De! {player} joins Gujarat!", "{player} is a Titan now!"],
  LSG: ["Ab devo bas! {player} joins Lucknow!", "{player} is a Super Giant!"],
};

export function getSoldFlavorText(playerName: string, teamShortName: string): string {
  const templates = [...(TEAM_TEMPLATES[teamShortName] || []), ...GENERIC_TEMPLATES];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\{player\}/g, playerName).replace(/\{team\}/g, teamShortName);
}
