import { Player } from "./types";
import { formatPrice, TOTAL_PURSE, MAX_SQUAD_SIZE } from "./constants";

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

export async function generateSquadShareImage(input: SquadShareInput): Promise<Blob> {
  const width = 1080;
  const rowHeight = 44;
  const headerHeight = 220;
  const footerHeight = 100;
  const players = input.players.slice(0, MAX_SQUAD_SIZE);
  const height = headerHeight + players.length * rowHeight + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const totalSpent = TOTAL_PURSE - input.purseLeft;
  const purseLeft = input.purseLeft;

  ctx.fillStyle = "#0B0B0F";
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, headerHeight);
  grad.addColorStop(0, input.primaryColor);
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, headerHeight);

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.fillText("IPL 2026 AUCTION SQUAD", 40, 48);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.fillText(input.shortName, 40, 110);

  ctx.font = "24px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`${input.teamName} · ${input.ownerName}`, 40, 148);

  ctx.font = "20px Arial, sans-serif";
  ctx.fillText(
    `${players.length}/${MAX_SQUAD_SIZE} players · Spent ${formatPrice(totalSpent)} · Left ${formatPrice(purseLeft)} / ${formatPrice(TOTAL_PURSE)}`,
    40,
    182,
  );

  let y = headerHeight + 8;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const isRetained = input.retainedIds?.has(p.id);
    const price = isRetained
      ? (input.soldPrices?.[p.id] ?? p.basePriceLakhs ?? 0)
      : (input.soldPrices?.[p.id] ?? p.basePriceLakhs ?? 0);

    ctx.fillStyle = i % 2 === 0 ? "#14141A" : "#101015";
    ctx.fillRect(32, y, width - 64, rowHeight - 4);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.fillText(String(i + 1).padStart(2, "0"), 48, y + 28);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "22px Arial, sans-serif";
    const nameLines = wrapText(ctx, p.name, width - 420);
    ctx.fillText(nameLines[0], 88, y + 28);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "16px Arial, sans-serif";
    const roleTag = `${p.role}${p.isOverseas ? " · OS" : ""}${isRetained ? " · RET" : ""}`;
    ctx.fillText(roleTag, 88, y + 40);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 22px Arial, sans-serif";
    const priceText = formatPrice(price);
    ctx.textAlign = "right";
    ctx.fillText(priceText, width - 48, y + 30);
    ctx.textAlign = "left";

    y += rowHeight;
  }

  ctx.fillStyle = "#6B7280";
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("IPL 2026 Auction · Share your squad", 40, height - 36);

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
