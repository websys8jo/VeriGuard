"use client";

import { useFetch } from "@/lib/useFetch";
import type { ModelName } from "./models";

export type { ModelName };

export interface MatrixCell {
  model: ModelName;
  ruleId: string;
  n: number;
  meanProb: number;
  violationRate: number;
  accuracy: number | null;
}

export interface MatrixResponse {
  level: "major" | "mid";
  categories: { id: string; source: "dna" | "jigsaw"; ruleText: string }[];
  models: ModelName[];
  cells: MatrixCell[];
}

export interface KappaPair {
  modelA: ModelName;
  modelB: ModelName;
  kappa: number;
  n: number;
}

export interface KappaResponse {
  pairs: KappaPair[];
  cached: boolean;
}

export interface CellTextItem {
  id: string;
  source: "dna" | "jigsaw";
  split: "dev" | "test";
  humanLabel: "violation" | "normal" | null;
  goldRuleId: string | null;
  rawText: string;
  probs: Record<string, number | null>;
}

export interface CellTextsResponse {
  ruleId: string;
  total: number;
  items: CellTextItem[];
}

export interface ScatterPoint {
  textId: string;
  probA: number;
  probB: number;
  humanLabel: "violation" | "normal" | null;
  goldRuleId: string | null;
}

export interface ScatterResponse {
  modelA: ModelName;
  modelB: ModelName;
  points: ScatterPoint[];
}

function qs(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  return sp.toString();
}

export function useMatrix(params: { level: "major" | "mid"; source: string; split: string }) {
  return useFetch<MatrixResponse>(`/api/p2/matrix?${qs(params)}`);
}

export function useKappa(params: { source: string; split: string }) {
  return useFetch<KappaResponse>(`/api/p2/kappa?${qs(params)}`);
}

export function useCellTexts(
  params: { ruleId: string; source: string; split: string } | null,
) {
  return useFetch<CellTextsResponse>(
    params ? `/api/p2/cell-texts?${qs({ rule_id: params.ruleId, source: params.source, split: params.split })}` : null,
  );
}

export function useScatter(
  params: { modelA: ModelName; modelB: ModelName; source: string; split: string; ruleId?: string | null } | null,
) {
  return useFetch<ScatterResponse>(
    params
      ? `/api/p2/scatter?${qs({
          model_a: params.modelA,
          model_b: params.modelB,
          source: params.source,
          split: params.split,
          rule_id: params.ruleId ?? null,
        })}`
      : null,
  );
}
