"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, ClipboardCheck, Users, UserX } from "lucide-react";
import type {
  StudentOverviewRow,
  TrackingSummary,
  VideoWatchStats,
} from "@/domain/services/admin-dashboard-service";
import { LearningScopeFilter } from "@/components/admin/LearningScopeFilter";
import { SummaryCard } from "@/components/admin/SummaryCard";
import { VideoTrackingStudentTable } from "@/components/admin/VideoTrackingStudentTable";
import { VideoTrackingVideosTable } from "@/components/admin/VideoTrackingVideosTable";
import {
  DEFAULT_LEARNING_SCOPE,
  formatScopeBadge,
  learningScopeFromSearchParams,
  learningScopeToSearchParams,
  resolveExamScopeFromLearningScope,
  type ExamScopeLike,
  type LearningScope,
} from "@/lib/admin/learning-scope";
import { cn } from "@/lib/utils";

type ScopeDto = ExamScopeLike;

type Props = {
  scopes: ScopeDto[];
};

type OverviewPayload = {
  students: StudentOverviewRow[];
  videos: VideoWatchStats[];
  summary: TrackingSummary;
};

const emptySummary: TrackingSummary = {
  studentCount: 0,
  avgVideoCompletion: 0,
  avgQuizPassRate: 0,
  incompleteCount: 0,
};

export function VideoTrackingOverviewClient({ scopes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialApplied = useMemo(
    () => learningScopeFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [draft, setDraft] = useState<LearningScope>(initialApplied);
  const [applied, setApplied] = useState<LearningScope>(initialApplied);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload>({
    students: [],
    videos: [],
    summary: emptySummary,
  });

  const examScopes = useMemo(() => scopes, [scopes]);

  const resolvedScope = useMemo(
    () => resolveExamScopeFromLearningScope(examScopes, applied),
    [examScopes, applied],
  );

  const fetchOverview = useCallback(async (scope: LearningScope, examScopeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = learningScopeToSearchParams(scope);
      params.set("examScopeId", examScopeId);
      const res = await fetch(`/api/admin/video-tracking/overview?${params.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as OverviewPayload & { error?: string };
      if (!res.ok) {
        setError(json.error === "MISSING_EXAM_SCOPE_ID" ? "請選擇有效的段考範圍" : "無法載入資料，請稍後再試");
        setData({ students: [], videos: [], summary: emptySummary });
        return;
      }
      setData({
        students: json.students ?? [],
        videos: json.videos ?? [],
        summary: json.summary ?? emptySummary,
      });
    } catch {
      setError("網路錯誤，請稍後再試");
      setData({ students: [], videos: [], summary: emptySummary });
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(
    (next: LearningScope) => {
      setApplied(next);
      const params = learningScopeToSearchParams(next);
      router.replace(`/admin/video-tracking?${params.toString()}`, { scroll: false });

      const match = resolveExamScopeFromLearningScope(examScopes, next);
      if (!match) {
        setError(`找不到「${next.grade}${next.subject}${next.exam}」的學習範圍，請確認系統已建立對應段考。`);
        setData({ students: [], videos: [], summary: emptySummary });
        return;
      }
      void fetchOverview(next, match.id);
    },
    [examScopes, fetchOverview, router],
  );

  useEffect(() => {
    const match = resolveExamScopeFromLearningScope(examScopes, initialApplied);
    if (match) {
      void fetchOverview(initialApplied, match.id);
    } else {
      const fallback = resolveExamScopeFromLearningScope(examScopes, DEFAULT_LEARNING_SCOPE);
      if (fallback) {
        setDraft(DEFAULT_LEARNING_SCOPE);
        setApplied(DEFAULT_LEARNING_SCOPE);
        void fetchOverview(DEFAULT_LEARNING_SCOPE, fallback.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅初次依 URL 載入
  }, []);

  const scopeBadge = formatScopeBadge(applied);

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h1 className="text-2xl font-bold text-white sm:text-3xl">學生學習總覽</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          依年級、科目與段考範圍查看學生影片觀看、測驗表現與學習報告。
        </p>
        <span className="inline-flex flex-wrap items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
          {scopeBadge}
          {resolvedScope ? (
            <span className="text-cyan-300/70">（{resolvedScope.title}）</span>
          ) : null}
        </span>
      </motion.header>

      <LearningScopeFilter
        draft={draft}
        onChange={setDraft}
        onApply={() => applyFilters(draft)}
        loading={loading}
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="學生人數"
          value={data.summary.studentCount}
          description="目前篩選範圍內的學生總數"
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
          title="未完成學生"
          value={data.summary.incompleteCount}
          description="影片或測驗尚未全部完成"
          icon={UserX}
          accent="amber"
          index={3}
        />
      </section>

      <section className={cn("space-y-3", loading && "pointer-events-none opacity-60")}>
        <h2 className="text-lg font-semibold text-white">學生列表</h2>
        <p className="text-sm text-slate-500">
          任務完成率依班級最新學習任務計算；若班級尚未指派任務會顯示「尚未指定任務」。
        </p>
        <VideoTrackingStudentTable rows={data.students} examScopeId={resolvedScope?.id ?? null} />
      </section>

      <section className={cn("space-y-3", loading && "pointer-events-none opacity-60")}>
        <h2 className="text-lg font-semibold text-white">各影片學習狀況</h2>
        <p className="text-sm text-slate-500">
          先瀏覽各單元整體狀況，點擊單元卡片再展開影片明細
        </p>
        <VideoTrackingVideosTable videos={data.videos} />
      </section>
    </div>
  );
}
