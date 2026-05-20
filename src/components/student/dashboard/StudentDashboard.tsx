"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, Clock, Sparkles } from "lucide-react";
import { DashboardHashScroll } from "@/components/student/DashboardHashScroll";
import { DashboardHero } from "@/components/student/dashboard/DashboardHero";
import { DashboardTechBackground } from "@/components/student/dashboard/DashboardTechBackground";
import { GradeSection } from "@/components/student/dashboard/GradeSection";
import { PersonalLearningOverview } from "@/components/student/dashboard/PersonalLearningOverview";
import { SummaryCard } from "@/components/student/dashboard/SummaryCard";
import type { StudentDashboardPayload } from "@/lib/student-dashboard-types";

type Props = {
  data: StudentDashboardPayload;
};

export function StudentDashboard({ data }: Props) {
  const { summary, hero, grades, studentName, overviewScopeOptions, defaultOverviewScopeId } = data;

  return (
    <>
      <DashboardTechBackground />
      <DashboardHashScroll />
      <div className="relative min-h-[calc(100dvh-3.5rem)] text-slate-100">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <DashboardHero studentName={studentName} hero={hero} />

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-8 rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6"
            aria-labelledby="summary-heading"
          >
            <h2 id="summary-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600">
              學習進度總覽
            </h2>
            <motion.div
              className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <SummaryCard
                icon={BookOpen}
                label="已開放範圍"
                value={`${summary.openScopeCount}`}
                hint="可立即開始學習"
                index={0}
              />
              <SummaryCard
                icon={Sparkles}
                label="已完成技能"
                value={`${summary.masteredSkills}`}
                hint="熟練度達標"
                index={1}
              />
              <SummaryCard
                icon={BarChart3}
                label="平均熟練度"
                value={summary.averageMastery > 0 ? `${summary.averageMastery}%` : "—"}
                hint="智慧練習統計"
                index={2}
              />
              <SummaryCard
                icon={Clock}
                label="本週學習時間"
                value={summary.weeklyLearningLabel}
                hint="影片＋練習估算"
                index={3}
              />
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-10"
            aria-labelledby="personal-overview-heading"
          >
            <h2 id="personal-overview-heading" className="sr-only">
              個人學習總覽
            </h2>
            <Suspense
              fallback={
                <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-8 text-center text-slate-300">
                  載入個人學習總覽…
                </div>
              }
            >
              <PersonalLearningOverview
                initialScopeId={defaultOverviewScopeId}
                scopeOptions={overviewScopeOptions}
              />
            </Suspense>
          </motion.section>

          <div className="mt-10 space-y-10">
            {grades.map((block, i) => (
              <GradeSection key={block.gradeNumber} block={block} sectionIndex={i} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
