import { Sparkles } from "lucide-react";
import { SkillTreeHudIllustration } from "@/components/student/SkillTreeHudIllustration";
import { StudentBackLink } from "@/components/student/StudentBackLink";

type Props = {
  scopeId: string;
  scopeTitle: string;
};

export function SkillsPracticeHero({ scopeId, scopeTitle }: Props) {
  return (
    <section className="mb-8 rounded-3xl border border-cyan-200/60 bg-white/75 p-5 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.25)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <StudentBackLink href={`/student/exam-scope/${scopeId}`}>返回段考範圍</StudentBackLink>
            <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-100 shadow-inner shadow-cyan-100/80">
              <Sparkles className="h-5 w-5 text-cyan-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">技能樹練習狀況</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                對照本次段考技能清單，查看智慧練習進度。熟練度來自最近一次練習 session，作答數為累計紀錄。
              </p>
              <p className="mt-4 inline-flex items-center rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1.5 text-sm font-semibold text-cyan-900 shadow-sm">
                段考範圍：{scopeTitle}
              </p>
            </div>
          </div>
        </div>

        <SkillTreeHudIllustration />
      </div>
    </section>
  );
}
