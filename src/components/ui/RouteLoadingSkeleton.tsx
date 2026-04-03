/** 路由切換時的骨架畫面（給 loading.tsx 使用） */
export function RouteLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-10 sm:px-6" aria-busy="true" aria-label="載入中">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="mt-6 h-36 rounded-2xl bg-slate-100" />
      <div className="mt-4 h-48 rounded-2xl bg-slate-100" />
    </div>
  );
}
