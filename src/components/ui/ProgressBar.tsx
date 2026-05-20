import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max?: number;
  label?: string;
  /** 深底區塊：標籤與軌道用淺色對比 */
  variant?: "light" | "dark";
};

export function ProgressBar({ value, max = 100, label, variant = "light" }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isDark = variant === "dark";
  return (
    <div className="w-full">
      {label && (
        <div
          className={cn(
            "mb-1 flex justify-between text-xs",
            isDark ? "text-slate-200" : "text-slate-600",
          )}
        >
          <span>{label}</span>
          <span className={cn("tabular-nums font-semibold", isDark ? "text-white" : "text-slate-800")}>
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn("h-2.5 w-full overflow-hidden rounded-full", isDark ? "bg-slate-700" : "bg-slate-200")}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isDark ? "bg-gradient-to-r from-cyan-500 to-teal-400" : "bg-teal-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
