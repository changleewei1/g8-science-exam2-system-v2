import Link from "next/link";

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 學生／老師區頂部「回到首頁」 */
export function HomeBackLink() {
  return (
    <Link
      href="/"
      className="interactive-btn inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm sm:px-4 sm:text-base"
    >
      <IconHome className="h-5 w-5 shrink-0 text-teal-700" />
      回到首頁
    </Link>
  );
}
