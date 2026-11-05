"use client";

import { useAppStore } from "@/lib/store/useAppStore";

const sources = [
  { value: "all", label: "전체 출처" },
  { value: "dna", label: "Do-Not-Answer" },
  { value: "jigsaw", label: "Jigsaw ACRC" },
  { value: "prosocial", label: "ProsocialDialog" },
] as const;

const splits = [
  { value: "all", label: "전체 split" },
  { value: "dev", label: "dev" },
  { value: "test", label: "test" },
] as const;

const models = [
  { value: "all", label: "전체 모델" },
  { value: "llama_guard_3_1b", label: "Llama Guard 3 1B" },
  { value: "qwen3guard_gen_0_6b", label: "Qwen3Guard-Gen-0.6B" },
  { value: "shieldgemma_2b", label: "ShieldGemma-2B" },
  { value: "team_judge", label: "팀 판정기" },
] as const;

const correctness = [
  { value: "all", label: "전체" },
  { value: "correct", label: "맞음" },
  { value: "wrong", label: "틀림" },
] as const;

export function FilterBar() {
  const { filters, setFilters, resetFilters } = useAppStore();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <select
        className="rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        value={filters.source}
        onChange={(e) => setFilters({ source: e.target.value as typeof filters.source })}
      >
        {sources.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        value={filters.split}
        onChange={(e) => setFilters({ split: e.target.value as typeof filters.split })}
      >
        {splits.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        value={filters.model}
        onChange={(e) => setFilters({ model: e.target.value as typeof filters.model })}
      >
        {models.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        value={filters.correctness}
        onChange={(e) =>
          setFilters({ correctness: e.target.value as typeof filters.correctness })
        }
      >
        {correctness.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {filters.ruleId && (
        <span className="rounded bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          규칙: {filters.ruleId}
          <button
            className="ml-2 font-bold"
            onClick={() => setFilters({ ruleId: null })}
            aria-label="규칙 필터 해제"
          >
            ×
          </button>
        </span>
      )}

      <button
        className="ml-auto rounded border border-neutral-300 px-2 py-1 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        onClick={resetFilters}
      >
        필터 초기화
      </button>
    </div>
  );
}
