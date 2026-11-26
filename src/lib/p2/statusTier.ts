// Fixed status palette (same hex in light & dark — see globals.css). Reused
// for any 0-1 "is this good or concerning" reading: accuracy tiers here,
// kappa agreement bands in KappaPanel. Never the only signal — every caller
// pairs this with the number itself as a visible label.
export type StatusTier = "good" | "warning" | "serious" | "critical";

export const STATUS_STYLE: Record<StatusTier, { bg: string; fg: string }> = {
  good: { bg: "var(--status-good)", fg: "#ffffff" },
  warning: { bg: "var(--status-warning)", fg: "#0b0b0b" },
  serious: { bg: "var(--status-serious)", fg: "#ffffff" },
  critical: { bg: "var(--status-critical)", fg: "#ffffff" },
};

/** Accuracy / agreement tiering: >=0.8 good, >=0.65 warning, >=0.5 serious, else critical. */
export function accuracyTier(value: number): StatusTier {
  if (value >= 0.8) return "good";
  if (value >= 0.65) return "warning";
  if (value >= 0.5) return "serious";
  return "critical";
}

/** Landis & Koch kappa bands, mapped onto the same 4-tier palette. */
export function kappaTier(k: number): StatusTier {
  if (k >= 0.6) return "good";
  if (k >= 0.4) return "warning";
  if (k >= 0.2) return "serious";
  return "critical";
}

export function kappaLabel(k: number): string {
  if (k >= 0.8) return "거의 완벽";
  if (k >= 0.6) return "상당히 일치";
  if (k >= 0.4) return "보통";
  if (k >= 0.2) return "약한 일치";
  return "거의 안 맞음";
}
