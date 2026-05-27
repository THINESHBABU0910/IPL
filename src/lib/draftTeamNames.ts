import type { DraftTeamSlot } from "./types";

const FANTASY_NAMES = [
  "Thunder Strikers", "Royal Challengers FC", "Super Kings XI", "Knight Riders",
  "Sunrise Warriors", "Titans United", "Fire Birds", "Storm Chasers",
  "Velocity XI", "Power Panthers", "Blaze Eagles", "Cyclone Crushers",
  "Midnight Mavericks", "Golden Gladiators", "Silver Sharks", "Iron Invincibles",
  "Neon Ninjas", "Cosmic Cobras", "Turbo Tigers", "Apex Avengers",
  "Dynamo Dragons", "Fusion Falcons", "Quantum Quicks", "Pulse Pioneers",
  "Zenith Zealots", "Nova Nomads", "Prism Predators", "Echo Enforcers",
  "Vortex Vikings", "Summit Strikers", "Horizon Hawks", "Legacy Lions",
  "Phoenix Phantoms", "Atlas Archers", "Comet Crusaders", "Orbit Owls",
  "Radiant Raptors", "Sonic Spartans", "Titan Troopers", "Wild Wolves",
];

const COLOR_PRESETS: { primary: string; secondary: string }[] = [
  { primary: "#FFD700", secondary: "#1A1A2E" },
  { primary: "#004BA0", secondary: "#FFD700" },
  { primary: "#D71920", secondary: "#000000" },
  { primary: "#ED1B24", secondary: "#000000" },
  { primary: "#FF6600", secondary: "#1A1A1A" },
  { primary: "#A020F0", secondary: "#FFD700" },
  { primary: "#0066CC", secondary: "#FFFFFF" },
  { primary: "#E31837", secondary: "#002D62" },
  { primary: "#00A651", secondary: "#FFD700" },
  { primary: "#FF1493", secondary: "#1A1A2E" },
];

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shortName(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

export function generateDraftTeamSlots(count = 10, seed = Date.now()): DraftTeamSlot[] {
  const names = shuffle(FANTASY_NAMES, seed).slice(0, count);
  const colors = shuffle(COLOR_PRESETS, seed + 1);
  return names.map((name, i) => {
    const c = colors[i % colors.length];
    return {
      id: `draft-${i + 1}-${seed.toString(36).slice(-4)}`,
      name,
      shortName: shortName(name),
      primaryColor: c.primary,
      secondaryColor: c.secondary,
      logoUrl: "",
      logoEmoji: "🏏",
      ownerId: "",
      ownerName: "",
      isCustom: true,
      isVacant: false,
    };
  });
}

export function createDraftTeamSlot(name: string, seed: number): DraftTeamSlot {
  const c = COLOR_PRESETS[seed % COLOR_PRESETS.length];
  return {
    id: `draft-custom-${seed}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    shortName: shortName(name),
    primaryColor: c.primary,
    secondaryColor: c.secondary,
    logoUrl: "",
    logoEmoji: "⚡",
    ownerId: "",
    ownerName: "",
    isCustom: true,
    isVacant: false,
  };
}

export function draftSlotToTeamState(slot: DraftTeamSlot): import("./types").TeamState {
  return {
    id: slot.id,
    name: slot.name,
    shortName: slot.shortName,
    primaryColor: slot.primaryColor,
    secondaryColor: slot.secondaryColor,
    logo: slot.logoEmoji || slot.shortName.slice(0, 2),
    logoUrl: slot.logoUrl || "",
    purse: 0,
    squad: [],
    retainedPlayers: [],
    rtmCards: 0,
    ownerId: slot.ownerId || "",
    ownerName: slot.ownerName || "",
    isReady: false,
    retentionLocked: true,
    isOnline: !!slot.ownerId,
    isVacant: slot.isVacant || !slot.ownerId,
  };
}
