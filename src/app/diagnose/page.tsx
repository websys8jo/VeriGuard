import { FilterBar } from "@/components/FilterBar";

export default function DiagnosePage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold">P3. 잘못된 판정 진단</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          원인별(규칙 찾기/라벨 확인/규칙 문장/판정 모델) 색상 분포 + 텍스트 클릭 시
          진단 팝업(찾은 규칙 vs 정답 규칙, 4가지 조건별 위반 확률, 원인 단계)이 들어갈
          자리입니다. `diagnoses` 테이블을 사용합니다.
        </p>
      </div>
    </div>
  );
}
