import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { QuizMediaImage } from "@/components/student/QuizMediaImage";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { getQuizAttemptDetailUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { buildVideoPageQuery } from "@/lib/student-video-context";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuizResultPage({ params, searchParams }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { attemptId } = await params;
  const sp = await searchParams;
  const fromRaw = typeof sp.from === "string" ? sp.from.toLowerCase() : "";
  const fromTask = fromRaw === "task";
  const taskIdParam = sp.taskId;
  const taskId =
    typeof taskIdParam === "string" && taskIdParam.length > 0 ? taskIdParam : null;

  const uc = getQuizAttemptDetailUseCase();
  const data = await uc.execute(attemptId, session.studentId);
  if (!data) notFound();

  const { attempt, quiz, video, questions } = data;

  const videoBackHref = video
    ? `/student/video/${video.id}${buildVideoPageQuery({ fromTask, taskId })}`
    : "/student/dashboard";

  let primaryHref = "/student/dashboard";
  if (fromTask) {
    primaryHref = `/student/tasks${taskId ? `?taskId=${encodeURIComponent(taskId)}` : ""}`;
  } else if (video) {
    primaryHref = `/student/unit/${video.unitId}`;
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        {video ? (
          <StudentBackLink href={videoBackHref}>返回影片</StudentBackLink>
        ) : (
          <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
        )}
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">測驗結果</h1>
      <p className="mt-2 text-slate-600">
        影片：{video?.title ?? "—"}
      </p>
      <p className="mt-4 text-lg">
        得分：<span className="font-semibold text-teal-700">{attempt.score}</span> /{" "}
        {questions.length}（通過門檻 {quiz.passScore} 題）
      </p>
      <p className="mt-2 text-lg font-medium">
        {attempt.isPassed ? (
          <span className="text-teal-700">通過</span>
        ) : (
          <span className="text-amber-700">未通過</span>
        )}
      </p>
      <ul className="mt-8 space-y-4">
        {questions.map((q, idx) => {
          const ans = data.answers.get(q.id);
          const ok = ans?.is_correct ?? false;
          return (
            <li
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <p className="font-medium text-slate-900">
                {idx + 1}. {q.questionText?.trim() ? q.questionText : "（請依圖作答）"}
              </p>
              <p className="mt-1 text-xs text-slate-500">技能：{q.skillCode}</p>
              {q.questionImageUrl?.trim() ? (
                <div className="mt-2">
                  <QuizMediaImage src={q.questionImageUrl} alt="" />
                </div>
              ) : null}
              {q.referenceImageUrl?.trim() ? (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-slate-500">參考圖</p>
                  <QuizMediaImage src={q.referenceImageUrl} alt="" />
                </div>
              ) : null}
              <p className="mt-2">
                你的答案：{ans?.selected_answer ?? "—"}{" "}
                {ok ? (
                  <span className="text-teal-600">（正確）</span>
                ) : (
                  <span className="text-red-600">（錯誤，正解 {q.correctAnswer}）</span>
                )}
              </p>
              {!ok ? (
                <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-950">詳解</p>
                  {q.explanation?.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {q.explanation.trim()}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      本題目前沒有文字詳解，建議對照上方題目與課程影片再複習一次。
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Link
        href={primaryHref}
        className="interactive-btn mt-8 inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        回上一頁
      </Link>
    </main>
  );
}
