"use client";

import { useEffect, useState } from "react";
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

function useFetch<T>(url: string | null): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Resetting loading/error for a new request is the whole point of this effect;
    // there's no external system to defer to first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

export function useRules() {
  return useFetch<RuleNode[]>("/api/p1/rules");
}

export function useTauGrid() {
  return useFetch<TauGridRow[]>("/api/p1/tau-grid");
}

export function useTexts(params: { source?: string; split?: string; goldRuleId?: string | null; q?: string }) {
  const qs = new URLSearchParams();
  if (params.source) qs.set("source", params.source);
  if (params.split) qs.set("split", params.split);
  if (params.goldRuleId) qs.set("gold_rule_id", params.goldRuleId);
  if (params.q) qs.set("q", params.q);
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
