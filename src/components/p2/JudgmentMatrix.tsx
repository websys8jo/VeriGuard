"use client";

import { MODEL_LABELS } from "@/lib/p2/models";
import { accuracyTier, STATUS_STYLE, type StatusTier } from "@/lib/p2/statusTier";
import type { MatrixResponse } from "@/lib/p2/useP2Data";

interface Props {
  matrix: MatrixResponse;
  selected: { model: string; ruleId: string } | null;
  onSelectCell: (model: string, ruleId: string) => void;
}

const LEGEND: { tier: StatusTier; label: string }[] = [
  { tier: "critical", label: "<50%" },
  { tier: "serious", label: "50–65%" },
  { tier: "warning", label: "65–80%" },
  { tier: "good", label: "≥80%" },
];

export function JudgmentMatrix({ matrix, selected, onSelectCell }: Props) {
  const cellByKey = new Map(matrix.cells.map((c) => [`${c.model}\u0000${c.ruleId}`, c]));

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="text-sm font-medium">모델 × 규칙 행렬</div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>사람 라벨과의 일치율</span>
          {LEGEND.map(({ tier, label }) => (
            <span key={tier} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_STYLE[tier].bg }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-neutral-50 p-2.5 text-left font-medium dark:bg-neutral-900">
                모델 \ 규칙
              </th>
              {matrix.categories.map((c) => (
                <th
                  key={c.id}
                  className="sticky top-0 z-10 min-w-[120px] border-l border-neutral-200 bg-neutral-50 p-2.5 text-left font-normal dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span
                    className={`mb-1 inline-block rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                      c.source === "dna"
                        ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        : "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-500"
                    }`}
                  >
                    {c.source}
                  </span>
                  <div className="line-clamp-2 text-neutral-700 dark:text-neutral-300" title={c.ruleText}>
                    {c.ruleText}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.models.map((model) => {
              const rowHasData = matrix.categories.some((c) => cellByKey.get(`${model}\u0000${c.id}`)?.n);
              return (
                <tr key={model} className={!rowHasData ? "opacity-40" : ""}>
                  <td className="sticky left-0 z-10 bg-white p-2.5 font-medium dark:bg-neutral-950">
                    {MODEL_LABELS[model]}
                    {!rowHasData && <div className="text-[10px] font-normal text-neutral-400">데이터 준비 중</div>}
                  </td>
                  {matrix.categories.map((c) => {
                    const cell = cellByKey.get(`${model}\u0000${c.id}`);
                    const isSelected = selected?.model === model && selected?.ruleId === c.id;
                    const tier = cell?.accuracy !== null && cell?.accuracy !== undefined ? accuracyTier(cell.accuracy) : null;
                    const style = tier ? STATUS_STYLE[tier] : null;

                    return (
                      <td
                        key={c.id}
                        className={`border-l border-neutral-200 p-1 align-top dark:border-neutral-800 ${
                          isSelected ? "bg-accent/5" : ""
                        }`}
                      >
                        {cell ? (
                          <button
                            onClick={() => onSelectCell(model, c.id)}
                            style={style ? { background: style.bg, color: style.fg } : undefined}
                            className={`block w-full rounded-lg p-2 text-left transition hover:brightness-110 ${
                              isSelected ? "ring-2 ring-accent ring-offset-1 ring-offset-white dark:ring-offset-neutral-950" : ""
                            } ${!style ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-900" : ""}`}
                          >
                            <div className="font-mono text-[13px] font-semibold tabular-nums">
                              {cell.accuracy !== null ? `${(cell.accuracy * 100).toFixed(0)}%` : "–"}
                            </div>
                            <div className="font-mono text-[10px] tabular-nums opacity-80">n={cell.n}</div>
                          </button>
                        ) : (
                          <div className="p-2 text-neutral-300 dark:text-neutral-700">–</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
