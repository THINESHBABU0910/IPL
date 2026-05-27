import { Player, BidResult, DraftState, DraftTeamSlot } from "../lib/types";
import {
  validateDraftPick,
  allTeamsMeetDraftMinimum,
  countActiveDraftTeams,
  DRAFT_SQUAD_MIN,
} from "../lib/draftRules";
import { getDraftPoolPlayersForGender, getDraftPlayerById } from "../lib/draftPlayerPool";
import type { Room } from "./gameState";

function shuffleIds(ids: string[], seed: number): string[] {
  const out = [...ids];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getClaimedDraftTeamIds(room: Room): string[] {
  const ids: string[] = [];
  for (const team of room.teams.values()) {
    if (team.ownerId && !team.isVacant) ids.push(team.id);
  }
  return ids;
}

export function createInitialDraftState(room: Room): DraftState {
  const gender = room.draftGender || "mens";
  const players = getDraftPoolPlayersForGender(gender);
  const teamIds = getClaimedDraftTeamIds(room);
  const pickOrder = shuffleIds(teamIds, Date.now());

  return {
    cycle: 1,
    roundDirection: "forward",
    pickOrder,
    currentPickIndex: 0,
    currentPickerId: pickOrder[0] || null,
    pickNumber: 1,
    availablePlayerIds: players.map((p) => p.id),
    deferredPicks: {},
    catchupQueue: [],
    catchupIndex: 0,
    inCatchup: false,
    timerSeconds: room.pickTimerSeconds,
    timerEndsAt: null,
    isPaused: false,
    picks: [],
  };
}

function syncPickerFromIndex(draft: DraftState): void {
  if (draft.inCatchup) {
    draft.currentPickerId = draft.catchupQueue[draft.catchupIndex] || null;
    return;
  }
  const order = draft.pickOrder;
  if (!order.length) {
    draft.currentPickerId = null;
    return;
  }
  const idx = draft.currentPickIndex;
  draft.currentPickerId = order[idx] ?? null;
}

export function resetDraftTimer(room: Room): void {
  if (!room.draft) return;
  room.draft.timerSeconds = room.pickTimerSeconds;
  room.draft.timerEndsAt = Date.now() + room.pickTimerSeconds * 1000;
}

function getDraftedIds(room: Room): Set<string> {
  const ids = new Set<string>();
  for (const team of room.teams.values()) {
    for (const p of team.squad) ids.add(p.id);
  }
  return ids;
}

export function processDraftPick(room: Room, teamId: string, playerId: string): BidResult {
  const draft = room.draft;
  if (!draft || (room.auction.phase !== "draft" && room.auction.phase !== "catchup")) {
    return { success: false, reason: "Draft is not active" };
  }
  if (draft.isPaused) return { success: false, reason: "Draft is paused" };
  if (draft.currentPickerId !== teamId) {
    return { success: false, reason: "Not your turn to pick" };
  }

  const team = room.teams.get(teamId);
  if (!team || team.isVacant) {
    return { success: false, reason: "Team not found" };
  }

  const gender = room.draftGender || "mens";
  const player = getDraftPlayerById(gender, playerId);
  if (!player) return { success: false, reason: "Player not found" };
  if (!draft.availablePlayerIds.includes(playerId)) {
    return { success: false, reason: "Player not available" };
  }

  const draftedIds = getDraftedIds(room);
  const check = validateDraftPick(team, player, draftedIds);
  if (!check.ok) return { success: false, reason: check.reason };

  team.squad.push({ ...player, basePriceLakhs: 0, displayPrice: "—" });
  draft.availablePlayerIds = draft.availablePlayerIds.filter((id) => id !== playerId);
  draft.picks.push({
    player,
    teamId,
    pickNumber: draft.pickNumber,
    timestamp: Date.now(),
  });

  if (draft.inCatchup) {
    const prev = draft.deferredPicks[teamId] || 0;
    if (prev > 0) draft.deferredPicks[teamId] = prev - 1;
  }

  draft.pickNumber++;
  advanceDraftTurn(room);
  return { success: true };
}

function buildCatchupQueue(draft: DraftState): string[] {
  const pending: string[] = [];
  for (const [teamId, count] of Object.entries(draft.deferredPicks)) {
    for (let i = 0; i < count; i++) pending.push(teamId);
  }
  return shuffleIds(pending, Date.now());
}

function startCatchupPhase(room: Room): boolean {
  const draft = room.draft!;
  const queue = buildCatchupQueue(draft);
  if (!queue.length) return false;

  draft.inCatchup = true;
  draft.catchupQueue = queue;
  draft.catchupIndex = 0;
  room.auction.phase = "catchup";
  syncPickerFromIndex(draft);
  resetDraftTimer(room);
  return true;
}

function finishCatchupAndNewCycle(room: Room): void {
  const draft = room.draft!;
  draft.inCatchup = false;
  draft.catchupQueue = [];
  draft.catchupIndex = 0;
  draft.cycle++;
  const teamIds = getClaimedDraftTeamIds(room);
  draft.pickOrder = shuffleIds(teamIds, Date.now() + draft.cycle);
  draft.roundDirection = "forward";
  draft.currentPickIndex = 0;
  room.auction.phase = "draft";
  syncPickerFromIndex(draft);
  resetDraftTimer(room);
}

function advanceDraftTurn(room: Room): { orderShuffled?: boolean; enteredCatchup?: boolean } {
  const draft = room.draft!;
  const meta: { orderShuffled?: boolean; enteredCatchup?: boolean } = {};

  if (draft.inCatchup) {
    draft.catchupIndex++;
    if (draft.catchupIndex >= draft.catchupQueue.length) {
      const stillDeferred = Object.values(draft.deferredPicks).some((n) => n > 0);
      if (stillDeferred) {
        draft.catchupQueue = buildCatchupQueue(draft);
        draft.catchupIndex = 0;
      } else {
        meta.enteredCatchup = true;
        finishCatchupAndNewCycle(room);
        meta.orderShuffled = true;
        if (checkDraftComplete(room)) return meta;
        return meta;
      }
    }
    syncPickerFromIndex(draft);
    resetDraftTimer(room);
    return meta;
  }

  const n = draft.pickOrder.length;
  if (!n) {
    draft.currentPickerId = null;
    return meta;
  }

  if (draft.roundDirection === "forward") {
    if (draft.currentPickIndex < n - 1) {
      draft.currentPickIndex++;
    } else {
      draft.roundDirection = "reverse";
    }
  } else {
    if (draft.currentPickIndex > 0) {
      draft.currentPickIndex--;
    } else {
      if (startCatchupPhase(room)) {
        meta.enteredCatchup = true;
        return meta;
      }
      meta.orderShuffled = true;
      finishCatchupAndNewCycle(room);
      if (checkDraftComplete(room)) return meta;
    }
  }

  syncPickerFromIndex(draft);
  resetDraftTimer(room);
  return meta;
}

export function onDraftTimerExpired(room: Room): void {
  const draft = room.draft;
  if (!draft || draft.isPaused) return;
  const picker = draft.currentPickerId;
  if (!picker) return;

  draft.deferredPicks[picker] = (draft.deferredPicks[picker] || 0) + 1;
  advanceDraftTurn(room);
}

export function checkDraftComplete(room: Room): boolean {
  const draft = room.draft;
  if (!draft) return false;

  const active = countActiveDraftTeams(room.teams.values());
  if (active < 2) return false;

  if (!allTeamsMeetDraftMinimum(room.teams.values())) return false;

  const hasDeferred = Object.values(draft.deferredPicks).some((n) => n > 0);
  if (hasDeferred) return false;

  if (draft.availablePlayerIds.length === 0) {
    completeDraft(room);
    return true;
  }

  return false;
}

export function completeDraft(room: Room): void {
  room.auction.phase = "completed";
  if (room.draft) {
    room.draft.currentPickerId = null;
    room.draft.timerEndsAt = null;
  }
}

export function forceEndDraft(room: Room): { ok: boolean; reason?: string } {
  if (!allTeamsMeetDraftMinimum(room.teams.values())) {
    return { ok: false, reason: `All teams need at least ${DRAFT_SQUAD_MIN} players` };
  }
  completeDraft(room);
  return { ok: true };
}

export function skipDraftPick(room: Room): void {
  onDraftTimerExpired(room);
}

export function getCurrentPickerTeamName(room: Room): string {
  const id = room.draft?.currentPickerId;
  if (!id) return "";
  return room.teams.get(id)?.name || id;
}

export function syncDraftTeamSlotsToTeams(room: Room): void {
  if (!room.draftTeamSlots) return;
  for (const slot of room.draftTeamSlots) {
    const existing = room.teams.get(slot.id);
    const squad = existing?.squad || [];
    const retained = existing?.retainedPlayers || [];
    room.teams.set(slot.id, {
      id: slot.id,
      name: slot.name,
      shortName: slot.shortName,
      primaryColor: slot.primaryColor,
      secondaryColor: slot.secondaryColor,
      logo: slot.logoEmoji || slot.shortName.slice(0, 2),
      logoUrl: slot.logoUrl || "",
      purse: 0,
      squad,
      retainedPlayers: retained,
      rtmCards: 0,
      ownerId: slot.ownerId || "",
      ownerName: slot.ownerName || "",
      isReady: !!slot.ownerId,
      retentionLocked: true,
      isOnline: !!slot.ownerId,
      isVacant: slot.isVacant || !slot.ownerId,
    });
  }
}

export function updateSlotFromTeam(room: Room, teamId: string): void {
  const slot = room.draftTeamSlots?.find((s) => s.id === teamId);
  const team = room.teams.get(teamId);
  if (!slot || !team) return;
  slot.ownerId = team.ownerId;
  slot.ownerName = team.ownerName;
  slot.isVacant = team.isVacant;
  slot.name = team.name;
  slot.shortName = team.shortName;
  slot.primaryColor = team.primaryColor;
  slot.secondaryColor = team.secondaryColor;
  slot.logoUrl = team.logoUrl;
  slot.logoEmoji = team.logo;
}
