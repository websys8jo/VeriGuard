"use client";

import { useFetch } from "@/lib/useFetch";
import type { RuleNode } from "./tree";

export interface TauGridRow {
  tau: number;
  source: "dna" | "jigsaw";
  split: "dev" | "test";
  topk1_acc: number;
  topk3_acc: number;
  efficiency: number;
  n: number;
}

export interface TextListItem {
  id: string;
  source: "dna" | "jigsaw";
  split: "dev" | "test";
  human_label: string | null;
  gold_rule_id: string | null;
  context: string | null;
  raw_text: string;
}

export interface TextDetail {
  text: TextListItem & { response_llm: string | null };
  similarity: { rule_id: string; level: string; score: number }[];
}

export interface NodeStat {
  rule_id: string;
  n_gold: number;
  n_correct: number;
}

export interface BoundaryCase {
  text_id: string;
  tau_low: number;
  tau_high: number;
  rule_id_low: string;
  rule_id_high: string;
}

export function useRules() {
  return useFetch<RuleNode[]>("/api/p1/rules");
}

export function useTauGrid() {
  return useFetch<TauGridRow[]>("/api/p1/tau-grid");
}

export function useTexts(params: {
  source?: string;
  split?: string;
  goldRuleId?: string | null;
  q?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.source) qs.set("source", params.source);
  if (params.split) qs.set("split", params.split);
  if (params.goldRuleId) qs.set("gold_rule_id", params.goldRuleId);
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  return useFetch<TextListItem[]>(`/api/p1/texts?${qs.toString()}`);
}

export function useTextDetail(textId: string | null) {
  return useFetch<TextDetail>(textId ? `/api/p1/text/${encodeURIComponent(textId)}` : null);
}

export function useNodeStats(tau: number) {
  return useFetch<{ tau: number; stats: NodeStat[] }>(`/api/p1/node-stats?tau=${tau}`);
}

export function useBoundaryCases(tau: number) {
  return useFetch<BoundaryCase[]>(`/api/p1/boundary-cases?tau=${tau}`);
}

export function useRuleTexts(ruleId: string | null, tau: number) {
  return useFetch<{ tau: number; texts: TextListItem[] }>(
    ruleId ? `/api/p1/rule-texts?rule_id=${encodeURIComponent(ruleId)}&tau=${tau}` : null,
  );
}
