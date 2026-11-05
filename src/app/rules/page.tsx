import { FilterBar } from "@/components/FilterBar";

export default function RulesPage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold">P1. 규칙 찾기 점검</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          규칙 트리(대·중·소) + 단계별 유사도 + BFS/정답 경로 + τ 슬라이더 + 경계 사례
          목록이 들어갈 자리입니다. Supabase에 `rules`, `similarity_steps`, `bfs_runs`
          데이터가 채워지면 d3 트리 시각화를 연결합니다.
        </p>
      </div>
    </div>
  );
}
