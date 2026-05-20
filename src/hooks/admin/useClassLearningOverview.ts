"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  StudentOverviewRow,
  TrackingSummary,
  VideoWatchStats,
} from "@/domain/services/admin-dashboard-service";

const emptySummary: TrackingSummary = {
  studentCount: 0,
  avgVideoCompletion: 0,
  avgQuizPassRate: 0,
  incompleteCount: 0,
};

export type ClassLearningOverviewPayload = {
  students: StudentOverviewRow[];
  videos: VideoWatchStats[];
  summary: TrackingSummary;
};

export function useClassLearningOverview(examScopeId: string | null, classId: string) {
  const [data, setData] = useState<ClassLearningOverviewPayload>({
    students: [],
    videos: [],
    summary: emptySummary,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!examScopeId || !classId) {
      setData({ students: [], videos: [], summary: emptySummary });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("examScopeId", examScopeId);
      p.set("classId", classId);
      const res = await fetch(`/api/admin/video-tracking/overview?${p.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as ClassLearningOverviewPayload & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        if (json.error === "FORBIDDEN_CLASS") {
          setError("無權查看此班級。");
        } else if (json.error === "CLASS_REQUIRED") {
          setError(json.message ?? "請指定班級。");
        } else {
          setError("無法載入資料，請稍後再試。");
        }
        setData({ students: [], videos: [], summary: emptySummary });
        return;
      }
      setData({
        students: json.students ?? [],
        videos: json.videos ?? [],
        summary: json.summary ?? emptySummary,
      });
    } catch {
      setError("網路錯誤，請稍後再試。");
      setData({ students: [], videos: [], summary: emptySummary });
    } finally {
      setLoading(false);
    }
  }, [examScopeId, classId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
