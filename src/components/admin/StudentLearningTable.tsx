"use client";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  loading?: boolean;
};

export function StudentLearningTable({ children, loading }: Props) {
  return (
    <div className={cn("relative rounded-2xl", loading && "min-h-[120px]")}>
      {loading ? (
        <div
          className="absolute inset-0 z-[1] flex items-center justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]"
          aria-hidden
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : null}
      {children}
    </div>
  );
}
