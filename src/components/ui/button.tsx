import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "glass" | "student" | "teacher";
  size?: "default" | "lg" | "xl";
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-slate-800 text-white border border-white/10 hover:bg-slate-700 shadow-lg shadow-black/20",
  ghost: "bg-transparent text-slate-200 hover:bg-white/10 border border-transparent",
  glass:
    "bg-white/5 text-slate-100 border border-cyan-400/30 backdrop-blur-md hover:bg-white/10 hover:border-cyan-400/50 shadow-[0_0_24px_rgba(34,211,238,0.15)]",
  student:
    "border-0 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white shadow-[0_0_40px_rgba(34,211,238,0.45)] hover:shadow-[0_0_56px_rgba(34,211,238,0.55)] hover:brightness-110",
  teacher:
    "border-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-600 text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_56px_rgba(139,92,246,0.5)] hover:brightness-110",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-11 px-5 py-2 text-sm",
  lg: "h-14 px-8 text-base",
  xl: "h-auto min-h-[4.5rem] w-full flex-col gap-1 px-8 py-4 text-lg sm:min-w-[280px] sm:w-auto",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:pointer-events-none disabled:opacity-50",
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
