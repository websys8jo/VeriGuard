"use client";

import { useState } from "react";
import { BASELINE_MODELS, MODEL_SHORT_LABELS } from "@/lib/p2/models";
import { useCellTexts } from "@/lib/p2/useP2Data";

interface Props {
  ruleId: string;
  source: string;
  split: string;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

function LabelChip({ label }: { label: "violation" | "normal" | null }) {
  if (!label) {
    return <span className="text-[11px] text-neutral-400">–</span>;
  }
  const isViolation = label === "violation";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        isViolation
          ? "bg-status-critical/10 text-status-critical"
          : "bg-status-good/10 text-status-good"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: isViolation ? "var(--status-critical)" : "var(--status-good)" }} />
      {label}
    </span>
  );
}

export function CellTextList({ ruleId, source, split, selectedTextId, onSelectText }: Props) {
  const { data, loading, error } = useCellTexts({ ruleId, source, split });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  if (loading) return <div className="p-3 text-xs text-neutral-500">텍스트 불러오는 중…</div>;
  if (error) return <div className="p-3 text-xs text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900/60">
        이 칸의 텍스트 <span className="font-mono tabular-nums text-neutral-500">({data.total}건)</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="sticky top-0 z-10 bg-neutral-50 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <th className="p-2 text-left font-normal">텍스트</th>
              <th className="p-2 text-left font-normal">사람 라벨</th>
              {BASELINE_MODELS.map((m) => (
                <th key={m} className="p-2 text-right font-normal">
                  {MODEL_SHORT_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.id}
                className={`cursor-pointer border-t border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${
                  selectedTextId === item.id ? "bg-accent/5" : ""
                }`}
                onClick={() => onSelectText(selectedTextId === item.id ? null : item.id)}
              >
                <td className="max-w-[280px] p-2">
                  <div className="font-mono text-[10px] text-neutral-400">{item.id}</div>
                  {revealed.has(item.id) ? (
                    <div className="mt-0.5 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{item.rawText}</div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealed((prev) => new Set(prev).add(item.id));
                      }}
                      className="mt-0.5 rounded border border-dashed border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      원문 표시
                    </button>
                  )}
                </td>
                <td className="p-2">
                  <LabelChip label={item.humanLabel} />
                </td>
                {BASELINE_MODELS.map((m) => {
                  const p = item.probs[m];
                  return (
                    <td key={m} className="p-2 text-right font-mono tabular-nums">
                      {p === null || p === undefined ? (
                        <span className="text-neutral-300 dark:text-neutral-700">–</span>
                      ) : (
                        <span className={p >= 0.5 ? "font-medium text-status-critical" : "text-neutral-500 dark:text-neutral-400"}>
                          {p.toFixed(2)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
