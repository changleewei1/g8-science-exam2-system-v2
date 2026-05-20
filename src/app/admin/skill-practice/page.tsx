import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminInlineNavLink, AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";
import {
  getAdminSkillPracticeOverview,
  type SkillPracticeStatus,
} from "@/lib/skill-practice-summary";

export const dynamic = "force-dynamic";

const STATUSES: SkillPracticeStatus[] = ["尚未開始", "練習中", "建議加強", "已精熟"];

type Search = {
  scopeId?: string;
  className?: string;
  unitId?: string;
  status?: string;
  studentQ?: string;
  skillQ?: string;
};

type Props = { searchParams: Promise<Search> };

function firstOrUndef(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminSkillPracticePage({ searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const sp = await searchParams;
  const supabase = getSupabaseAdmin();

  const { data: scopeRows, error: scopeErr } = await supabase
    .from("exam_scopes")
    .select("id, title")
    .order("title", { ascending: true });
  if (scopeErr) throw new Error(scopeErr.message);

  const scopes = (scopeRows ?? []) as Array<{ id: string; title: string }>;
  const scopeIdParam = firstOrUndef(sp.scopeId)?.trim();
  const scopeId = scopeIdParam && scopes.some((s) => s.id === scopeIdParam) ? scopeIdParam : scopes[0]?.id ?? "";

  const { data: classRows } = await supabase
    .from("students")
    .select("class_name")
    .eq("is_active", true)
    .limit(5000);
  const classNames = Array.from(
    new Set(
      (classRows ?? [])
        .map((r) => (r.class_name as string | null)?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort((a, b) => a.localeCompare(b, "zh-Hant"));

  let unitOptions: Array<{ id: string; unit_title: string }> = [];
  if (scopeId) {
    const { data: u } = await supabase
      .from("scope_units")
      .select("id, unit_title, sort_order")
      .eq("exam_scope_id", scopeId)
      .order("sort_order", { ascending: true });
    unitOptions = (u ?? []) as Array<{ id: string; unit_title: string }>;
  }

  const className = firstOrUndef(sp.className)?.trim() || "";
  const unitId = firstOrUndef(sp.unitId)?.trim() || "";
  const statusRaw = firstOrUndef(sp.status)?.trim() || "";
  const statusFilter: SkillPracticeStatus | null =
    STATUSES.includes(statusRaw as SkillPracticeStatus) ? (statusRaw as SkillPracticeStatus) : null;
  const studentQ = firstOrUndef(sp.studentQ) ?? "";
  const skillQ = firstOrUndef(sp.skillQ) ?? "";

  const overview =
    scopeId &&
    (await getAdminSkillPracticeOverview(scopeId, {
      className: className || null,
      unitId: unitId || null,
      studentQ: studentQ.trim() || null,
      skillQ: skillQ.trim() || null,
      statusFilter,
    }));

  return (
    <>
      <AdminStandaloneHeader
        title="技能樹智慧練習追蹤"
        right={<AdminInlineNavLink href="/admin">返回後台首頁</AdminInlineNavLink>}
      />
      <AdminStandaloneMain>
        <section>
          <p className="text-sm text-slate-400">
            依段考範圍檢視全班技能練習與熟練度（資料來自智慧練習 session／作答紀錄，僅讀取不修改題庫或影片設定）。
          </p>
        </section>

        <form
          action="/admin/skill-practice"
          method="get"
          className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 shadow-sm sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">段考範圍</span>
              <select
                name="scopeId"
                defaultValue={scopeId}
                className="rounded-lg border border-white/15 px-3 py-2 text-slate-50"
                required
              >
                {scopes.length === 0 ? (
                  <option value="">（尚無段考範圍）</option>
                ) : (
                  scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">班級</span>
              <select name="className" defaultValue={className} className="rounded-lg border border-white/15 px-3 py-2">
                <option value="">全部班級</option>
                {classNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">單元</span>
              <select name="unitId" defaultValue={unitId} className="rounded-lg border border-white/15 px-3 py-2">
                <option value="">全部單元</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">狀態（技能列／學生列）</span>
              <select name="status" defaultValue={statusRaw} className="rounded-lg border border-white/15 px-3 py-2">
                <option value="">不限</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">搜尋學生姓名</span>
              <input
                name="studentQ"
                type="search"
                defaultValue={studentQ}
                placeholder="部分關鍵字"
                className="rounded-lg border border-white/15 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-300">搜尋 skill</span>
              <input
                name="skillQ"
                type="search"
                defaultValue={skillQ}
                placeholder="skill_code 或名稱"
                className="rounded-lg border border-white/15 px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              套用篩選
            </button>
            {scopeId ? (
              <Link
                href={`/admin/skill-practice?scopeId=${encodeURIComponent(scopeId)}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-white/15 bg-white px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.04]"
              >
                清除篩選
              </Link>
            ) : null}
          </div>
        </form>

        {!scopeId || !overview ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            請先建立段考範圍與單元技能資料，才能顯示練習追蹤。
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-50">班級總覽</h2>
              <p className="text-sm text-slate-400">{overview.scope.title}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <dt className="text-xs text-slate-500">全班平均熟練度</dt>
                  <dd className="text-xl font-semibold text-slate-50">{overview.class.avg_mastery}</dd>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <dt className="text-xs text-emerald-800">已精熟（人次×技能）</dt>
                  <dd className="text-xl font-semibold text-emerald-900">{overview.class.mastered_skill_slots}</dd>
                </div>
                <div className="rounded-lg bg-rose-50 p-3">
                  <dt className="text-xs text-rose-800">建議加強（人次×技能）</dt>
                  <dd className="text-xl font-semibold text-rose-900">{overview.class.need_help_skill_slots}</dd>
                </div>
                <div className="rounded-lg bg-white/[0.08] p-3">
                  <dt className="text-xs text-slate-400">尚未開始任何練習的學生數</dt>
                  <dd className="text-xl font-semibold text-slate-50">{overview.class.not_started_student_count}</dd>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <dt className="text-xs text-slate-500">篩選後學生數</dt>
                  <dd className="text-xl font-semibold text-slate-50">{overview.class.student_count}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-50">技能別總覽</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[880px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-400">
                      <th className="py-2 pr-3">技能</th>
                      <th className="py-2 pr-3">單元</th>
                      <th className="py-2 pr-3">類型</th>
                      <th className="py-2 pr-3">平均熟練度</th>
                      <th className="py-2 pr-3">已練習人數</th>
                      <th className="py-2 pr-3">已精熟人數</th>
                      <th className="py-2 pr-3">建議加強人數</th>
                      <th className="py-2">題目平均答對率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.by_skill.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          無符合篩選的技能資料
                        </td>
                      </tr>
                    ) : (
                      overview.by_skill.map((row) => (
                        <tr key={row.skill_code} className="border-b border-white/10">
                          <td className="py-2 pr-3 font-medium text-slate-50">
                            <span className="font-mono text-xs text-slate-500">{row.skill_code}</span>
                            <br />
                            {row.skill_name}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{row.unit_name}</td>
                          <td className="py-2 pr-3">{row.category}</td>
                          <td className="py-2 pr-3">{row.avg_mastery}</td>
                          <td className="py-2 pr-3">{row.practiced_student_count}</td>
                          <td className="py-2 pr-3 text-emerald-800">{row.mastered_student_count}</td>
                          <td className="py-2 pr-3 text-rose-800">{row.need_help_student_count}</td>
                          <td className="py-2">
                            {row.avg_accuracy != null ? `${Math.round(row.avg_accuracy * 100)}%` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-50">學生別總覽</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-400">
                      <th className="py-2 pr-3">姓名</th>
                      <th className="py-2 pr-3">班級</th>
                      <th className="py-2 pr-3">已練習技能數</th>
                      <th className="py-2 pr-3">已精熟技能數</th>
                      <th className="py-2 pr-3">平均熟練度</th>
                      <th className="py-2 pr-3">需要加強 TOP 3</th>
                      <th className="py-2">動作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.by_student.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          無符合篩選的學生
                        </td>
                      </tr>
                    ) : (
                      overview.by_student.map((row) => (
                        <tr key={row.student_id} className="border-b border-white/10">
                          <td className="py-2 pr-3 font-medium text-slate-50">{row.student_name}</td>
                          <td className="py-2 pr-3">{row.class_name ?? "—"}</td>
                          <td className="py-2 pr-3">{row.practiced_skill_count}</td>
                          <td className="py-2 pr-3 text-emerald-800">{row.mastered_skill_count}</td>
                          <td className="py-2 pr-3">{row.avg_mastery}</td>
                          <td className="py-2 pr-3 text-slate-300">
                            {row.weak_top3.length === 0
                              ? "—"
                              : row.weak_top3.map((w) => `${w.skill_code} (${w.mastery_score})`).join("、")}
                          </td>
                          <td className="py-2">
                            <Link
                              href={`/admin/skill-practice/students/${row.student_id}?scopeId=${encodeURIComponent(scopeId)}`}
                              className="font-medium text-cyan-200 hover:underline"
                            >
                              詳細 skill 狀況
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </AdminStandaloneMain>
    </>
  );
}
