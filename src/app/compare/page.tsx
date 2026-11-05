import { FilterBar } from "@/components/FilterBar";

export default function ComparePage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold">P2. 판정 비교</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          판정 모델(기준 3종 + 팀 판정기) × 규칙(범주) 행렬이 들어갈 자리입니다. 칸을
          누르면 텍스트 목록과 모델별 위반 확률, 모델 두 개를 고르면 산점도로 판단이
          엇갈린 텍스트를 보여줍니다. `judgments`, `kappa_pairs` 테이블을 사용합니다.
        </p>
      </div>
    </div>
  );
}
