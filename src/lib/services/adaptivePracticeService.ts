import type { SubjectServiceContext } from "@/lib/services/subject-context";

export type AdaptivePracticeContext = SubjectServiceContext & {
  skillCode?: string | null;
};

export function assertAdaptivePracticeContext(_ctx: AdaptivePracticeContext): void {
  // 預留：與 lab/practice、skill 熟練度 API 對齊
}
