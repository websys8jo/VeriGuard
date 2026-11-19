"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { useBoundaryCases, useNodeStats, useRules, useTauGrid } from "@/lib/rules/useP1Data";
import { RuleTree } from "./RuleTree";
import { RuleNodePanel } from "./RuleNodePanel";
import { TauSlider } from "./TauSlider";
import { TextPicker } from "./TextPicker";
import { TextDetail } from "./TextDetail";

export function RulesView() {
  const { filters, setFilters, selectedTextId, setSelectedTextId } = useAppStore();
  const [tau, setTau] = useState(0.3);
  const [treeSource, setTreeSource] = useState<"dna" | "jigsaw">("dna");
  const [overlay, setOverlay] = useState<{
    pathIds: Set<string>;
    goldIds: Set<string>;
    divergeRuleId: string | null;
  }>({ pathIds: new Set(), goldIds: new Set(), divergeRuleId: null });

  const { data: rules } = useRules();
  const { data: tauGrid } = useTauGrid();
  const { data: nodeStatsResp } = useNodeStats(tau);
  const { data: boundaryCases } = useBoundaryCases(tau);

  const source = filters.source === "jigsaw" ? "jigsaw" : filters.source === "dna" ? "dna" : treeSource;
  const split = filters.split === "test" ? "test" : "dev";

  const handleBfsComputed = useCallback((info: typeof overlay) => setOverlay(info), []);

  const nodeAccuracy = new Map(
    (nodeStatsResp?.stats ?? []).map((s) => [s.rule_id, { nGold: s.n_gold, nCorrect: s.n_correct }]),
  );

  if (!rules) {
    return <div className="p-8 text-sm text-neutral-500">규칙 트리 불러오는 중…</div>;
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr_360px] gap-4 p-4">
      {/* left: text picker */}
      <div className="overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
        <TextPicker
          source={filters.source !== "all" ? filters.source : undefined}
          split={filters.split !== "all" ? filters.split : undefined}
          goldRuleId={filters.ruleId}
          selectedId={selectedTextId}
          onSelect={setSelectedTextId}
        />
      </div>

      {/* center: tree + tau slider */}
      <div className="flex flex-col gap-4 overflow-y-auto">
        <TauSlider tau={tau} onChange={setTau} tauGrid={tauGrid} source={source} split={split} />

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setTreeSource("dna")}
            className={`rounded px-2 py-1 ${treeSource === "dna" ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black" : "bg-neutral-100 dark:bg-neutral-800"}`}
          >
            Do-Not-Answer
          </button>
          <button
            onClick={() => setTreeSource("jigsaw")}
            className={`rounded px-2 py-1 ${treeSource === "jigsaw" ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black" : "bg-neutral-100 dark:bg-neutral-800"}`}
          >
            Jigsaw
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded border border-neutral-200 p-2 dark:border-neutral-800">
          <RuleTree
            rules={rules}
            source={treeSource}
            bfsPathIds={selectedTextId ? overlay.pathIds : new Set()}
            goldPathIds={selectedTextId ? overlay.goldIds : new Set()}
            divergeRuleId={selectedTextId ? overlay.divergeRuleId : null}
            nodeAccuracy={nodeAccuracy}
            onSelectRule={(ruleId) => setFilters({ ruleId })}
            selectedRuleId={filters.ruleId}
          />
        </div>

        {filters.ruleId &&
          (() => {
            const selectedRule = rules.find((r) => r.id === filters.ruleId);
            if (!selectedRule) return null;
            return (
              <RuleNodePanel
                rule={selectedRule}
                tau={tau}
                onClose={() => setFilters({ ruleId: null })}
                onSelectText={setSelectedTextId}
              />
            );
          })()}

        {boundaryCases && boundaryCases.length > 0 && (
          <div className="rounded border border-amber-200 p-2 text-xs dark:border-amber-900">
            <div className="mb-1 font-medium">
              경계 사례 ({boundaryCases.length}건) — τ를 조금만 바꿔도 결과가 달라지는 텍스트
            </div>
            <div className="flex flex-wrap gap-1">
              {boundaryCases.slice(0, 30).map((b) => (
                <button
                  key={b.text_id}
                  onClick={() => setSelectedTextId(b.text_id)}
                  className="rounded bg-amber-100 px-1.5 py-0.5 font-mono hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900"
                >
                  {b.text_id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* right: text detail */}
      <div className="overflow-y-auto rounded border border-neutral-200 dark:border-neutral-800">
        {selectedTextId ? (
          <TextDetail textId={selectedTextId} rules={rules} tau={tau} onBfsComputed={handleBfsComputed} />
        ) : (
          <div className="p-4 text-sm text-neutral-500">왼쪽에서 텍스트를 선택하세요.</div>
        )}
      </div>
    </div>
  );
}
