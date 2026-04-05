import { Suspense } from "react";
import QuizPageClient from "./QuizPageClient";

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-600">載入試題…</p>}>
      <QuizPageClient />
    </Suspense>
  );
}
