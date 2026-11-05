import { FilterBar } from "@/components/FilterBar";

export default function RevisePage() {
  return (
    <div className="flex h-full flex-col">
      <FilterBar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold">P4. 수정 효과 확인</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          임계값·τ·우선순위 변경 전후 지표 비교, 뒤집힌 판정 목록, 규칙 문장 편집 후
          &apos;다시 판정&apos;(별도 추론 서버 호출), 수정안 저장이 들어갈 자리입니다.
          `rule_revisions` 테이블을 사용합니다.
        </p>
      </div>
    </div>
  );
}
