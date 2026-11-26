import { interpolateRdYlGn } from "d3-scale-chromatic";

/** value in [0,1] -> "rgb(r, g, b)", red (bad) -> yellow -> green (good). */
export function diverging(value: number): string {
  return interpolateRdYlGn(Math.max(0, Math.min(1, value)));
}

/** Pick readable text color (black/white) for an "rgb(r, g, b)" background. */
export function textOn(rgb: string): string {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return "#111111";
  const [r, g, b] = m.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

/** Sampled CSS gradient stops for a legend bar, red -> yellow -> green. */
export function gradientCss(steps = 9): string {
  const stops = Array.from({ length: steps }, (_, i) => diverging(i / (steps - 1)));
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
