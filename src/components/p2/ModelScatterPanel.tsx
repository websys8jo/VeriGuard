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

type Point = { textId: string; probA: number; probB: number; humanLabel: "violation" | "normal" | null };

// Status colors — violation reads as "critical", normal as "good". Always
// paired with the legend's text label below, never color alone.
const POINT_COLOR = { violation: "var(--status-critical)", normal: "var(--status-good)", unknown: "#9ca3af" } as const;

interface TextPreview {
  text: { raw_text: string; human_label: string | null };
}

function ModelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ModelName;
  onChange: (m: ModelName) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <select
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 font-medium dark:border-neutral-700 dark:bg-neutral-800"
        value={value}
        onChange={(e) => onChange(e.target.value as ModelName)}
      >
        {BASELINE_MODELS.map((m) => (
          <option key={m} value={m}>
            {MODEL_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModelScatterPanel({ source, split, ruleId, selectedTextId, onSelectText }: Props) {
  const [modelA, setModelA] = useState<ModelName>("llama_guard_3_1b");
  const [modelB, setModelB] = useState<ModelName>("qwen3guard_gen_0_6b");

  const { data, loading, error } = useScatter({ modelA, modelB, source, split, ruleId });
  const { data: preview } = useFetch<TextPreview>(
    selectedTextId ? `/api/p1/text/${encodeURIComponent(selectedTextId)}` : null,
  );

  const points: Point[] = data?.points ?? [];
  const grouped: Record<"violation" | "normal" | "unknown", Point[]> = { violation: [], normal: [], unknown: [] };
  for (const p of points) grouped[p.humanLabel ?? "unknown"].push(p);

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium">모델 비교 산점도</div>
        <div className="flex flex-wrap items-center gap-3">
          <ModelSelect label="X축" value={modelA} onChange={setModelA} />
          <ModelSelect label="Y축" value={modelB} onChange={setModelB} />
        </div>
      </div>
      {ruleId && (
        <div className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          위에서 선택한 규칙 범주로 필터링됨
        </div>
      )}

      {loading && <div className="text-xs text-neutral-500">불러오는 중…</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {data && points.length === 0 && (
        <div className="py-8 text-center text-xs text-neutral-400">두 모델이 겹치는 판정 데이터가 없습니다.</div>
      )}

      {data && points.length > 0 && (
        <>
          <div className="flex justify-center">
            <ScatterChart width={560} height={340} margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
              <CartesianGrid stroke="#e7e7e7" strokeDasharray="0" className="dark:opacity-20" />
              <XAxis
                type="number"
                dataKey="probA"
                domain={[0, 1]}
                name={MODEL_LABELS[modelA]}
                tickLine={false}
                axisLine={{ stroke: "#c2c2c2" }}
                label={{ value: MODEL_LABELS[modelA], position: "insideBottom", offset: -8, fontSize: 11, fill: "#666666" }}
                tick={{ fontSize: 10, fill: "#666666" }}
              />
              <YAxis
                type="number"
                dataKey="probB"
                domain={[0, 1]}
                name={MODEL_LABELS[modelB]}
                tickLine={false}
                axisLine={{ stroke: "#c2c2c2" }}
                label={{ value: MODEL_LABELS[modelB], angle: -90, position: "insideLeft", fontSize: 11, fill: "#666666" }}
                tick={{ fontSize: 10, fill: "#666666" }}
              />
              <ZAxis range={[48, 48]} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#c2c2c2" strokeDasharray="4 3" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#c2c2c2" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Point;
                  return (
                    <div className="rounded-lg border border-neutral-200 bg-white p-2 text-[11px] shadow-md dark:border-neutral-700 dark:bg-neutral-900">
                      <div className="font-mono text-neutral-500">{p.textId}</div>
                      <div className="mt-0.5">
                        사람 라벨: <span className="font-medium">{p.humanLabel ?? "–"}</span>
                      </div>
                      <div className="font-mono tabular-nums">
                        {MODEL_LABELS[modelA]}: {p.probA.toFixed(3)}
                      </div>
                      <div className="font-mono tabular-nums">
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
                      fill={POINT_COLOR[label]}
                      fillOpacity={0.65}
                      onClick={(p) => onSelectText((p as unknown as Point).textId)}
                      cursor="pointer"
                    />
                  ),
              )}
            </ScatterChart>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: POINT_COLOR.violation }} />
              violation
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: POINT_COLOR.normal }} />
              normal
            </span>
            <span>점선 대각선에서 먼 점일수록 두 모델 판단이 엇갈린 텍스트</span>
          </div>
        </>
      )}

      {selectedTextId && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] text-neutral-500">{selectedTextId}</span>
            <button onClick={() => onSelectText(null)} className="text-neutral-400 hover:text-neutral-600">
              닫기
            </button>
          </div>
          {preview ? (
            <>
              <div className="mb-1 font-medium">사람 라벨: {preview.text.human_label}</div>
              <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{preview.text.raw_text}</p>
            </>
          ) : (
            <div className="text-neutral-400">불러오는 중…</div>
          )}
        </div>
      )}
    </div>
  );
}
