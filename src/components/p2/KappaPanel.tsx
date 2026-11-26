"use client";

import { MODEL_LABELS } from "@/lib/p2/models";
import type { KappaResponse } from "@/lib/p2/useP2Data";

function kappaColor(k: number): string {
  if (k >= 0.6) return "text-emerald-700 dark:text-emerald-400";
  if (k >= 0.4) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

export function KappaPanel({ kappa }: { kappa: KappaResponse }) {
  const pairs = kappa.pairs.filter((p) => p.n > 0);
  if (pairs.length === 0) {
    return (
      <div className="rounded border border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-800">
        모델 간 κ — 아직 겹치는 판정이 없습니다 (team_judge 데이터 준비 중).
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <div className="mb-2 font-medium">모델 간 일치도 (Cohen&apos;s κ){!kappa.cached && <span className="ml-1 text-neutral-400">· 실시간 계산</span>}</div>
      <table className="w-full">
        <tbody>
          {pairs.map((p) => (
            <tr key={`${p.modelA}-${p.modelB}`}>
              <td className="py-0.5 pr-2 text-neutral-600 dark:text-neutral-400">
                {MODEL_LABELS[p.modelA]} ↔ {MODEL_LABELS[p.modelB]}
              </td>
              <td className={`py-0.5 pr-2 text-right font-mono font-medium ${kappaColor(p.kappa)}`}>
                {p.kappa.toFixed(3)}
              </td>
              <td className="py-0.5 text-neutral-400">n={p.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
