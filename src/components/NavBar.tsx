"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/rules", label: "P1 규칙 찾기" },
  { href: "/compare", label: "P2 판정 비교" },
  { href: "/diagnose", label: "P3 잘못된 판정 진단" },
  { href: "/revise", label: "P4 수정 효과 확인" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-6 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <Link href="/" className="font-semibold tracking-tight">
        Veri<span className="text-accent">Guard</span>
      </Link>
      <nav className="flex gap-1 text-sm">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
