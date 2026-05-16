import Link from "next/link";
import { redirect } from "next/navigation";
import { LabPracticeHome } from "@/components/student/LabPracticeHome";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { adaptivePracticeLabFlagDebug, isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentLabPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const enabled = isAdaptivePracticeLabEnabled();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 space-y-2">
        <StudentBackLink href="/student/dashboard#exam-scopes">返回學習總覽</StudentBackLink>
        <h1 className="text-2xl font-semibold text-slate-900">智慧練習</h1>
        <p className="text-sm text-slate-600">透過連續練習提升熟練度，系統會依答題狀況自動調整難度。</p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
          <p className="font-medium text-slate-900">智慧練習尚未開放</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            需開啟以下<strong>任一</strong>環境變數（視為開：<code className="text-xs">true</code> /
            <code className="text-xs">1</code> /<code className="text-xs">yes</code> /<code className="text-xs">on</code>，大小寫與頭尾空白可忽略）：
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_ENABLE_ADAPTIVE_PRACTICE</code>
              — 若你用 <strong>npm run build</strong> 再 <strong>npm run start</strong>，此變數在 build 時就定型，請改完後<strong>重新 build</strong>；單靠重啟 <code className="text-xs">npm start</code> 可能無效。
            </li>
            <li>
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">LAB_ENABLE_ADAPTIVE_PRACTICE</code>
              （僅伺服器）— 本機<code className="text-xs"> npm run start </code>時可<strong>只重啟</strong>伺服器生效，不要求重跑 build。
            </li>
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            <strong>npm run dev</strong>：改完 <code className="text-xs">.env.local</code> 後請<strong>關閉並重開</strong>開發伺服器。
          </p>
          <Link href="/student/dashboard#exam-scopes" className="mt-4 inline-block text-sm font-medium text-teal-800 underline">
            返回學習總覽
          </Link>
          {process.env.NODE_ENV === "development" ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <p className="font-semibold">開發模式除錯</p>
              <p className="mt-2 font-mono break-all">
                LAB_ENABLE_ADAPTIVE_PRACTICE=
                {adaptivePracticeLabFlagDebug().labServerRaw ?? "（未設定）"}
              </p>
              <p className="mt-1 font-mono break-all">
                NEXT_PUBLIC_ENABLE_ADAPTIVE_PRACTICE=
                {adaptivePracticeLabFlagDebug().nextPublicRaw ?? "（未設定）"}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <LabPracticeHome />
      )}
    </main>
  );
}
