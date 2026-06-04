import type { SubjectServiceContext } from "@/lib/services/subject-context";

/** AI 產題、候選題、老師審核 — 與 admin question-generator、candidates API 對齊的模組邊界。 */
export type QuestionGenerationContext = SubjectServiceContext & {
  videoId?: string | null;
  skillCode?: string | null;
};

export function assertQuestionGenerationContext(_ctx: QuestionGenerationContext): void {
  // 預留
}
