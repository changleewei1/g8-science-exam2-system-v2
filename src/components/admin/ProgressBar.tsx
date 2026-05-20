"use client";

import { cn } from "@/lib/utils";
import { progressRateTier, type ProgressRateTier } from "@/lib/admin/video-learning-groups";

export type { ProgressRateTier };

type Props = {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  tier?: ProgressRateTier;
};

const tierBarClass: Record<ProgressRateTier, string> = {
  low: "from-amber-500 via-orange-500 to-red-500",
  mid: "from-cyan-400 via-sky-500 to-violet-500",
  high: "from-emerald-400 via-teal-400 to-cyan-400",
};

const tierLabelClass: Record<ProgressRateTier, string> = {
  low: "text-amber-300",
  mid: "text-cyan-200/90",
  high: "text-emerald-300",
};

export function AdminProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  labelClassName,
  showLabel = true,
  tier,
}: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const resolvedTier = tier ?? progressRateTier(pct);

  return (
    <div className={cn("w-full min-w-[88px]", className)}>
      {showLabel ? (
        <div className="mb-1 flex justify-end text-xs">
          <span
            className={cn(
              "font-medium tabular-nums",
              tierLabelClass[resolvedTier],
              labelClassName,
            )}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            tierBarClass[resolvedTier],
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export { AdminProgressBar as ProgressBar };
