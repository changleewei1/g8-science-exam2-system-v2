"use client";

import { motion } from "framer-motion";
import type { GradeDashboardBlock } from "@/lib/student-dashboard-types";
import { SemesterSection } from "@/components/student/dashboard/SemesterSection";

type Props = {
  block: GradeDashboardBlock;
  sectionIndex?: number;
};

export function GradeSection({ block, sectionIndex = 0 }: Props) {
  const openCount = [...block.fall, ...block.spring].filter((c) => c.isOpen).length;

  return (
    <motion.section
      id={block.gradeNumber === 8 ? "exam-scopes" : undefined}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: sectionIndex * 0.05 }}
      className="scroll-mt-24 space-y-6 rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-7"
    >
      <motion.div
        className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{block.gradeLabel}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {openCount > 0 ? `已開放 ${openCount} 個段考範圍` : "目前尚無開放範圍，請留意老師公告"}
          </p>
        </div>
      </motion.div>

      <SemesterSection title="上學期" cards={block.fall} baseIndex={0} />
      <SemesterSection title="下學期" cards={block.spring} baseIndex={3} />
    </motion.section>
  );
}
