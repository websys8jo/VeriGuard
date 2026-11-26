"use client";

import { MODEL_LABELS } from "@/lib/p2/models";
import type { MatrixResponse } from "@/lib/p2/useP2Data";

interface Props {
  matrix: MatrixResponse;
  selected: { model: string; ruleId: string } | null;
  onSelectCell: (model: string, ruleId: string) => void;
}

function accuracyColor(acc: number | null): string {
  if (acc === null) return "bg-neutral-100 text-neutral-400 dark:bg-neutral-900";
  if (acc >= 0.8) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (acc >= 0.6) return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
}

export function JudgmentMatrix({ matrix, selected, onSelectCell }: Props) {
  const cellByKey = new Map(matrix.cells.map((c) => [`${c.model}\u0000${c.ruleId}`, c]));

  return (
    <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-neutral-50 p-2 text-left font-medium dark:bg-neutral-900">모델 \ 규칙</th>
            {matrix.categories.map((c) => (
              <th key={c.id} className="min-w-[110px] border-l border-neutral-200 p-2 text-left font-normal dark:border-neutral-800">
                <div className="line-clamp-2" title={c.ruleText}>
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
                <td className="sticky left-0 bg-white p-2 font-medium dark:bg-neutral-950">
                  {MODEL_LABELS[model]}
                  {!rowHasData && <span className="ml-1 text-[10px] text-neutral-400">(데이터 준비 중)</span>}
                </td>
                {matrix.categories.map((c) => {
                  const cell = cellByKey.get(`${model}\u0000${c.id}`);
                  const isSelected = selected?.model === model && selected?.ruleId === c.id;
                  return (
                    <td
                      key={c.id}
                      className={`border-l border-neutral-200 p-0 dark:border-neutral-800 ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""}`}
                    >
                      {cell ? (
                        <button
                          onClick={() => onSelectCell(model, c.id)}
                          className={`block w-full p-2 text-left hover:opacity-80 ${accuracyColor(cell.accuracy)}`}
                        >
                          <div className="font-mono">
                            {cell.accuracy !== null ? `${(cell.accuracy * 100).toFixed(0)}%` : "–"}
                          </div>
                          <div className="text-[10px] opacity-70">n={cell.n}</div>
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
      <div className="flex items-center gap-3 border-t border-neutral-200 p-2 text-[11px] text-neutral-500 dark:border-neutral-800">
        <span>칸 색상 = 사람 라벨과의 일치율</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-emerald-200" />≥80%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-amber-200" />60–80%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-red-200" />&lt;60%
        </span>
      </div>
    </div>
  );
}
