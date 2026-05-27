import PDFDocument from "pdfkit";
import type { MatchResult } from "../matchSchema";

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

function contentWidth(doc: PDFDoc) {
  return doc.page.width - MARGIN * 2;
}

const PAGE_BOTTOM = 841.89 - MARGIN;

function ensureSpace(doc: PDFDoc, needed: number, bannerSubtitle: string, pageNum: number, totalPages: number) {
  if (doc.y + needed <= PAGE_BOTTOM) return;
  doc.addPage();
  drawTopBanner(doc, pageNum, totalPages, bannerSubtitle);
}

function drawTopBanner(doc: PDFDoc, pageNum: number, totalPages: number, subtitle: string) {
  doc.rect(0, 0, doc.page.width, 52).fill(IPL_PURPLE);
  doc.rect(0, 50, doc.page.width, 2).fill(IPL_GOLD);

  doc.fillColor(IPL_GOLD).font("Helvetica-Bold").fontSize(10)
    .text("INDIAN PREMIER LEAGUE", MARGIN, 10);
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
  const tableH = headerH + rows.length * rowH + 8;

  if (y + tableH > PAGE_BOTTOM) {
    doc.addPage();
    y = 62;
    doc.y = y;
  }

  if (header) {
    doc.rect(MARGIN, y, TABLE_W, 20).fill("#E8E8E8");
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(8);
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
  { label: "BATTER", width: TABLE_W * 0.28 },
  { label: "STATUS", width: TABLE_W * 0.3 },
  { label: "R", width: TABLE_W * 0.07, align: "center" },
  { label: "B", width: TABLE_W * 0.07, align: "center" },
  { label: "4s", width: TABLE_W * 0.07, align: "center" },
  { label: "6s", width: TABLE_W * 0.07, align: "center" },
  { label: "SR", width: TABLE_W * 0.14, align: "center" },
];

const BOWL_COLS: Col[] = [
  { label: "BOWLER", width: TABLE_W * 0.36 },
  { label: "O", width: TABLE_W * 0.1, align: "center" },
  { label: "M", width: TABLE_W * 0.08, align: "center" },
  { label: "R", width: TABLE_W * 0.12, align: "center" },
  { label: "W", width: TABLE_W * 0.1, align: "center" },
  { label: "ECON", width: TABLE_W * 0.24, align: "center" },
];

function renderBattingSection(doc: PDFDoc, innings: MatchResult["innings"][0], target?: number) {
  const title = target
    ? `${innings.teamName.toUpperCase()} — TARGET ${target}`
    : `${innings.teamName.toUpperCase()} INNINGS`;
  drawSectionTitle(doc, title);

  const rows = innings.batting.map((b) => [
    b.name,
    b.status,
    String(b.runs),
    String(b.balls),
    String(b.fours),
    String(b.sixes),
    b.strikeRate.toFixed(1),
  ]);
  drawTable(doc, BAT_COLS, rows);

  const ex = innings.extras;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT)
    .text(
      `TOTAL  ${innings.totalRuns}/${innings.totalWickets} (${innings.overs} Ov, RR ${innings.runRate.toFixed(2)})`,
      MARGIN,
      doc.y,
      { lineBreak: false },
    );
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED)
    .text(
      `Extras ${ex.total} (w ${ex.wides}, nb ${ex.noBalls}, b ${ex.byes}, lb ${ex.legByes})`,
      MARGIN,
      undefined,
      { lineBreak: false },
    );
  if (innings.didNotBat?.length) {
    doc.text(`Did not bat: ${innings.didNotBat.join(", ")}`, MARGIN, undefined, {
      width: TABLE_W,
      lineBreak: true,
    });
  }
  doc.moveDown(0.6);
}

function renderBowlingSection(
  doc: PDFDoc,
  title: string,
  bowling: NonNullable<MatchResult["innings"][0]["bowling"]>,
) {
  drawSectionTitle(doc, title);
  const rows = bowling.map((b) => [
    b.isImpact ? `${b.name} (IP)` : b.name,
    b.overs.toFixed(1),
    String(b.maidens),
    String(b.runs),
    String(b.wickets),
    b.economy.toFixed(2),
  ]);
  drawTable(doc, BOWL_COLS, rows);
}

function renderMatchHeader(doc: PDFDoc, match: MatchResult) {
  doc.font("Helvetica-Bold").fontSize(13).fillColor(IPL_PURPLE)
    .text(match.matchTitle.toUpperCase(), MARGIN, doc.y, { align: "center", width: TABLE_W });
  if (match.stage) {
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(match.stage.toUpperCase(), { align: "center" });
  }
  doc.moveDown(0.4);

  const boxY = doc.y;
  doc.rect(MARGIN, boxY, TABLE_W, 58).fill("#FAFAFA").strokeColor(BORDER).stroke();
  doc.fillColor(TEXT).font("Helvetica").fontSize(8)
    .text(`Venue: ${match.venue}${match.venueCity ? `, ${match.venueCity}` : ""}`, MARGIN + 10, boxY + 8)
    .text(`Pitch: ${match.pitchType} — ${match.pitchDescription}`, MARGIN + 10, boxY + 20)
    .text(`Dew: ${match.dewCondition ?? "N/A"}  |  Toss: ${match.toss.winner} (${match.toss.decisionText})`, MARGIN + 10, boxY + 32);

  if (match.impactPlayers.length) {
    doc.font("Helvetica-Bold").text("Impact Player:", MARGIN + 10, boxY + 44);
    doc.font("Helvetica");
    const ipText = match.impactPlayers
      .map((ip) => `${ip.teamName}: ${ip.playerIn} (${ip.reason})`)
      .join("  ·  ");
    doc.text(ipText, MARGIN + 90, boxY + 44, { width: TABLE_W - 100, lineBreak: false });
  }
  doc.y = boxY + 66;
}

function renderCombinedPartnerships(doc: PDFDoc, match: MatchResult) {
  const rows: string[][] = [];
  for (const p of match.partnerships.firstInnings) {
    rows.push(["1st", String(p.wicket), String(p.runs), String(p.balls), p.batters]);
  }
  for (const p of match.partnerships.secondInnings) {
    rows.push(["2nd", String(p.wicket), String(p.runs), String(p.balls), p.batters]);
  }
  if (!rows.length) return;
  drawSectionTitle(doc, "Partnerships");
  const cols: Col[] = [
    { label: "Inn", width: 36, align: "center" },
    { label: "Wkt", width: 40, align: "center" },
    { label: "Runs", width: 50, align: "center" },
    { label: "Balls", width: 50, align: "center" },
    { label: "Batters", width: TABLE_W - 176 },
  ];
  drawTable(doc, cols, rows);
}

function renderCombinedFow(doc: PDFDoc, match: MatchResult) {
  const rows: string[][] = [];
  for (const f of match.fallOfWickets.firstInnings) {
    rows.push(["1st", f.score, f.over, f.batter]);
  }
  for (const f of match.fallOfWickets.secondInnings) {
    rows.push(["2nd", f.score, f.over, f.batter]);
  }
  if (!rows.length) return;
  drawSectionTitle(doc, "Fall of Wickets");
  const cols: Col[] = [
    { label: "Inn", width: 36, align: "center" },
    { label: "Score", width: 70, align: "center" },
    { label: "Over", width: 70, align: "center" },
    { label: "Batter", width: TABLE_W - 176 },
  ];
  drawTable(doc, cols, rows);
}

function renderPartnerships(
  doc: PDFDoc,
  label: string,
  rows: MatchResult["partnerships"]["firstInnings"],
) {
  if (!rows.length) return;
  drawSectionTitle(doc, label);
  const cols: Col[] = [
    { label: "Wkt", width: 50, align: "center" },
    { label: "Runs", width: 60, align: "center" },
    { label: "Balls", width: 60, align: "center" },
    { label: "Batters", width: TABLE_W - 170 },
  ];
  drawTable(
    doc,
    cols,
    rows.map((p) => [String(p.wicket), String(p.runs), String(p.balls), p.batters]),
  );
}

function renderFow(doc: PDFDoc, label: string, rows: MatchResult["fallOfWickets"]["firstInnings"]) {
  if (!rows.length) return;
  drawSectionTitle(doc, label);
  const cols: Col[] = [
    { label: "Score", width: 90, align: "center" },
    { label: "Over", width: 90, align: "center" },
    { label: "Batter", width: TABLE_W - 180 },
  ];
  drawTable(doc, cols, rows.map((f) => [f.score, f.over, f.batter]));
}

function renderResultBox(doc: PDFDoc, match: MatchResult) {
  const y = doc.y;
  doc.rect(MARGIN, y, TABLE_W, 44).fill(IPL_PURPLE);
  doc.rect(MARGIN, y, TABLE_W, 3).fill(IPL_GOLD);
  const summary = match.result.summary || `${match.result.winner} won ${match.result.margin}`;
  doc.fillColor(IPL_GOLD).font("Helvetica-Bold").fontSize(11)
    .text(`RESULT: ${summary}`, MARGIN + 10, y + 10, { width: TABLE_W - 20 });
  const mom = Array.isArray(match.playerOfTheMatch)
    ? match.playerOfTheMatch.join(" & ")
    : match.playerOfTheMatch;
  doc.fillColor("#FFFFFF").font("Helvetica").fontSize(9)
    .text(`Player of the Match: ${mom}`, MARGIN + 10, y + 28);
  doc.y = y + 52;
}

export function generateMatchScorecardPdf(match: MatchResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const hasSuperOver = !!match.superOver;
    const totalPages = hasSuperOver ? 4 : 3;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const [inn1, inn2] = match.innings;

    // Page 1 — Header + Team A batting
    drawTopBanner(doc, 1, totalPages, match.matchTitle);
    renderMatchHeader(doc, match);
    renderBattingSection(doc, inn1);
    if (match.fallOfWickets.firstInnings.length) {
      renderFow(doc, `${inn1.teamName} — Fall of Wickets`, match.fallOfWickets.firstInnings);
    }

    // Page 2 — Team B bowling + Team B batting
    doc.addPage();
    drawTopBanner(doc, 2, totalPages, `${inn2.teamName} vs ${inn1.teamName}`);
    if (inn1.bowling?.length) {
      renderBowlingSection(doc, `${inn2.teamName} Bowling`, inn1.bowling);
    }
    renderBattingSection(doc, inn2, inn2.target);
    if (match.fallOfWickets.secondInnings.length) {
      renderFow(doc, `${inn2.teamName} — Fall of Wickets`, match.fallOfWickets.secondInnings);
    }

    // Page 3 — Team A bowling + partnerships + FOW + result (compact, auto page-break safe)
    doc.addPage();
    drawTopBanner(doc, 3, totalPages, "Bowling, Partnerships & Result");
    if (inn2.bowling?.length) {
      renderBowlingSection(doc, `${inn1.teamName} Bowling`, inn2.bowling);
    }
    ensureSpace(doc, 200, "Partnerships & Result", 3, totalPages);
    renderCombinedPartnerships(doc, match);
    ensureSpace(doc, 160, "Fall of Wickets & Result", 3, totalPages);
    renderCombinedFow(doc, match);
    ensureSpace(doc, 60, "Match Result", 3, totalPages);
    renderResultBox(doc, match);

    if (hasSuperOver && match.superOver) {
      doc.addPage();
      drawTopBanner(doc, 4, totalPages, "Super Over");
      drawSectionTitle(doc, "Super Over");
      renderBattingSection(doc, {
        teamName: match.superOver.battingTeam,
        batting: match.superOver.batting,
        extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        totalRuns: match.superOver.totalRuns,
        totalWickets: match.superOver.totalWickets,
        overs: 1,
        runRate: match.superOver.totalRuns,
      });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT).text(match.superOver.result, MARGIN);
    }

    doc.end();
  });
}

export function buildPdfFileName(match: MatchResult): string {
  const safe = match.matchTitle.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40);
  return `IPL_Match_${safe}_${Date.now()}.pdf`;
}
