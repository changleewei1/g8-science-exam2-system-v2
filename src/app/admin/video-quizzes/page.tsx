import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { getDefaultExamScopeId } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminVideoQuizzesIndexPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes, scopeUnits, videos, quizzes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const examScopeId = envScope ?? scopes[0]?.id;
  const scopeTitle = scopes.find((s) => s.id === examScopeId)?.title ?? null;

  if (!examScopeId) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-6 text-amber-950 shadow-md">
        <p className="font-medium text-slate-900">尚未設定段考範圍</p>
        <p className="mt-2 text-sm text-slate-700">請設定 NEXT_PUBLIC_DEFAULT_EXAM_SCOPE_ID 或於資料庫建立 scope。</p>
      </div>
    );
  }

  const units = await scopeUnits.findByExamScopeId(examScopeId);
  const rows: {
    unitTitle: string;
    unitId: string;
    videos: { id: string; title: string; sortOrder: number; quizId: string | null }[];
  }[] = [];

  for (const u of units) {
    const vs = await videos.findByUnitId(u.id);
    const withQuiz = await Promise.all(
      vs.map(async (v) => {
        const q = await quizzes.findByVideoId(v.id);
        return {
          id: v.id,
          title: v.title,
          sortOrder: v.sortOrder,
          quizId: q?.id ?? null,
        };
      }),
    );
    rows.push({ unitTitle: u.unitTitle, unitId: u.id, videos: withQuiz });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">影片測驗題</h1>
        <p className="mt-2 text-sm text-slate-600">
          依學習單元與播放順序列出影片；若有測驗即可編輯題目與正解（表單或頁面上方{" "}
          <strong className="text-slate-800">JSON 批次編輯</strong>
          ，可增減題數）。儲存後學生端立即套用。
        </p>
        {scopeTitle ? (
          <p className="mt-2 text-xs text-slate-500">
            段考範圍：<span className="font-medium text-slate-700">{scopeTitle}</span>
          </p>
        ) : null}
      </div>

      <div className="space-y-10">
        {rows.map((block) => (
          <section key={block.unitId} className="rounded-2xl border border-slate-200/90 bg-white shadow-md">
            <h2 className="border-b border-slate-100 px-4 py-3 text-lg font-semibold text-slate-900 sm:px-5">
              {block.unitTitle}
            </h2>
            <ul className="divide-y divide-slate-100">
              {block.videos.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      <span className="mr-2 text-xs font-normal text-slate-500">#{v.sortOrder}</span>
                      {v.title}
                    </p>
                    {!v.quizId ? (
                      <p className="mt-1 text-sm text-amber-800">此影片尚無測驗（請先匯入播放清單）</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {v.quizId ? (
                      <Link
                        href={`/admin/video-quizzes/edit/${v.quizId}`}
                        className="interactive-btn inline-flex min-h-10 items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                      >
                        編輯 3 題測驗
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
