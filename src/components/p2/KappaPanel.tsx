"use client";

import { motion } from "framer-motion";
import { BASELINE_MODELS, MODEL_SHORT_LABELS } from "@/lib/p2/models";
import { kappaLabel } from "@/lib/p2/statusTier";
import type { KappaResponse } from "@/lib/p2/useP2Data";
import { Heatmap, HeatmapLegend, type HeatCell } from "./Heatmap";

export function KappaPanel({ kappa }: { kappa: KappaResponse }) {
  const byPair = new Map<string, number>();
  for (const p of kappa.pairs) {
    if (p.n === 0) continue;
    byPair.set(`${p.modelA}\u0000${p.modelB}`, p.kappa);
    byPair.set(`${p.modelB}\u0000${p.modelA}`, p.kappa);
  }
  const anyData = byPair.size > 0;

  const nodes = BASELINE_MODELS.map((m) => ({ id: m, label: MODEL_SHORT_LABELS[m] }));
  const order = BASELINE_MODELS;

  function cell(a: string, b: string): HeatCell | undefined {
    const k = byPair.get(`${a}\u0000${b}`);
    if (k === undefined) return { value: null, display: "–" };
    const normalized = Math.max(0, Math.min(1, k));
    return {
      value: normalized,
      display: k.toFixed(2),
      title: `κ=${k.toFixed(3)} · ${kappaLabel(k)}`,
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">모델 간 일치도 (Cohen&apos;s κ)</span>
        {!kappa.cached && <span className="text-[10px] text-neutral-400">실시간 계산</span>}
      </div>

      {!anyData ? (
        <div className="py-6 text-center text-xs text-neutral-400">
          겹치는 판정 데이터가 없습니다
          <br />
          (team_judge 준비 중)
        </div>
      ) : (
        <>
          <Heatmap
            rows={nodes}
            cols={nodes}
            cell={cell}
            skip={(a, b) => order.indexOf(a as (typeof order)[number]) >= order.indexOf(b as (typeof order)[number])}
            rowHeaderWidth={64}
            minColWidth={48}
          />
          <div className="mt-2">
            <HeatmapLegend lowLabel="0" highLabel="1" caption="κ" />
          </div>
        </>
      )}
    </motion.div>
  );
}
