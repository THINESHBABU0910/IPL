/** Strip quota suffixes and normalize spacing from pasted squad lines */
export function sanitizePlayerName(name: string): string {
  return name
    .replace(/\s*-\s*$/, "")
    .replace(/[:\-]\s*\d+(?:\s*,\s*\d+)*\s*overs?\b/gi, "")
    .replace(/\(\s*\d+(?:\s*,\s*\d+)*\s*overs?\s*\)/gi, "")
    .replace(/\(\s*\d+(?:\s*,\s*\d+)*\s*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean dismissal text — remove accidental ":4 overs" quota fragments from LLM output */
export function sanitizeDismissalStatus(status: string): string {
  if (/not out/i.test(status)) return "not out";
  return status
    .replace(/[:\-]\s*\d+\s*overs?\b/gi, "")
    .replace(/\s+b\s+([^,]+?)\s*[:\-]\s*\d+/gi, " b $1")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  const na = sanitizePlayerName(a).toLowerCase();
  const nb = sanitizePlayerName(b).toLowerCase();
  return na === nb || na.includes(nb) || nb.includes(na);
}
