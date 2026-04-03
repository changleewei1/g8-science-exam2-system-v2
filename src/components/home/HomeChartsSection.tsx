/**
 * 首頁圖表示意（假資料），純 SVG + Tailwind，無額外套件。
 * id 供頁尾 CTA「查看報告示意」錨點連結。
 */
export function HomeChartsSection() {
  return (
    <section
      id="report-demo"
      className="scroll-mt-20 border-t border-slate-200/80 bg-white px-4 py-14 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">學習數據示意</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
            以下為展示用假資料，實際產品將依班級與段考範圍帶入真實統計。
          </p>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* 雷達圖 */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-md shadow-slate-200/50 md:p-8">
            <h3 className="text-sm font-semibold text-slate-800">技能面向 · 雷達圖（示意）</h3>
            <p className="mt-1 text-xs text-slate-500">數值為 0–100 相對掌握度</p>
            <div className="mx-auto mt-6 flex max-w-[280px] justify-center">
              <RadarChartDemo />
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <li>
                <span className="text-teal-600">■</span> 本週
              </li>
              <li>
                <span className="text-slate-300">□</span> 上週
              </li>
            </ul>
          </div>

          {/* 長條圖 */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-md shadow-slate-200/50 md:p-8">
            <h3 className="text-sm font-semibold text-slate-800">單元影片 · 完成率（示意）</h3>
            <div className="mt-8 space-y-5">
              {[
                { label: "比與比例", pct: 88 },
                { label: "正比與反比", pct: 72 },
                { label: "平面座標與圖形", pct: 65 },
                { label: "綜合複習", pct: 41 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{row.label}</span>
                    <span className="font-medium text-slate-800">{row.pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 甘特風格 */}
        <div className="mt-8 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-6 shadow-md shadow-slate-200/50 md:p-8">
          <h3 className="text-sm font-semibold text-slate-800">預習任務 · 週進度（甘特風格示意）</h3>
          <p className="mt-1 text-xs text-slate-500">橫軸為本週工作日，條塊為建議完成區間</p>
          <div className="mt-6 overflow-x-auto">
            <GanttDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

/** 五軸雷達：假資料 */
function RadarChartDemo() {
  const cx = 100;
  const cy = 100;
  const r = 58;
  const labels = ["比例", "正反比", "座標", "圖形", "應用"];
  const n = labels.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const prevWeek = [0.55, 0.48, 0.62, 0.5, 0.45];
  const thisWeek = [0.78, 0.65, 0.72, 0.68, 0.58];

  function poly(points: number[]) {
    return points
      .map((t, i) => {
        const a = angle(i);
        const x = cx + r * t * Math.cos(a);
        const y = cy + r * t * Math.sin(a);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ")
      .concat(" Z");
  }

  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[280px]" role="img" aria-label="雷達圖示意">
      {gridLevels.map((lv) => (
        <polygon
          key={lv}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
          points={Array.from({ length: n }, (_, i) => {
            const a = angle(i);
            const x = cx + r * lv * Math.cos(a);
            const y = cy + r * lv * Math.sin(a);
            return `${x},${y}`;
          }).join(" ")}
        />
      ))}
      {labels.map((_, i) => {
        const a = angle(i);
        const x2 = cx + r * Math.cos(a);
        const y2 = cy + r * Math.sin(a);
        return (
          <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e2e8f0" strokeWidth="1" />
        );
      })}
      <path
        d={poly(prevWeek)}
        fill="rgba(148, 163, 184, 0.15)"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <path
        d={poly(thisWeek)}
        fill="rgba(13, 148, 136, 0.18)"
        stroke="#0d9488"
        strokeWidth="2"
      />
      {labels.map((label, i) => {
        const a = angle(i);
        const lx = cx + (r + 18) * Math.cos(a);
        const ly = cy + (r + 18) * Math.sin(a);
        return (
          <text
            key={label}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-600 text-[9px] font-medium"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function GanttDemo() {
  const days = ["一", "二", "三", "四", "五"];
  const rows = [
    { name: "比與比例｜預習影片 A", start: 0, span: 2, tone: "bg-teal-500/90" },
    { name: "比與比例｜預習影片 B", start: 1.5, span: 2, tone: "bg-teal-600/85" },
    { name: "座標圖形｜預習影片", start: 2.5, span: 2.5, tone: "bg-sky-500/85" },
  ];
  const dayWidth = 100 / 5;

  return (
    <div className="min-w-[520px]">
      <div className="mb-2 grid grid-cols-5 gap-0 border-b border-slate-200 pb-2 text-center text-xs font-medium text-slate-500">
        {days.map((d) => (
          <div key={d}>週{d}</div>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_4fr] items-center gap-3 text-sm">
            <span className="truncate text-xs text-slate-600 md:text-sm">{row.name}</span>
            <div className="relative h-9 rounded-lg bg-slate-100">
              <div
                className={`absolute top-1/2 h-7 -translate-y-1/2 rounded-lg shadow-sm ${row.tone}`}
                style={{
                  left: `${row.start * dayWidth}%`,
                  width: `${row.span * dayWidth}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
