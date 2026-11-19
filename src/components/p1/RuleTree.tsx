"use client";

import type { RuleNode } from "@/lib/rules/tree";
import { childrenOf, rootsOf } from "@/lib/rules/tree";

interface Props {
  rules: RuleNode[];
  source: "dna" | "jigsaw";
  bfsPathIds: Set<string>;
  goldPathIds: Set<string>;
  divergeRuleId: string | null; // the exact node where bfs and gold first differ
  nodeAccuracy: Map<string, { nGold: number; nCorrect: number }>;
  onSelectRule?: (ruleId: string) => void;
  selectedRuleId?: string | null;
}

function accuracyColor(acc: { nGold: number; nCorrect: number } | undefined): string {
  if (!acc || acc.nGold === 0) return "bg-neutral-100 dark:bg-neutral-800";
  const rate = acc.nCorrect / acc.nGold;
  if (rate >= 0.7) return "bg-green-100 dark:bg-green-950";
  if (rate >= 0.4) return "bg-amber-100 dark:bg-amber-950";
  return "bg-red-100 dark:bg-red-950";
}

function Node({
  node,
  rules,
  depth,
  bfsPathIds,
  goldPathIds,
  divergeRuleId,
  nodeAccuracy,
  onSelectRule,
  selectedRuleId,
}: {
  node: RuleNode;
  rules: RuleNode[];
  depth: number;
} & Omit<Props, "rules" | "source">) {
  const children = childrenOf(rules, node.id);
  const isBfs = bfsPathIds.has(node.id);
  const isGold = goldPathIds.has(node.id);
  const isDiverge = divergeRuleId === node.id;
  const acc = nodeAccuracy.get(node.id);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <button
        onClick={() => onSelectRule?.(node.id)}
        className={`my-0.5 flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${accuracyColor(acc)} ${
          selectedRuleId === node.id ? "ring-2 ring-blue-500" : ""
        } ${isDiverge ? "ring-2 ring-red-500" : ""}`}
      >
        <span className="truncate">{node.ruleText}</span>
        {isGold && <span className="shrink-0 rounded bg-blue-600 px-1 text-[10px] text-white">정답</span>}
        {isBfs && <span className="shrink-0 rounded bg-purple-600 px-1 text-[10px] text-white">BFS</span>}
        {acc && acc.nGold > 0 && (
          <span className="ml-auto shrink-0 text-[10px] text-neutral-500">
            {acc.nCorrect}/{acc.nGold}
          </span>
        )}
      </button>
      {children.map((c) => (
        <Node
          key={c.id}
          node={c}
          rules={rules}
          depth={depth + 1}
          bfsPathIds={bfsPathIds}
          goldPathIds={goldPathIds}
          divergeRuleId={divergeRuleId}
          nodeAccuracy={nodeAccuracy}
          onSelectRule={onSelectRule}
          selectedRuleId={selectedRuleId}
        />
      ))}
    </div>
  );
}

export function RuleTree({ rules, source, ...rest }: Props) {
  const roots = rootsOf(rules, source);
  return (
    <div className="space-y-0.5">
      {roots.map((r) => (
        <Node key={r.id} node={r} rules={rules} depth={0} {...rest} />
      ))}
    </div>
  );
}
