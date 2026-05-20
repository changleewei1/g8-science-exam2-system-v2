import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { SkillTreeHudIllustration } from "@/components/student/SkillTreeHudIllustration";
import { StudentBackLink } from "@/components/student/StudentBackLink";

type Props = {
  unitTitle: string;
  unitCode: string;
  examScopeId: string;
  scopeTitle: string;
};

export function UnitPageHero({ unitTitle, unitCode, examScopeId, scopeTitle }: Props) {
  return (
    <section className="mb-8 rounded-3xl border border-cyan-200/60 bg-white/75 p-5 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.25)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <StudentBackLink href={`/student/exam-scope/${examScopeId}`}>返回段考範圍</StudentBackLink>
            <StudentBackLink href="/student/dashboard#exam-scopes">返回學習總覽</StudentBackLink>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-100 shadow-inner shadow-cyan-100/80">
              <Clapperboard className="h-5 w-5 text-cyan-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-xs font-semibold text-cyan-900 shadow-sm">
                所屬段考：{scopeTitle}
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{unitTitle}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
                  {unitCode}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                依序觀看單元影片，完成觀看後可進行 AI 學習診斷測驗，鞏固段考觀念。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/student/exam-scope/${examScopeId}/skills`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/80 bg-white px-5 text-sm font-semibold text-cyan-800 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50/80"
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
