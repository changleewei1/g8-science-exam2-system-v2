type StudentLightTechBackgroundProps = {
  /**
   * fixed：整個視窗底層（登入、全頁亮色）。
   * absolute：僅填滿上一層 `relative` 區塊（例如首頁 Hero 下方的亮色區）。
   */
  position?: "fixed" | "absolute";
};

/** 學生端亮色科技感背景（技能頁、段考詳情、首頁下半部等共用） */
export function StudentLightTechBackground({
  position = "fixed",
}: StudentLightTechBackgroundProps) {
  const posClass = position === "fixed" ? "fixed inset-0 -z-10" : "absolute inset-0 -z-10";
  return (
    <div className={`pointer-events-none ${posClass} overflow-hidden bg-[#F6FAFF]`} aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-cyan-200/25 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-[280px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-indigo-200/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(125, 211, 252, 0.35), transparent 55%)",
        }}
      />
    </div>
  );
}
