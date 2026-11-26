/** Landis & Koch interpretation bands for Cohen's kappa. */
export function kappaLabel(k: number): string {
  if (k >= 0.8) return "거의 완벽";
  if (k >= 0.6) return "상당히 일치";
  if (k >= 0.4) return "보통";
  if (k >= 0.2) return "약한 일치";
  return "거의 안 맞음";
}
