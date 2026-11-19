"use client";

import { useState } from "react";
import type { TextListItem } from "@/lib/rules/useP1Data";
import { useTexts } from "@/lib/rules/useP1Data";

interface Props {
  source?: string;
  split?: string;
  goldRuleId?: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TextPicker({ source, split, goldRuleId, selectedId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const { data, loading } = useTexts({ source, split, goldRuleId, q: q || undefined });

  return (
    <div className="flex h-full flex-col">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="텍스트 id / 내용 검색…"
        className="mb-2 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {loading && <div className="text-xs text-neutral-500">불러오는 중…</div>}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {data?.map((t: TextListItem) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`block w-full rounded px-2 py-1.5 text-left text-xs ${
              selectedId === t.id
                ? "bg-blue-100 dark:bg-blue-950"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <div className="flex justify-between text-neutral-500">
              <span>{t.id}</span>
              <span>{t.human_label}</span>
            </div>
            <div className="truncate text-neutral-700 dark:text-neutral-300">{t.raw_text}</div>
          </button>
        ))}
        {data?.length === 0 && <div className="text-xs text-neutral-500">결과 없음</div>}
      </div>
    </div>
  );
}
