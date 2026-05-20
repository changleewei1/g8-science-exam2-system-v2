"use client";

import { motion } from "framer-motion";
import type { ExamCard } from "@/lib/student-dashboard-types";
import { ExamScopeCard } from "@/components/student/dashboard/ExamScopeCard";

type Props = {
  title: string;
  cards: ExamCard[];
  baseIndex?: number;
};

export function SemesterSection({ title, cards, baseIndex = 0 }: Props) {
  return (
    <div className="space-y-3">
      <motion.h3
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="text-sm font-semibold text-cyan-100/90"
      >
        {title}
      </motion.h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => (
          <ExamScopeCard key={card.id} card={card} index={baseIndex + i} />
        ))}
      </div>
    </div>
  );
}
