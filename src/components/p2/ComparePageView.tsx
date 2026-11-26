"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store/useAppStore";
import { MODEL_LABELS } from "@/lib/p2/models";
import { useKappa, useMatrix } from "@/lib/p2/useP2Data";
import { JudgmentMatrix } from "./JudgmentMatrix";
import { KappaPanel } from "./KappaPanel";
import { CellTextList } from "./CellTextList";
import { ModelScatterPanel } from "./ModelScatterPanel";
import { CountUp } from "./CountUp";

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function Stat({ label, value, format, sub }: { label: string; value: number; format: (n: number) => string; sub?: string }) {
  return (
    <motion.div variants={sectionVariants} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
        <CountUp value={value} format={format} />
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
    </motion.div>
  );
}

export function ComparePageView() {
  const { filters, selectedTextId, setSelectedTextId } = useAppStore();
  const [level, setLevel] = useState<"major" | "mid">("major");
  const [selectedCell, setSelectedCell] = useState<{ model: string; ruleId: string } | null>(null);

  const source = filters.source;
  const split = filters.split;

  const { data: matrix, loading: matrixLoading, error: matrixError } = useMatrix({ level, source, split });
  const { data: kappa } = useKappa({ source, split });

  const stats = useMemo(() => {
    if (!matrix) return null;
    const categoryText = new Map(matrix.categories.map((c) => [c.id, c.ruleText]));

    const llama = matrix.cells.filter((c) => c.model === "llama_guard_3_1b");
    const totalTexts = llama.reduce((sum, c) => sum + c.n, 0);

    const scored = matrix.cells.filter((c) => c.accuracy !== null);
    const weakest = scored.length > 0 ? scored.reduce((a, b) => (b.accuracy! < a.accuracy! ? b : a)) : null;

    const bestPair =
      kappa && kappa.pairs.filter((p) => p.n > 0).length > 0
        ? kappa.pairs.filter((p) => p.n > 0).reduce((a, b) => (b.kappa > a.kappa ? b : a))
        : null;

    return {
      totalTexts,
      weakest: weakest
        ? {
            label: MODEL_LABELS[weakest.model as keyof typeof MODEL_LABELS],
            ruleText: categoryText.get(weakest.ruleId) ?? weakest.ruleId,
            accuracy: weakest.accuracy!,
          }
        : null,
      bestPair: bestPair ? { a: MODEL_LABELS[bestPair.modelA], b: MODEL_LABELS[bestPair.modelB], kappa: bestPair.kappa } : null,
    };
  }, [matrix, kappa]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="flex flex-col gap-5 overflow-y-auto p-4"
    >
      <motion.div variants={sectionVariants}>
        <h1 className="text-xl font-semibold">P2. 판정 비교</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          판정 모델(기준 3종 + 팀 판정기) × 규칙(범주) 행렬. 칸을 누르면 텍스트 목록과 모델별 위반
          확률을, 아래에서 모델 두 개를 고르면 산점도로 판단이 엇갈린 텍스트를 볼 수 있습니다.
        </p>
      </motion.div>

      {stats && (
        <motion.div variants={sectionVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="평가 텍스트" value={stats.totalTexts} format={(n) => `${Math.round(n).toLocaleString()}건`} />
          {stats.bestPair && (
            <Stat
              label="가장 일치하는 모델 쌍"
              value={stats.bestPair.kappa}
              format={(n) => `κ ${n.toFixed(2)}`}
              sub={`${stats.bestPair.a} ↔ ${stats.bestPair.b}`}
            />
          )}
          {stats.weakest && (
            <Stat
              label="가장 취약한 칸"
              value={stats.weakest.accuracy * 100}
              format={(n) => `${Math.round(n)}%`}
              sub={`${stats.weakest.label} · ${stats.weakest.ruleText}`}
            />
          )}
        </motion.div>
      )}

      <motion.div variants={sectionVariants} className="flex items-center gap-1 text-xs">
        <span className="mr-1 text-neutral-500">규칙 분류 단계</span>
        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
          {(["major", "mid"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`relative rounded-md px-2.5 py-1 transition-colors ${
                level === l
                  ? "font-medium text-neutral-900 dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {level === l && (
                <motion.span
                  layoutId="level-pill"
                  className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-neutral-700"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{l === "major" ? "대분류" : "중분류"}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {matrixLoading && <div className="text-sm text-neutral-500">판정 데이터 불러오는 중…</div>}
      {matrixError && <div className="text-sm text-red-600">{matrixError}</div>}

      <motion.div variants={sectionVariants} className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {matrix && (
          <JudgmentMatrix
            matrix={matrix}
            selected={selectedCell}
            onSelectCell={(model, ruleId) =>
              setSelectedCell((prev) => (prev?.model === model && prev?.ruleId === ruleId ? null : { model, ruleId }))
            }
          />
        )}
        {kappa && <KappaPanel kappa={kappa} />}
      </motion.div>

      {selectedCell && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3 }}>
          <CellTextList
            ruleId={selectedCell.ruleId}
            source={source}
            split={split}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
          />
        </motion.div>
      )}

      <motion.div variants={sectionVariants}>
        <ModelScatterPanel
          source={source}
          split={split}
          ruleId={selectedCell?.ruleId ?? null}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
        />
      </motion.div>
    </motion.div>
  );
}
