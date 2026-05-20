"use client";

import { motion } from "framer-motion";
import { AlertCircle, BarChart3, ClipboardCheck, Sparkles, UserX, Users } from "lucide-react";
import { SummaryCard } from "@/components/admin/SummaryCard";
import { VideoTrackingStudentTable } from "@/components/admin/VideoTrackingStudentTable";
import { VideoTrackingVideosTable } from "@/components/admin/VideoTrackingVideosTable";
import { useClassLearningOverview } from "@/hooks/admin/useClassLearningOverview";
import { cn } from "@/lib/utils";

type Props = {
  classId: string;
  examScopeId: string | null;
  scopeTitle?: string | null;
};

export function ClassLearningDashboard({ classId, examScopeId, scopeTitle }: Props) {
  const { data, loading, error } = useClassLearningOverview(examScopeId, classId);

  if (!examScopeId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        請先選擇段考範圍。
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/55 py-20 backdrop-blur-[2px]"
          aria-busy
          aria-label="載入中"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" />
          </div>
          <p className="text-xs font-medium text-slate-600">載入班級學習資料…</p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>{error}</p>
        </div>
      ) : null}

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("space-y-1", loading && "opacity-60")}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-800/80">班級 {classId}</p>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">學習數據總覽</h2>
        {scopeTitle ? <p className="text-sm text-slate-600">{scopeTitle}</p> : null}
      </motion.header>

      <section className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", loading && "opacity-60")}>
        <SummaryCard
          title="學生人數"
          value={data.summary.studentCount}
          description="此班級在目前段考範圍內"
          icon={Users}
          accent="cyan"
          index={0}
        />
        <SummaryCard
          title="平均影片完成度"
          value={`${data.summary.avgVideoCompletion}%`}
          description="全班影片觀看完成比例"
          icon={BarChart3}
          accent="blue"
          index={1}
        />
        <SummaryCard
          title="平均測驗表現"
          value={`${data.summary.avgQuizPassRate}%`}
          description="已提交測驗的通過比例"
          icon={ClipboardCheck}
          accent="violet"
          index={2}
        />
        <SummaryCard
          title="待加強學生"
          value={data.summary.incompleteCount}
          description="影片或測驗尚未全部完成"
          icon={UserX}
          accent="amber"
          index={3}
        />
      </section>

      <section
        className={cn(
          "rounded-2xl border border-dashed border-cyan-200/60 bg-cyan-50/40 p-4 sm:p-5",
          loading && "opacity-60",
        )}
      >
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Skill 弱點 · 今日學習</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              班級級 skill 聚合與「今日誰在線」將與{" "}
              <strong className="text-slate-800">LINE 推播／每日 digest</strong>{" "}
              共用資料；目前以「待加強學生」作為高風險指標，後續可接{" "}
              <code className="rounded bg-white/80 px-1 text-[11px]">ClassWeaknessAnalysisService</code> 與{" "}
              <code className="rounded bg-white/80 px-1 text-[11px]">/api/cron/daily-report</code>。
            </p>
          </div>
        </div>
      </section>

      <section className={cn("space-y-3", loading && "opacity-60")}>
        <h3 className="text-lg font-semibold text-slate-900">學生列表</h3>
        <p className="text-sm text-slate-600">
          任務完成率依班級最新學習任務計算；若班級尚未指派任務會顯示「尚未指定任務」。
        </p>
        <VideoTrackingStudentTable rows={data.students} examScopeId={examScopeId} />
      </section>

      <section className={cn("space-y-3", loading && "opacity-60")}>
        <h3 className="text-lg font-semibold text-slate-900">各影片學習狀況</h3>
        <p className="text-sm text-slate-600">先瀏覽各單元整體狀況，點擊單元卡片再展開影片明細</p>
        <VideoTrackingVideosTable videos={data.videos} />
      </section>
    </div>
  );
}
