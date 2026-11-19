"use client";

import type { RuleNode } from "@/lib/rules/tree";
import { useRuleTexts, useTexts } from "@/lib/rules/useP1Data";

interface Props {
  rule: RuleNode;
  tau: number;
  onClose: () => void;
  onSelectText: (id: string) => void;
}

export function RuleNodePanel({ rule, tau, onClose, onSelectText }: Props) {
  const { data: goldTexts } = useTexts({ source: rule.source, goldRuleId: rule.id, limit: 50 });
  const { data: foundResp } = useRuleTexts(rule.id, tau);

  return (
    <div className="rounded border border-blue-200 p-2 text-xs dark:border-blue-900">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="font-medium">{rule.ruleText}</div>
        <button onClick={onClose} className="shrink-0 text-neutral-400 hover:text-neutral-700">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-neutral-500">정답인 텍스트 ({goldTexts?.length ?? "…"})</div>
          <div className="flex flex-wrap gap-1">
            {goldTexts?.slice(0, 20).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectText(t.id)}
                className="rounded bg-blue-100 px-1.5 py-0.5 font-mono hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900"
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-neutral-500">
            BFS가 찾은 텍스트, τ={tau.toFixed(2)} ({foundResp?.texts.length ?? "…"})
          </div>
          <div className="flex flex-wrap gap-1">
            {foundResp?.texts.slice(0, 20).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectText(t.id)}
                className="rounded bg-purple-100 px-1.5 py-0.5 font-mono hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900"
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
