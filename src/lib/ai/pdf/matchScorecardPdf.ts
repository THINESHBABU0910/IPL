import PDFDocument from "pdfkit";
import type { MatchResult, ParsedTeam } from "../matchSchema";
import { buildSquadSnapshots, getPdfBannerTitle } from "../scorecardMeta";
import { formatOversCricket } from "../scorecardStandings";

const IPL_PURPLE = "#1B0547";
const IPL_GOLD = "#D4AF37";
const IPL_BLUE = "#002F87";
const ROW_ALT = "#F7F5FA";
const BORDER = "#CCCCCC";
const TEXT = "#1A1A1A";
const MUTED = "#555555";

type PDFDoc = InstanceType<typeof PDFDocument>;
const MARGIN = 36;
const TABLE_W = 523;

type Col = { label: string; width: number; align?: "left" | "center" | "right" };

export interface PdfSquadsContext {
  teamA?: ParsedTeam;
  teamB?: ParsedTeam;
}

const PAGE_BOTTOM = 841.89 - MARGIN;

function drawTopBanner(
  doc: PDFDoc,
  pageNum: number,
  totalPages: number,
  subtitle: string,
  bannerTitle: string,
) {
  doc.rect(0, 0, doc.page.width, 52).fill(IPL_PURPLE);
  doc.rect(0, 50, doc.page.width, 2).fill(IPL_GOLD);

  doc.fillColor(IPL_GOLD).font("Helvetica-Bold").fontSize(10)
    .text(bannerTitle, MARGIN, 10);
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(8)
    .text(subtitle, MARGIN, 24, { width: TABLE_W - 60 });
  doc.fillColor(IPL_GOLD).fontSize(8)
    .text(`Page ${pageNum} of ${totalPages}`, doc.page.width - MARGIN - 70, 12);

  doc.y = 62;
}

function drawSectionTitle(doc: PDFDoc, title: string) {
  const y = doc.y;
  doc.rect(MARGIN, y, TABLE_W, 22).fill(IPL_BLUE);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10)
    .text(title.toUpperCase(), MARGIN + 8, y + 7);
  doc.y = y + 26;
}

function drawTable(doc: PDFDoc, cols: Col[], rows: string[][], header = true) {
  let y = doc.y;
  let x = MARGIN;
  const rowH = 17;
  const headerH = header ? 20 : 0;

  if (header) {
    if (y + headerH > PAGE_BOTTOM) {
      doc.addPage();
      y = 62;
    }
    doc.rect(MARGIN, y, TABLE_W, 20).fill("#E8E8E8");
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(8);
    x = MARGIN;
    for (const col of cols) {
      doc.text(col.label, x + 4, y + 6, { width: col.width - 8, align: col.align || "left" });
      x += col.width;
    }
    y += 20;
  }

  rows.forEach((row, ri) => {
    if (y + rowH > PAGE_BOTTOM) {
      doc.addPage();
      y = 62;
    }
    x = MARGIN;
    if (ri % 2 === 1) doc.rect(MARGIN, y, TABLE_W, rowH).fill(ROW_ALT);
    doc.rect(MARGIN, y, TABLE_W, rowH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fillColor(TEXT).font("Helvetica").fontSize(8);
    row.forEach((cell, ci) => {
      doc.text(cell, x + 4, y + 5, {
        width: cols[ci].width - 8,
        align: cols[ci].align || "left",
        lineBreak: false,
      });
      x += cols[ci].width;
    });
    y += rowH;
  });

  doc.y = y + 10;
}

const BAT_COLS: Col[] = [
  { label: "BATTER", width: TABLE_W * 0.22 },
  { label: "DISMISSAL", width: TABLE_W * 0.32 },
  { label: "R", width: TABLE_W * 0.07, align: "center" },
  { label: "B", width: TABLE_W * 0.07, align: "center" },
  { label: "4s", width: TABLE_W * 0.07, align: "center" },
  { label: "6s", width: TABLE_W * 0.07, align: "center" },
  { label: "SR", width: TABLE_W * 0.18, align: "center" },
];

const BOWL_COLS: Col[] = [
  { label: "BOWLER", width: TABLE_W * 0.26 },
  { label: "OVERS ASSIGNED", width: TABLE_W * 0.22 },
  { label: "O", width: TABLE_W * 0.08, align: "center" },
  { label: "M", width: TABLE_W * 0.06, align: "center" },
  { label: "R", width: TABLE_W * 0.1, align: "center" },
  { label: "W", width: TABLE_W * 0.08, align: "center" },
  { label: "ECON", width: TABLE_W * 0.2, align: "center" },
];

const FOW_COLS: Col[] = [
  { label: "SCORE", width: TABLE_W * 0.18, align: "center" },
  { label: "BATTER", width: TABLE_W * 0.28 },
  { label: "OVER", width: TABLE_W * 0.14, align: "center" },
  { label: "PARTNERSHIP", width: TABLE_W * 0.4, align: "center" },
];

function renderMatchInfoPage(doc: PDFDoc, match: MatchResult) {
  const [squadA, squadB] = match.squads ?? [];
  const teamsLine = squadA && squadB
    ? `${squadA.teamName.toUpperCase()} vs ${squadB.teamName.toUpperCase()}`
    : match.matchTitle.toUpperCase();

  doc.font("Helvetica-Bold").fontSize(12).fillColor(IPL_PURPLE)
    .text(teamsLine, MARGIN, doc.y, { align: "center", width: TABLE_W });
  doc.moveDown(0.3);

  drawSectionTitle(doc, "Match Information");
  const info = match.matchInfo ?? {};
  const lines = [
    `Venue: ${match.venue}`,
    `City: ${match.venueCity ?? "—"}`,
    info.attendance ? `Attendance: ${info.attendance}` : null,
    `Pitch Type: ${match.pitchType} (${match.pitchDescription})`,
    info.weather ? `Weather: ${info.weather}` : null,
    `Dew Factor: ${match.dewCondition ?? "Moderate"}`,
    `Toss Winner: ${match.toss.winner}`,
    `Decision: ${match.toss.decision === "bat" ? "Elected to Bat First" : "Elected to Bowl First"}`,
  ].filter(Boolean) as string[];

  doc.font("Helvetica").fontSize(8.5).fillColor(TEXT);
  for (const line of lines) {
    doc.text(line, MARGIN + 8, doc.y, { width: TABLE_W - 16 });
    doc.moveDown(0.35);
  }

  if (info.tossReasoning) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Reasoning:", MARGIN + 8);
    doc.font("Helvetica").text(info.tossReasoning, MARGIN + 8, doc.y, { width: TABLE_W - 16, lineGap: 2 });
    doc.moveDown(0.4);
  }

  if (squadA && squadB) {
    drawSectionTitle(doc, "Playing XI");
    const colW = TABLE_W / 2 - 6;
    const startY = doc.y;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(IPL_BLUE);
    doc.text(squadA.teamName, MARGIN, startY, { width: colW });
    doc.text(squadB.teamName, MARGIN + colW + 12, startY, { width: colW });
    let yA = startY + 14;
    let yB = startY + 14;
    doc.font("Helvetica").fontSize(7.5).fillColor(TEXT);
    const maxLen = Math.max(squadA.players.length, squadB.players.length);
    for (let i = 0; i < maxLen; i++) {
      const pa = squadA.players[i];
      const pb = squadB.players[i];
      if (pa) {
        const tags = [pa.isCaptain ? "(C)" : "", pa.isWicketkeeper ? "(WK)" : "", pa.overseas ? "✈️" : ""]
          .filter(Boolean)
          .join(" ");
        doc.text(`${pa.order}. ${pa.name} ${tags}`.trim(), MARGIN, yA, { width: colW, lineBreak: false });
        yA += 12;
      }
      if (pb) {
        const tags = [pb.isCaptain ? "(C)" : "", pb.isWicketkeeper ? "(WK)" : "", pb.overseas ? "✈️" : ""]
          .filter(Boolean)
          .join(" ");
        doc.text(`${pb.order}. ${pb.name} ${tags}`.trim(), MARGIN + colW + 12, yB, { width: colW, lineBreak: false });
        yB += 12;
      }
    }
    doc.y = Math.max(yA, yB) + 8;
  }

  if (match.impactPlayers.length) {
    drawSectionTitle(doc, "Impact Player");
    for (const ip of match.impactPlayers) {
      doc.font("Helvetica").fontSize(8).text(
        `${ip.teamName}: ${ip.playerIn} — ${ip.reason} (${ip.activatedAt})`,
        MARGIN + 8,
        doc.y,
        { width: TABLE_W - 16 },
      );
      doc.moveDown(0.3);
    }
  }
}

function renderInningsBlock(
  doc: PDFDoc,
  innings: MatchResult["innings"][0],
  fieldingTeam: string,
  fow: MatchResult["fallOfWickets"]["firstInnings"],
  isSecondInnings: boolean,
) {
  const label = isSecondInnings && innings.target
    ? `SECOND INNINGS SCORECARD: ${innings.teamName}`
    : `FIRST INNINGS SCORECARD: ${innings.teamName}`;
  drawSectionTitle(doc, label);

  const rows = innings.batting.map((b) => [
    b.name,
    b.status,
    String(b.runs),
    String(b.balls),
    String(b.fours),
    String(b.sixes),
    b.strikeRate.toFixed(2),
  ]);
  drawTable(doc, BAT_COLS, rows);

  const ex = innings.extras;
  const oversStr = formatOversCricket(innings.overs);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT)
    .text(
      `Extras: ${ex.total} (W ${ex.wides}, NB ${ex.noBalls}, LB ${ex.legByes}, B ${ex.byes})  Total: ${innings.totalRuns}/${innings.totalWickets} (${oversStr} Overs)  Run Rate: ${innings.runRate.toFixed(2)}`,
      MARGIN,
      doc.y,
      { width: TABLE_W, lineGap: 1 },
    );
  doc.moveDown(0.5);

  if (innings.bowling?.length) {
    drawSectionTitle(doc, `Bowling Table (${fieldingTeam})`);
    const bowlRows = innings.bowling.map((b) => [
      b.isImpact ? `${b.name} (IP)` : b.name,
      b.oversAssigned ?? "—",
      formatOversCricket(b.overs),
      String(b.maidens),
      String(b.runs),
      String(b.wickets),
      b.economy.toFixed(2),
    ]);
    drawTable(doc, BOWL_COLS, bowlRows);
    const early = innings.bowling.find((b) => b.endedEarly);
    if (early) {
      doc.font("Helvetica-Oblique").fontSize(7).fillColor(MUTED)
        .text(`* ${early.name}'s final scheduled over concluded early when the winning boundary was struck.`, MARGIN);
      doc.moveDown(0.4);
    }
  }

  if (fow.length) {
    drawSectionTitle(doc, "Fall of Wickets");
    drawTable(
      doc,
      FOW_COLS,
      fow.map((f) => [f.score, f.batter, f.over, f.partnership ?? "—"]),
    );
  }
}

function renderMatchSummaryPage(doc: PDFDoc, match: MatchResult) {
  drawSectionTitle(doc, "Match Summary");

  const winnerLine = `${match.result.winner.toUpperCase()} WON ${match.result.margin.toUpperCase()}`;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(IPL_PURPLE).text(winnerLine, MARGIN, doc.y);
  if (match.result.ballsRemaining) {
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`(${match.result.ballsRemaining})`, MARGIN);
  }
  doc.moveDown(0.6);

  const sum = match.matchSummary;
  const mom = sum?.playerOfTheMatchBlurb
    ?? (Array.isArray(match.playerOfTheMatch)
      ? match.playerOfTheMatch.join(" & ")
      : match.playerOfTheMatch);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT).text("Player of the Match:", MARGIN);
  doc.font("Helvetica").fontSize(8.5).text(mom, MARGIN, doc.y, { width: TABLE_W, lineGap: 2 });
  doc.moveDown(0.5);

  const blocks: [string, string | undefined][] = [
    ["Turning Point", sum?.turningPoint],
    ["Highest Partnership", sum?.highestPartnership],
    ["Best Bowling Spell", sum?.bestBowling],
    ["Best Batting Performance", sum?.bestBatting],
    ["Captaincy Impact", sum?.captaincyImpact],
  ];

  for (const [title, body] of blocks) {
    if (!body) continue;
    doc.font("Helvetica-Bold").fontSize(9).text(`${title}:`, MARGIN);
    doc.font("Helvetica").fontSize(8.5).text(body, MARGIN, doc.y, { width: TABLE_W, lineGap: 2 });
    doc.moveDown(0.4);
  }

  if (sum?.winningFactors?.length) {
    doc.font("Helvetica-Bold").fontSize(9).text("Winning Factors:", MARGIN);
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(8.5);
    for (const factor of sum.winningFactors) {
      doc.text(`• ${factor}`, MARGIN + 10, doc.y, { width: TABLE_W - 20, lineGap: 1 });
      doc.moveDown(0.15);
    }
  }

  if (match.chaseFinishNote) {
    doc.moveDown(0.3);
    doc.font("Helvetica-Oblique").fontSize(7.5).fillColor(MUTED)
      .text(match.chaseFinishNote, MARGIN, doc.y, { width: TABLE_W });
  }
}

export function generateMatchScorecardPdf(
  match: MatchResult,
  squadsCtx?: PdfSquadsContext,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const hasSuperOver = !!match.superOver;
    const totalPages = hasSuperOver ? 5 : 4;
    const bannerTitle =
      match.leagueBanner ?? getPdfBannerTitle(match.scorecardTheme ?? "ipl");
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const [inn1, inn2] = match.innings;
    const fielding1 = inn2.teamName;
    const fielding2 = inn1.teamName;

    if (!match.squads && squadsCtx?.teamA && squadsCtx?.teamB) {
      match = { ...match, squads: buildSquadSnapshots(squadsCtx.teamA, squadsCtx.teamB) };
    }

    drawTopBanner(doc, 1, totalPages, match.matchTitle, bannerTitle);
    renderMatchInfoPage(doc, match);

    doc.addPage();
    drawTopBanner(doc, 2, totalPages, `1st Innings — ${inn1.teamName}`, bannerTitle);
    renderInningsBlock(doc, inn1, fielding1, match.fallOfWickets.firstInnings, false);

    doc.addPage();
    drawTopBanner(doc, 3, totalPages, `2nd Innings — ${inn2.teamName}`, bannerTitle);
    renderInningsBlock(doc, inn2, fielding2, match.fallOfWickets.secondInnings, true);

    doc.addPage();
    drawTopBanner(doc, 4, totalPages, "Match Summary", bannerTitle);
    renderMatchSummaryPage(doc, match);

    if (hasSuperOver && match.superOver) {
      doc.addPage();
      drawTopBanner(doc, 5, totalPages, "Super Over", bannerTitle);
      drawSectionTitle(doc, "Super Over");
      renderInningsBlock(
        doc,
        {
          teamName: match.superOver.battingTeam,
          batting: match.superOver.batting,
          bowling: match.superOver.bowling,
          extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          totalRuns: match.superOver.totalRuns,
          totalWickets: match.superOver.totalWickets,
          overs: 1,
          runRate: match.superOver.totalRuns,
        },
        match.superOver.bowlingTeam,
        [],
        true,
      );
      doc.font("Helvetica-Bold").fontSize(9).text(match.superOver.result, MARGIN);
    }

    doc.end();
  });
}

export function buildPdfFileName(match: MatchResult): string {
  const safe = match.matchTitle.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 50);
  const suffix =
    match.scorecardTheme === "legends"
      ? "_Legends_Scorecard"
      : match.leagueBanner
        ? `_${match.leagueBanner.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24)}_Scorecard`
        : "_Scorecard";
  return `${safe}${suffix}.pdf`;
}
