import Link from "next/link";
import { Suspense } from "react";
import { DbStatus } from "@/components/DbStatus";

const views = [
  {
    href: "/rules",
    title: "P1. 규칙 찾기 점검",
    desc: "규칙 트리 위 단계별 유사도, BFS 경로 vs 정답 경로, τ 슬라이더, 경계 사례",
  },
  {
    href: "/compare",
    title: "P2. 판정 비교",
    desc: "판정 모델 × 규칙 행렬, 모델 간 κ, 사람 라벨과의 일치도",
  },
  {
    href: "/diagnose",
    title: "P3. 잘못된 판정 진단",
    desc: "원인 1~4(규칙 찾기/라벨/규칙 문장/판정 모델)별 분포와 텍스트별 진단 팝업",
  },
  {
    href: "/revise",
    title: "P4. 수정 효과 확인",
    desc: "임계값·우선순위·규칙 문장 수정 전후 비교, 뒤집힌 판정, 수정안 저장",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">VeriGuard</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Text 데이터의 AI 윤리 규칙 위반 판정 모델을 설명하는 시스템 — 규칙 찾기 · 판정
          비교 · 잘못된 판정 진단 · 수정 효과 확인
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-neutral-500">DB 연결 확인 중…</div>}>
        <DbStatus />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2">
        {views.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="font-medium">{v.title}</div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{v.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
