/**
 * Marquee players — IPL 2026 mega auction (2 sets × 20 = 40).
 * Regenerate: node scripts/fix-player-data.mjs
 */
export const MARQUEE_M1_IDS: readonly string[] = [
  "P406", "P386", "P501", "P389", "P521", "P423", "P468", "P370", "P487", "P453", "P505", "P409", "P457", "P001", "P003", "P077", "P005", "P388", "P499", "P454", "P500", "P407", "P488", "P446", "P390"
] as const;

export const MARQUEE_M2_IDS: readonly string[] = [
  "P387", "P511", "P434", "P512", "P538", "P476", "P475", "P029", "P030", "P392", "P452", "P516", "P448", "P378", "P471", "P427", "P456", "P008", "P010", "P011", "P013", "P473", "P528", "P002", "P461"
] as const;

export const MARQUEE_PLAYER_IDS: readonly string[] = [
  ...MARQUEE_M1_IDS,
  ...MARQUEE_M2_IDS,
] as const;

export const MARQUEE_SETS = ["M1", "M2"] as const;
export const MARQUEE_SIZE = 50;
export const MARQUEE_SET_SIZE = 25;

/** @deprecated use MARQUEE_SETS */
export const MARQUEE_SET = "M1";
