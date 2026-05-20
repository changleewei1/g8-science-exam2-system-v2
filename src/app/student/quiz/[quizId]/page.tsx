import { Suspense } from "react";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";
import QuizPageClient from "./QuizPageClient";

export default function QuizPage() {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />
      <Suspense
        fallback={
          <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <p className="rounded-3xl border border-cyan-200/60 bg-white/75 py-16 text-center text-sm font-medium text-slate-600 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl">
              載入試題…
            </p>
          </main>
        }
      >
        <QuizPageClient />
      </Suspense>
    </div>
  );
}
