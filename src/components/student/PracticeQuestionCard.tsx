"use client";

type Choices = { A: string; B: string; C: string; D: string };
type ChoiceKey = keyof Choices;

type PracticeQuestionCardProps = {
  contextText: string;
  questionText: string;
  choices: Choices;
  selectedAnswer: ChoiceKey | null;
  submittedAnswer: ChoiceKey | null;
  correctAnswer?: string;
  disabled?: boolean;
  onSelect: (choice: ChoiceKey) => void;
  onSubmit: () => void;
};

function buttonStyle(params: {
  isSubmitted: boolean;
  isSelected: boolean;
  isCorrect: boolean;
  isWrongPicked: boolean;
}) {
  const { isSubmitted, isSelected, isCorrect, isWrongPicked } = params;
  if (isSubmitted && isCorrect) {
    return "border-emerald-400 bg-emerald-50 text-emerald-900";
  }
  if (isSubmitted && isWrongPicked) {
    return "border-rose-400 bg-rose-50 text-rose-900";
  }
  if (!isSubmitted && isSelected) {
    return "border-teal-500 bg-teal-50 text-teal-900";
  }
  return "border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-slate-50";
}

export function PracticeQuestionCard(props: PracticeQuestionCardProps) {
  const {
    contextText,
    questionText,
    choices,
    selectedAnswer,
    submittedAnswer,
    correctAnswer,
    disabled = false,
    onSelect,
    onSubmit,
  } = props;
  const isSubmitted = Boolean(submittedAnswer);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{contextText}</p>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">題目</h2>
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-900">{questionText}</p>

      <div className="mt-6 grid gap-3">
        {(["A", "B", "C", "D"] as const).map((key) => {
          const isSelected = selectedAnswer === key;
          const normalizedCorrect = (correctAnswer ?? "").trim().toUpperCase().slice(0, 1);
          const isCorrect = isSubmitted && normalizedCorrect === key;
          const isWrongPicked = isSubmitted && submittedAnswer === key && normalizedCorrect !== key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || isSubmitted}
              onClick={() => onSelect(key)}
              className={`flex min-h-14 items-start gap-3 rounded-xl border px-4 py-3 text-left text-base transition ${buttonStyle({
                isSubmitted,
                isSelected,
                isCorrect,
                isWrongPicked,
              })} disabled:cursor-not-allowed disabled:opacity-85`}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                {key}
              </span>
              <span className="flex-1">{choices[key]}</span>
              {isSubmitted && isCorrect ? <span className="font-semibold text-emerald-700">正確</span> : null}
              {isSubmitted && isWrongPicked ? <span className="font-semibold text-rose-700">你的答案</span> : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled || isSubmitted || !selectedAnswer}
        onClick={onSubmit}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:min-w-44"
      >
        提交
      </button>
    </section>
  );
}
