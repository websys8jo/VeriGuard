"use client";

import { useEffect, useMemo, useState } from "react";
import type { RuleNode } from "@/lib/rules/tree";
import { ancestorsOf } from "@/lib/rules/tree";
import { findDivergence, runBfs } from "@/lib/rules/bfs";
import { useTextDetail } from "@/lib/rules/useP1Data";

interface Props {
  textId: string;
  rules: RuleNode[];
  tau: number;
  onBfsComputed: (info: {
    pathIds: Set<string>;
    goldIds: Set<string>;
    divergeRuleId: string | null;
  }) => void;
}

export function TextDetail({ textId, rules, tau, onBfsComputed }: Props) {
  const { data, loading, error } = useTextDetail(textId);
  const [revealed, setRevealed] = useState(false);

  const computed = useMemo(() => {
    if (!data) return null;
    const simRows = data.similarity.map((s) => ({ ruleId: s.rule_id, level: s.level, score: s.score }));
    const source = data.text.source;
    const bfs = runBfs(simRows, rules, source, tau);
    const goldPath = data.text.gold_rule_id ? ancestorsOf(rules, data.text.gold_rule_id) : [];
    const { divergeLevel } = findDivergence(bfs.path, goldPath);

    let divergeRuleId: string | null = null;
    for (let i = 0; i < Math.max(bfs.path.length, goldPath.length); i++) {
      if (bfs.path[i]?.id !== goldPath[i]?.id) {
        divergeRuleId = bfs.path[i]?.id ?? goldPath[i]?.id ?? null;
        break;
      }
    }

    const scoreOf = new Map(data.similarity.map((s) => [s.rule_id, s.score]));
    return { bfs, goldPath, divergeLevel, divergeRuleId, scoreOf };
  }, [data, rules, tau]);

  useEffect(() => {
    if (!computed) return;
    onBfsComputed({
      pathIds: new Set(computed.bfs.path.map((n) => n.id)),
      goldIds: new Set(computed.goldPath.map((n) => n.id)),
      divergeRuleId: computed.divergeRuleId,
    });
    // onBfsComputed identity is expected to be stable (memoized by the parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  if (loading) return <div className="p-4 text-sm text-neutral-500">불러오는 중…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;
  if (!data || !computed) return null;

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-neutral-500">{data.text.id}</div>
        <div className="text-xs">
          사람 라벨: <span className="font-medium">{data.text.human_label}</span>
        </div>
      </div>

      {data.text.context && (
        <div className="rounded bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          맥락: {data.text.context}
        </div>
      )}

      <div>
        {revealed ? (
          <p className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-sm dark:border-red-900 dark:bg-red-950">
            {data.text.raw_text}
          </p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded border border-dashed border-neutral-300 p-2 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            유해할 수 있는 원문 — 누르면 표시
          </button>
        )}
      </div>

      <div>
        <div className="mb-1 font-medium">
          {computed.divergeLevel === null ? "✅ BFS가 정답 규칙을 찾음" : `⚠️ ${computed.divergeLevel} 단계에서 갈라짐`}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-500">
              <th className="text-left font-normal">단계</th>
              <th className="text-left font-normal">BFS 경로 (유사도)</th>
              <th className="text-left font-normal">정답 경로 (유사도)</th>
            </tr>
          </thead>
          <tbody>
            {["major", "mid", "minor"].map((level) => {
              const bfsNode = computed.bfs.path.find((n) => n.level === level);
              const goldNode = computed.goldPath.find((n) => n.level === level);
              if (!bfsNode && !goldNode) return null;
              const diff = bfsNode?.id !== goldNode?.id;
              const bfsScore = bfsNode ? computed.scoreOf.get(bfsNode.id) : undefined;
              const goldScore = goldNode ? computed.scoreOf.get(goldNode.id) : undefined;
              return (
                <tr key={level} className={diff ? "bg-red-50 dark:bg-red-950" : ""}>
                  <td className="py-0.5 pr-2 text-neutral-500">{level}</td>
                  <td className="py-0.5 pr-2">
                    {bfsNode?.ruleText ?? "–"}
                    {bfsScore !== undefined && (
                      <span className="ml-1 font-mono text-neutral-400">({bfsScore.toFixed(3)})</span>
                    )}
                  </td>
                  <td className="py-0.5">
                    {goldNode?.ruleText ?? "–"}
                    {goldScore !== undefined && (
                      <span className="ml-1 font-mono text-neutral-400">({goldScore.toFixed(3)})</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-500">
        방문 노드 {computed.bfs.nodesVisited}/{computed.bfs.totalNodes} (효율{" "}
        {((computed.bfs.nodesVisited / computed.bfs.totalNodes) * 100).toFixed(0)}%)
      </div>
    </div>
  );
}
