"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BookMarked, CheckCircle2, ChevronRight, Loader2, Target } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import type { StudentDashboardSummaryResponse } from "@/lib/student-dashboard-summary";
import { cn } from "@/lib/utils";

export type OverviewScopeOption = { id: string; label: string };

type Props = {
  initialScopeId: string | null;
  scopeOptions: OverviewScopeOption[];
};

function StatCard({
  title,
  value,
  sub,
  className,
}: {
  title: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-600/50 bg-slate-900/80 p-4 shadow-inner backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white sm:text-3xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-300">{sub}</p> : null}
    </div>
  );
}

export function PersonalLearningOverview({ initialScopeId, scopeOptions }: Props) {
  const [scopeId, setScopeId] = useState<string | null>(() => {
    if (initialScopeId) return initialScopeId;
    return scopeOptions[0]?.id ?? null;
  });
  const [data, setData] = useState<StudentDashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/dashboard-summary?scopeId=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `載入失敗 (${res.status})`);
      }
      const json = (await res.json()) as StudentDashboardSummaryResponse;
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "無法載入總覽");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scopeId) return;
    void load(scopeId);
  }, [scopeId, load]);

  const labOn = isAdaptivePracticeLabEnabled();
  const skillHref = (code: string) =>
    labOn ? `/student/lab/practice/${encodeURIComponent(code)}` : `/student/exam-scope/${scopeId}/skills`;

  if (!scopeId) {
    return (
      <section
        id="learning-overview"
        className="rounded-3xl border border-amber-400/25 bg-amber-950/30 p-6 text-amber-100/90 backdrop-blur-md"
        aria-labelledby="overview-empty"
      >
        <h2 id="overview-empty" className="text-lg font-semibold text-white">
          個人學習總覽
        </h2>
        <p className="mt-2 text-sm text-slate-200">目前尚無可顯示的段考範圍，請待老師開放後再查看。</p>
      </section>
    );
  }

  return (
    <section
      id="learning-overview"
      className="rounded-3xl border border-cyan-500/25 bg-slate-900/75 p-4 shadow-[0_0_40px_-12px_rgba(34,211,238,0.2)] backdrop-blur-md sm:p-6"
      aria-labelledby="overview-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="overview-heading" className="text-lg font-bold text-white sm:text-xl">
            個人學習總覽
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">依段考範圍彙整影片、測驗與技能練習進度</p>
        </div>
        {scopeOptions.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="段考切換">
            {scopeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={scopeId === opt.id}
                onClick={() => setScopeId(opt.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  scopeId === opt.id
                    ? "border-cyan-400/70 bg-cyan-500/25 text-white shadow-sm"
                    : "border-slate-500/50 bg-slate-800/80 text-slate-100 hover:border-cyan-400/40 hover:bg-slate-800",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-16 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span>載入中…</span>
        </div>
      ) : null}

      {data ? (
        <div className={cn("mt-6 space-y-8", loading ? "opacity-70" : "")}>
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-cyan-300">一、我的學習總覽</h3>
              <p className="text-xs text-slate-200 sm:text-sm">
                目前段考範圍：<span className="font-semibold text-white">{data.examScope.title}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard title="整體完成率" value={`${data.overallCompletionRate}%`} sub="影片＋技能精熟綜合" />
              <StatCard title="影片完成率" value={`${data.videoCompletionRate}%`} />
              <StatCard
                title="測驗通過率"
                value={data.hasQuizzesInScope ? `${data.quizPassRate}%` : "—"}
                sub={data.hasQuizzesInScope ? "已送出之測驗通過比例" : "尚未建立測驗"}
              />
              <StatCard
                title="技能熟練度平均"
                value={data.totalSkills > 0 ? `${data.averageMasteryScore}%` : "—"}
                sub={data.totalSkills > 0 ? "有練習紀錄之技能平均" : "尚未開始"}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                title="影片進度"
                value={`${data.completedVideos} / ${data.totalVideos || 0}`}
                sub="已完成／總數"
              />
              <StatCard
                title="技能精熟"
                value={`${data.masteredSkills} / ${data.totalSkills || 0}`}
                sub="已精熟／總技能"
              />
              <StatCard title="今日觀看影片" value={`${data.todayWatchedVideos}`} sub="部（段考範圍內）" />
              <StatCard title="今日作答題數" value={`${data.todayAnsweredQuestions}`} sub="含測驗作答" />
            </div>
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-600/50 bg-slate-950/60 p-4">
              <ProgressBar variant="dark" value={data.overallCompletionRate} label="整體完成率" />
              <ProgressBar variant="dark" value={data.videoCompletionRate} label="影片完成率" />
              {data.hasQuizzesInScope ? <ProgressBar variant="dark" value={data.quizPassRate} label="測驗通過率" /> : null}
              {data.totalSkills > 0 ? (
                <ProgressBar variant="dark" value={data.averageMasteryScore} label="技能平均熟練度" />
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-amber-300">二、我的弱點提醒</h3>
            {data.weakSkills.length === 0 ? (
              <p className="rounded-2xl border border-slate-600/50 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
                目前尚無明顯弱點，請持續完成影片與測驗。
              </p>
            ) : (
              <ul className="space-y-3">
                {data.weakSkills.map((w, idx) => (
                  <li
                    key={w.skillCode}
                    className="rounded-2xl border border-amber-400/25 bg-amber-950/25 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-50">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        建議加強 · TOP {idx + 1}
                      </span>
                      <p className="mt-2 font-semibold text-white">{w.skillName}</p>
                      <p className="mt-1 text-xs font-medium text-amber-100 sm:text-sm">錯誤率 {w.wrongRatePercent}%</p>
                      <p className="mt-2 text-xs text-slate-200 sm:text-sm">{w.recentWrongFocus}</p>
                    </div>
                    {w.recommendedVideo ? (
                      <Link
                        href={`/student/video/${w.recommendedVideo.id}`}
                        className="mt-3 inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 sm:mt-0"
                      >
                        <BookMarked className="h-4 w-4" aria-hidden />
                        推薦影片：{w.recommendedVideo.title}
                        <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
                      </Link>
                    ) : (
                      <p className="mt-2 text-xs text-slate-300 sm:mt-0">尚無對應推薦影片</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-emerald-300">三、今日建議任務</h3>
            {data.todayTasksCompleted ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-50">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                今日任務已完成
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-600/50 bg-slate-950/50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                    <Target className="h-4 w-4" aria-hidden />
                    建議觀看影片
                  </p>
                  {data.recommendedVideos.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-200">目前沒有待觀看影片，可至段考頁複習已學內容。</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {data.recommendedVideos.map((v) => (
                        <li key={v.id}>
                          <Link
                            href={`/student/video/${v.id}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:border-cyan-400/40"
                          >
                            <span className="min-w-0 truncate">{v.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-600/50 bg-slate-950/50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
                    <BookMarked className="h-4 w-4" aria-hidden />
                    建議練習技能
                  </p>
                  {data.recommendedSkills.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-200">目前沒有急需練習的技能。</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {data.recommendedSkills.map((s) => (
                        <li key={s.code}>
                          <Link
                            href={skillHref(s.code)}
                            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:border-violet-400/40"
                          >
                            <span className="min-w-0 truncate">{s.name}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
