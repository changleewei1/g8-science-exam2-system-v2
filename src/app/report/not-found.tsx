import Link from "next/link";

export default function ReportNotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-12 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-teal-700/90">學生學習報告</p>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">無法開啟這份報告</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        家長<strong className="font-medium text-slate-800">不需要登入帳號</strong>
        即可觀看。若出現此畫面，可能是連結已過期、網址在複製時被截斷，或該連結已失效。
      </p>
      <p className="mt-3 text-sm text-slate-600">請向老師重新索取一次「完整」分享連結後再試。</p>
      <Link
        href="/"
        className="interactive-btn mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white"
      >
        返回首頁
      </Link>
    </main>
  );
}
