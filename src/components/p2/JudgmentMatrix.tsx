"use client";

import { motion } from "framer-motion";
import { MODEL_LABELS } from "@/lib/p2/models";
import type { MatrixResponse } from "@/lib/p2/useP2Data";
import { Heatmap, HeatmapLegend, type HeatCell } from "./Heatmap";

interface Props {
  matrix: MatrixResponse;
  selected: { model: string; ruleId: string } | null;
  onSelectCell: (model: string, ruleId: string) => void;
}

export function JudgmentMatrix({ matrix, selected, onSelectCell }: Props) {
  const cellByKey = new Map(matrix.cells.map((c) => [`${c.model}\u0000${c.ruleId}`, c]));

  const rows = matrix.models.map((m) => {
    const hasData = matrix.categories.some((c) => cellByKey.get(`${m}\u0000${c.id}`)?.n);
    return { id: m, label: hasData ? MODEL_LABELS[m] : `${MODEL_LABELS[m]} (준비 중)` };
  });

  const cols = matrix.categories.map((c) => ({ id: c.id, label: c.ruleText, badge: c.source }));

  function cell(modelId: string, ruleId: string): HeatCell | undefined {
    const c = cellByKey.get(`${modelId}\u0000${ruleId}`);
    if (!c) return { value: null, display: "–" };
    return {
      value: c.accuracy,
      display: c.accuracy !== null ? `${(c.accuracy * 100).toFixed(0)}%` : "–",
      sub: `n=${c.n}`,
      title: `${MODEL_LABELS[modelId as keyof typeof MODEL_LABELS]} · ${c.n}건 중 사람 라벨과 ${(((c.accuracy ?? 0) * 100)).toFixed(0)}% 일치`,
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="text-sm font-medium">모델 × 규칙 행렬</div>
        <HeatmapLegend lowLabel="0%" highLabel="100%" caption="사람 라벨과의 일치율" />
      </div>
      <div className="overflow-x-auto p-3">
        <Heatmap
          rows={rows}
          cols={cols}
          cornerLabel="모델 \ 규칙"
          cell={cell}
          selected={selected ? { row: selected.model, col: selected.ruleId } : null}
          onSelectCell={onSelectCell}
          rowHeaderWidth={140}
          minColWidth={100}
        />
      </div>
    </motion.div>
  );
}
