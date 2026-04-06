import { redirect, notFound } from "next/navigation";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import type { QuizQuestion } from "@/domain/entities";
import { VideoQuizEditorClient, type QuestionFormRow } from "./VideoQuizEditorClient";

export const dynamic = "force-dynamic";

function parseCorrect(raw: string): "A" | "B" | "C" | "D" {
  const c = raw?.trim().toUpperCase().charAt(0);
  if (c === "A" || c === "B" || c === "C" || c === "D") return c;
  return "A";
}

function emptyRow(skillCode: string): QuestionFormRow {
  return {
    questionText: "",
    choiceA: "",
    choiceB: "",
    choiceC: "",
    choiceD: "",
    correctAnswer: "A",
    explanation: "",
    difficulty: "基礎",
    skillCode,
  };
}

function toFormRows(questions: QuizQuestion[], defaultSkill: string): QuestionFormRow[] {
  const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
  const out: QuestionFormRow[] = [];
  for (let i = 0; i < 3; i++) {
    const q = sorted[i];
    if (q) {
      out.push({
        questionText: q.questionText,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        correctAnswer: parseCorrect(q.correctAnswer),
        explanation: q.explanation ?? "",
        difficulty: q.difficulty ?? "基礎",
        skillCode: q.skillCode || defaultSkill,
      });
    } else {
      out.push(emptyRow(defaultSkill));
    }
  }
  return out;
}

type Props = { params: Promise<{ quizId: string }> };

export default async function AdminVideoQuizEditPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { quizId } = await params;
  const { quizzes, quizQuestions, videos, skillTags } = getRepositories();

  const quiz = await quizzes.findById(quizId);
  if (!quiz) notFound();
  const video = await videos.findById(quiz.videoId);
  if (!video) notFound();

  const questions = await quizQuestions.findByQuizId(quizId);
  const tags = await skillTags.findAll();
  const skillOptions = tags.map((t) => ({ code: t.code, name: t.name }));
  const defaultSkill = tags[0]?.code ?? "";

  if (skillOptions.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        資料庫尚無技能標籤（skill_tags），無法設定技能代碼。請先執行 seed 或匯入技能資料。
      </div>
    );
  }

  const initialRows = toFormRows(questions, defaultSkill);

  return (
    <VideoQuizEditorClient
      quizId={quizId}
      quizTitle={quiz.title}
      videoTitle={video.title}
      initialRows={initialRows}
      skillOptions={skillOptions}
    />
  );
}
