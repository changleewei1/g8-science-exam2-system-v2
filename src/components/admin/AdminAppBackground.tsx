/** 老師後台共用深色科技底（與學習進度追蹤區一致） */
export function AdminAppBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,#1e3a5f_0%,#0a0f1f_50%,#050810_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-500/12 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-32 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]"
        aria-hidden
      />
    </>
  );
}
