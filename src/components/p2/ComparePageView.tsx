"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { useKappa, useMatrix } from "@/lib/p2/useP2Data";
import { JudgmentMatrix } from "./JudgmentMatrix";
import { KappaPanel } from "./KappaPanel";
import { CellTextList } from "./CellTextList";
import { ModelScatterPanel } from "./ModelScatterPanel";

export function ComparePageView() {
  const { filters, selectedTextId, setSelectedTextId } = useAppStore();
  const [level, setLevel] = useState<"major" | "mid">("major");
  const [selectedCell, setSelectedCell] = useState<{ model: string; ruleId: string } | null>(null);

  const source = filters.source;
  const split = filters.split;

  const { data: matrix, loading: matrixLoading, error: matrixError } = useMatrix({ level, source, split });
  const { data: kappa } = useKappa({ source, split });

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h1 className="text-xl font-semibold">P2. 판정 비교</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          판정 모델(기준 3종 + 팀 판정기) × 규칙(범주) 행렬. 칸을 누르면 텍스트 목록과 모델별 위반
          확률을, 아래에서 모델 두 개를 고르면 산점도로 판단이 엇갈린 텍스트를 볼 수 있습니다.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-500">규칙 분류 단계:</span>
        <button
          onClick={() => setLevel("major")}
          className={`rounded px-2 py-1 ${level === "major" ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black" : "bg-neutral-100 dark:bg-neutral-800"}`}
        >
          대분류
        </button>
        <button
          onClick={() => setLevel("mid")}
          className={`rounded px-2 py-1 ${level === "mid" ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black" : "bg-neutral-100 dark:bg-neutral-800"}`}
        >
          중분류
        </button>
      </div>

      {matrixLoading && <div className="text-sm text-neutral-500">판정 데이터 불러오는 중…</div>}
      {matrixError && <div className="text-sm text-red-600">{matrixError}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
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
      </div>

      {selectedCell && (
        <CellTextList
          ruleId={selectedCell.ruleId}
          source={source}
          split={split}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
        />
      )}

      <ModelScatterPanel
        source={source}
        split={split}
        ruleId={selectedCell?.ruleId ?? null}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
      />
    </div>
  );
}
