"use client";

type PracticeStatusPanelProps = {
  answeredCount: number;
  correctCount: number;
  score: number;
  difficulty: string;
  elapsedSeconds: number;
  challengeStage: string;
  streak: number;
};

function formatDuration(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function PracticeStatusPanel(props: PracticeStatusPanelProps) {
  const { answeredCount, correctCount, score, difficulty, elapsedSeconds, challengeStage, streak } = props;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold text-slate-500">練習狀態</h2>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">已解答題數</dt>
          <dd className="font-semibold text-slate-900">{answeredCount}</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">答對題數</dt>
          <dd className="font-semibold text-emerald-700">{correctCount}</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">熟練度分數</dt>
          <dd className="font-semibold text-teal-800">{score} / 100</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">目前難度</dt>
          <dd className="font-semibold text-slate-900">{difficulty}</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">花費時間</dt>
          <dd className="font-semibold text-slate-900">{formatDuration(elapsedSeconds)}</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">挑戰階段</dt>
          <dd className="font-semibold text-indigo-700">{challengeStage}</dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="text-slate-500">連續答對</dt>
          <dd className="font-semibold text-slate-900">{streak} 題</dd>
        </div>
      </dl>
    </aside>
  );
}
