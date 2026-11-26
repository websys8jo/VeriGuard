"use client";

import { useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { BASELINE_MODELS, MODEL_LABELS } from "@/lib/p2/models";
import { useScatter, type ModelName } from "@/lib/p2/useP2Data";
import { useFetch } from "@/lib/useFetch";

interface Props {
  source: string;
  split: string;
  ruleId: string | null;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

const COLORS = { violation: "#dc2626", normal: "#2563eb", unknown: "#9ca3af" } as const;

interface TextPreview {
  text: { raw_text: string; human_label: string | null };
}

export function ModelScatterPanel({ source, split, ruleId, selectedTextId, onSelectText }: Props) {
  const [modelA, setModelA] = useState<ModelName>("llama_guard_3_1b");
  const [modelB, setModelB] = useState<ModelName>("qwen3guard_gen_0_6b");

  const { data, loading, error } = useScatter({ modelA, modelB, source, split, ruleId });
  const { data: preview } = useFetch<TextPreview>(
    selectedTextId ? `/api/p1/text/${encodeURIComponent(selectedTextId)}` : null,
  );

  type Point = { textId: string; probA: number; probB: number; humanLabel: "violation" | "normal" | null };
  const points: Point[] = data?.points ?? [];
  const grouped: Record<"violation" | "normal" | "unknown", Point[]> = { violation: [], normal: [], unknown: [] };
  for (const p of points) grouped[p.humanLabel ?? "unknown"].push(p);

  return (
    <div className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">산점도:</span>
        <select
          className="rounded border border-neutral-300 bg-white px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          value={modelA}
          onChange={(e) => setModelA(e.target.value as ModelName)}
        >
          {BASELINE_MODELS.map((m) => (
            <option key={m} value={m}>
              {MODEL_LABELS[m]}
            </option>
          ))}
        </select>
        <span>vs</span>
        <select
          className="rounded border border-neutral-300 bg-white px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          value={modelB}
          onChange={(e) => setModelB(e.target.value as ModelName)}
        >
          {BASELINE_MODELS.map((m) => (
            <option key={m} value={m}>
              {MODEL_LABELS[m]}
            </option>
          ))}
        </select>
        {ruleId && <span className="text-neutral-400">(선택한 규칙 범주로 필터링됨)</span>}
      </div>

      {loading && <div className="text-xs text-neutral-500">불러오는 중…</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {data && points.length === 0 && (
        <div className="text-xs text-neutral-500">두 모델이 겹치는 판정 데이터가 없습니다.</div>
      )}

      {data && points.length > 0 && (
        <>
          <ScatterChart width={520} height={320} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="probA"
              domain={[0, 1]}
              name={MODEL_LABELS[modelA]}
              label={{ value: MODEL_LABELS[modelA], position: "insideBottom", offset: -8, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="probB"
              domain={[0, 1]}
              name={MODEL_LABELS[modelB]}
              label={{ value: MODEL_LABELS[modelB], angle: -90, position: "insideLeft", fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <ZAxis range={[24, 24]} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#d1d5db" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <div className="rounded border border-neutral-200 bg-white p-2 text-[11px] shadow dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="font-mono">{p.textId}</div>
                    <div>사람 라벨: {p.humanLabel ?? "–"}</div>
                    <div>
                      {MODEL_LABELS[modelA]}: {p.probA.toFixed(3)}
                    </div>
                    <div>
                      {MODEL_LABELS[modelB]}: {p.probB.toFixed(3)}
                    </div>
                  </div>
                );
              }}
            />
            {(["violation", "normal", "unknown"] as const).map(
              (label) =>
                grouped[label].length > 0 && (
                  <Scatter
                    key={label}
                    name={label}
                    data={grouped[label]}
                    fill={COLORS[label]}
                    fillOpacity={0.6}
                    onClick={(p) => onSelectText((p as unknown as Point).textId)}
                    cursor="pointer"
                  />
                ),
            )}
          </ScatterChart>
          <div className="flex gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS.violation }} />
              violation
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS.normal }} />
              normal
            </span>
            <span>대각선에서 먼 점 = 두 모델 판단이 엇갈린 텍스트</span>
          </div>
        </>
      )}

      {selectedTextId && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs dark:border-blue-900 dark:bg-blue-950">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] text-neutral-500">{selectedTextId}</span>
            <button onClick={() => onSelectText(null)} className="text-neutral-400">
              닫기
            </button>
          </div>
          {preview ? (
            <>
              <div className="mb-1">사람 라벨: {preview.text.human_label}</div>
              <p className="whitespace-pre-wrap">{preview.text.raw_text}</p>
            </>
          ) : (
            <div className="text-neutral-400">불러오는 중…</div>
          )}
        </div>
      )}
    </div>
  );
}
