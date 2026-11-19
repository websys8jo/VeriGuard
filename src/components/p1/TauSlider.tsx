"use client";

import type { TauGridRow } from "@/lib/rules/useP1Data";

interface Props {
  tau: number;
  onChange: (tau: number) => void;
  tauGrid: TauGridRow[] | null;
  source: "dna" | "jigsaw";
  split: "dev" | "test";
}

export function TauSlider({ tau, onChange, tauGrid, source, split }: Props) {
  const row = tauGrid?.find(
    (r) => r.source === source && r.split === split && Math.abs(r.tau - tau) < 0.001,
  );

  const bestDevTau = tauGrid
    ?.filter((r) => r.source === source && r.split === "dev")
    .reduce<TauGridRow | null>((best, r) => (!best || r.topk1_acc > best.topk1_acc ? r : best), null);

  return (
    <div className="space-y-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">τ = {tau.toFixed(2)}</span>
        {bestDevTau && (
          <button
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => onChange(bestDevTau.tau)}
          >
            dev 최적 τ({bestDevTau.tau.toFixed(2)})로 설정
          </button>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={0.6}
        step={0.02}
        value={tau}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <div>top-1 정확도: {row ? `${(row.topk1_acc * 100).toFixed(1)}%` : "–"}</div>
        <div>top-3 정확도: {row ? `${(row.topk3_acc * 100).toFixed(1)}%` : "–"}</div>
        <div>효율: {row ? `${(row.efficiency * 100).toFixed(1)}%` : "–"}</div>
      </div>
      {row && <div className="text-[11px] text-neutral-400">n={row.n} ({split})</div>}
    </div>
  );
}
