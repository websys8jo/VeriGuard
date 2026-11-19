export const TAU_GRID_STEP = 0.02;
export const TAU_GRID_MIN = 0;
export const TAU_GRID_MAX = 0.6;

export function snapToGrid(tau: number): number {
  const snapped = Math.round(tau / TAU_GRID_STEP) * TAU_GRID_STEP;
  return Math.round(snapped * 100) / 100; // avoid float noise like 0.2 -> 0.19999999999999998
}
