import { Network } from "lucide-react";

/** 右側 HUD 風格技能樹插圖（純 CSS／SVG） */
export function SkillTreeHudIllustration() {
  return (
    <div
      className="relative flex h-[200px] w-full min-w-[180px] max-w-[280px] shrink-0 items-center justify-center sm:h-[220px] sm:max-w-[320px]"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-200/50 via-sky-100/40 to-indigo-100/50 blur-2xl" />
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-cyan-200/80 bg-white/70 shadow-[0_0_40px_rgba(34,211,238,0.25)] backdrop-blur-md sm:h-44 sm:w-44">
        <div className="absolute inset-3 rounded-full border border-dashed border-cyan-300/60" />
        <div className="absolute inset-8 rounded-full border border-cyan-400/30" />
        <div className="relative flex flex-col items-center gap-1 text-cyan-700">
          <Network className="h-14 w-14 sm:h-16 sm:w-16" strokeWidth={1.25} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-600/90">Skill Tree</span>
        </div>
        <span className="absolute left-4 top-10 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        <span className="absolute right-6 top-14 h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_#0ea5e9]" />
        <span className="absolute bottom-12 left-10 h-1.5 w-1.5 rounded-full bg-indigo-400" />
        <span className="absolute bottom-10 right-8 h-2 w-2 rounded-full bg-cyan-300" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-cyan-300/40" viewBox="0 0 160 160">
          <path d="M40 48 L80 80 M120 52 L80 80 M80 80 L56 118 M80 80 L112 120" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
