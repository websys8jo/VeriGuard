"use client";

import { BASELINE_MODELS, MODEL_SHORT_LABELS, type ModelName } from "@/lib/p2/models";
import { kappaLabel, kappaTier, STATUS_STYLE } from "@/lib/p2/statusTier";
import type { KappaResponse } from "@/lib/p2/useP2Data";

export function KappaPanel({ kappa }: { kappa: KappaResponse }) {
  const byPair = new Map<string, number>();
  for (const p of kappa.pairs) {
    if (p.n === 0) continue;
    byPair.set(`${p.modelA}\u0000${p.modelB}`, p.kappa);
    byPair.set(`${p.modelB}\u0000${p.modelA}`, p.kappa);
  }
  const anyData = byPair.size > 0;

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
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
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `72px repeat(${BASELINE_MODELS.length}, minmax(0, 1fr))` }}
        >
          <div />
          {BASELINE_MODELS.map((m) => (
            <div key={m} className="px-0.5 pb-1 text-center text-[9px] leading-tight text-neutral-500 dark:text-neutral-400">
              {MODEL_SHORT_LABELS[m]}
            </div>
          ))}
          {BASELINE_MODELS.map((rowModel) => (
            <RowCells key={rowModel} rowModel={rowModel} byPair={byPair} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowCells({ rowModel, byPair }: { rowModel: ModelName; byPair: Map<string, number> }) {
  return (
    <>
      <div className="flex items-center pr-1 text-[10px] text-neutral-500 dark:text-neutral-400">
        {MODEL_SHORT_LABELS[rowModel]}
      </div>
      {BASELINE_MODELS.map((colModel) => {
        if (colModel === rowModel) {
          return <div key={colModel} className="aspect-square rounded bg-neutral-100 dark:bg-neutral-900" />;
        }
        const k = byPair.get(`${rowModel}\u0000${colModel}`);
        if (k === undefined) {
          return (
            <div
              key={colModel}
              className="aspect-square rounded border border-dashed border-neutral-200 dark:border-neutral-800"
            />
          );
        }
        const style = STATUS_STYLE[kappaTier(k)];
        return (
          <div
            key={colModel}
            title={`${kappaLabel(k)} (κ=${k.toFixed(3)})`}
            style={{ background: style.bg, color: style.fg }}
            className="flex aspect-square items-center justify-center rounded font-mono text-[10px] font-semibold tabular-nums"
          >
            {k.toFixed(2)}
          </div>
        );
      })}
    </>
  );
}
