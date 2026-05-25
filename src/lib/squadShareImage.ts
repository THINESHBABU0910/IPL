import { Player } from "./types";
import { formatPrice, TOTAL_PURSE, MAX_SQUAD_SIZE, MAX_OVERSEAS } from "./constants";
import { ROLE_ORDER, ROLE_LABELS } from "./squadUtils";

export interface SquadShareInput {
  teamName: string;
  shortName: string;
  ownerName: string;
  primaryColor: string;
  purseLeft: number;
  players: Player[];
  soldPrices?: Record<string, number>;
  retainedIds?: Set<string>;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function groupByRole(players: Player[]) {
  return ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    players: players.filter((p) => p.role === role),
  })).filter((g) => g.players.length > 0);
}

export async function generateSquadShareImage(input: SquadShareInput): Promise<Blob> {
  const width = 1080;
  const rowHeight = 40;
  const sectionHeaderHeight = 36;
  const headerHeight = 200;
  const footerHeight = 80;
  const players = input.players.slice(0, MAX_SQUAD_SIZE);
  const grouped = groupByRole(players);
  const overseas = players.filter((p) => p.isOverseas).length;
  const totalSpent = TOTAL_PURSE - input.purseLeft;

  let contentHeight = 0;
  for (const g of grouped) {
    contentHeight += sectionHeaderHeight + g.players.length * rowHeight;
  }
  const height = headerHeight + contentHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#0B0B0F";
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, headerHeight);
  grad.addColorStop(0, input.primaryColor);
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText("IPL 2026 AUCTION SQUAD", 40, 44);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.fillText(input.shortName, 40, 100);

  ctx.font = "22px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`${input.teamName} · ${input.ownerName}`, 40, 132);

  ctx.font = "18px Arial, sans-serif";
  ctx.fillText(
    `${players.length}/${MAX_SQUAD_SIZE} · OS ${overseas}/${MAX_OVERSEAS} · Spent ${formatPrice(totalSpent)} · Purse ${formatPrice(input.purseLeft)}`,
    40,
    162,
  );

  let y = headerHeight + 12;
  for (const g of grouped) {
    ctx.fillStyle = "#22C55E";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(`${g.label} (${g.players.length})`, 40, y + 22);
    y += sectionHeaderHeight;

    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      const isRetained = input.retainedIds?.has(p.id);
      const price = input.soldPrices?.[p.id] ?? p.basePriceLakhs ?? 0;

      ctx.fillStyle = i % 2 === 0 ? "#14141A" : "#101015";
      ctx.fillRect(32, y, width - 64, rowHeight - 4);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "20px Arial, sans-serif";
      const nameLines = wrapText(ctx, p.name, width - 280);
      ctx.fillText(nameLines[0], 48, y + 26);

      if (p.isOverseas || isRetained) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "14px Arial, sans-serif";
        const tags = [p.isOverseas ? "OS" : "", isRetained ? "RET" : ""].filter(Boolean).join(" · ");
        ctx.fillText(tags, 48, y + 36);
      }

      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatPrice(price), width - 48, y + 28);
      ctx.textAlign = "left";

      y += rowHeight;
    }
    y += 8;
  }

  ctx.fillStyle = "#6B7280";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("IPL 2026 Auction · Share your squad", 40, height - 32);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}

export async function downloadSquadShareImage(input: SquadShareInput, filename?: string): Promise<void> {
  const blob = await generateSquadShareImage(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${input.shortName}-squad-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareSquadImage(input: SquadShareInput, filename?: string): Promise<"shared" | "downloaded"> {
  const blob = await generateSquadShareImage(input);
  const file = new File([blob], filename || `${input.shortName}-squad.png`, { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `${input.shortName} IPL 2026 Squad`,
      text: `${input.ownerName}'s ${input.shortName} squad — ${input.players.length} players`,
      files: [file],
    });
    return "shared";
  }

  await downloadSquadShareImage(input, filename);
  return "downloaded";
}
