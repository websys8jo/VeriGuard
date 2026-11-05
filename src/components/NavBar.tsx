import Link from "next/link";

const links = [
  { href: "/rules", label: "P1 규칙 찾기" },
  { href: "/compare", label: "P2 판정 비교" },
  { href: "/diagnose", label: "P3 잘못된 판정 진단" },
  { href: "/revise", label: "P4 수정 효과 확인" },
];

export function NavBar() {
  return (
    <header className="flex items-center gap-6 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <Link href="/" className="font-semibold">
        VeriGuard
      </Link>
      <nav className="flex gap-4 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
