import Link from "next/link";
import { BookMarked } from "lucide-react";
import { SkillTreeHudIllustration } from "@/components/student/SkillTreeHudIllustration";
import { StudentBackLink } from "@/components/student/StudentBackLink";

type Props = {
  scopeId: string;
  title: string;
  description: string | null;
};

export function ExamScopeHero({ scopeId, title, description }: Props) {
  const blurb = description?.trim() || "請依序完成各單元影片與 AI 學習診斷。";

  return (
    <section className="mb-8 rounded-3xl border border-cyan-200/60 bg-white/75 p-5 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.25)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>

          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-100 shadow-inner shadow-cyan-100/80">
              <BookMarked className="h-5 w-5 text-cyan-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{blurb}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/student/exam-scope/${scopeId}/skills`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-[0_4px_24px_-4px_rgba(8,145,178,0.55)] transition hover:brightness-105 hover:shadow-[0_6px_28px_-4px_rgba(8,145,178,0.65)]"
                >
                  查看段考技能樹
                </Link>
              </div>
            </div>
          </div>
        </div>

        <SkillTreeHudIllustration />
      </div>
    </section>
  );
}
