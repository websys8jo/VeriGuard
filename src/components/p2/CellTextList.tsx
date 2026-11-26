"use client";

import { useState } from "react";
import { BASELINE_MODELS, MODEL_LABELS } from "@/lib/p2/models";
import { useCellTexts } from "@/lib/p2/useP2Data";

interface Props {
  ruleId: string;
  source: string;
  split: string;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

export function CellTextList({ ruleId, source, split, selectedTextId, onSelectText }: Props) {
  const { data, loading, error } = useCellTexts({ ruleId, source, split });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  if (loading) return <div className="p-3 text-xs text-neutral-500">텍스트 불러오는 중…</div>;
  if (error) return <div className="p-3 text-xs text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 p-2 text-xs font-medium dark:border-neutral-800">
        이 칸의 텍스트 ({data.total}건)
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
              <th className="p-1.5 text-left font-normal">텍스트</th>
              <th className="p-1.5 text-left font-normal">사람 라벨</th>
              {BASELINE_MODELS.map((m) => (
                <th key={m} className="p-1.5 text-right font-normal">
                  {MODEL_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.id}
                className={`cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900 ${
                  selectedTextId === item.id ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
                onClick={() => onSelectText(selectedTextId === item.id ? null : item.id)}
              >
                <td className="max-w-[260px] p-1.5">
                  <div className="font-mono text-[10px] text-neutral-400">{item.id}</div>
                  {revealed.has(item.id) ? (
                    <div className="whitespace-pre-wrap">{item.rawText}</div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealed((prev) => new Set(prev).add(item.id));
                      }}
                      className="text-neutral-400 underline"
                    >
                      표시
                    </button>
                  )}
                </td>
                <td className="p-1.5">
                  <span className={item.humanLabel === "violation" ? "text-red-600" : "text-neutral-500"}>
                    {item.humanLabel ?? "–"}
                  </span>
                </td>
                {BASELINE_MODELS.map((m) => {
                  const p = item.probs[m];
                  return (
                    <td key={m} className="p-1.5 text-right font-mono">
                      {p === null || p === undefined ? (
                        <span className="text-neutral-300 dark:text-neutral-700">–</span>
                      ) : (
                        <span className={p >= 0.5 ? "text-red-600" : "text-neutral-500"}>{p.toFixed(2)}</span>
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
