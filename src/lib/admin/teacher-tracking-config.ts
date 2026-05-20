import { getEnv } from "@/lib/env";

export type TeacherSessionClaims = {
  teacherLabel: string;
  allowedClasses?: string[];
};

/**
 * 老師學習追蹤：登入時寫入 JWT 的聲明（搭配 TEACHER_TRACKING_* 環境變數）。
 * 未設定 TEACHER_TRACKING_CLASSES 時不限制班級（相容單一管理員／舊部署）。
 */
export function getTeacherClaimsForJwt(): TeacherSessionClaims {
  const raw = getEnv("TEACHER_TRACKING_CLASSES")?.trim();
  const label = getEnv("TEACHER_TRACKING_LABEL")?.trim() || "國二理化";
  const parts = raw
    ? raw
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return {
    teacherLabel: label,
    ...(parts.length > 0 ? { allowedClasses: parts } : {}),
  };
}

export function getTeacherScopeFilter(): { grade: string; subject: string } {
  return {
    grade: getEnv("TEACHER_TRACKING_GRADE")?.trim() || "國二",
    subject: getEnv("TEACHER_TRACKING_SUBJECT")?.trim() || "理化",
  };
}
