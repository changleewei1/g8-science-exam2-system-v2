"use client";

import { useCallback, useEffect, useState } from "react";
import type { TeacherTrackingMeta } from "@/lib/admin/teacher-tracking-types";

export function useTeacherClasses() {
  const [meta, setMeta] = useState<TeacherTrackingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/video-tracking/teacher-meta", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as TeacherTrackingMeta & { error?: string };
      if (!res.ok) {
        setError(json.error === "UNAUTHORIZED" ? "請重新登入" : "無法載入班級資料");
        setMeta(null);
        return;
      }
      setMeta(json);
    } catch {
      setError("網路錯誤");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { meta, loading, error, refetch };
}

export type { TeacherTrackingMeta } from "@/lib/admin/teacher-tracking-types";
