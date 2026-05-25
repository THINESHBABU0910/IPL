const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 min — Render free tier sleeps ~15 min idle

export function startClientKeepAlive(): () => void {
  if (typeof window === "undefined") return () => {};

  const ping = () => {
    fetch("/api/health", { cache: "no-store" }).catch(() => {});
  };

  ping();
  const id = window.setInterval(() => {
    if (document.visibilityState === "visible") ping();
  }, PING_INTERVAL_MS);

  const onVisible = () => ping();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
