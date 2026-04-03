"use client";

import type { GanttItem, StudentReportDto } from "@/domain/services/student-report-service";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COL_TEAL = "#0d9488";
const COL_SLATE = "#94a3b8";
const COL_AMBER = "#d97706";

type Props = {
  report: StudentReportDto;
};

function ganttStatusLabel(item: GanttItem, taskEndDate: string): string {
  if (item.status === "on_time") return "已完成";
  if (item.status === "late") return "已完成（較晚完成）";
  const end = new Date(`${taskEndDate}T23:59:59`);
  const now = new Date();
  if (now > end) return "逾期未完成";
  return "進行中";
}

export function ReportCharts({ report }: Props) {
  const radarData = report.radar.map((r) => ({
    skill: r.skillName.length > 12 ? `${r.skillName.slice(0, 12)}…` : r.skillName,
    accuracy: r.accuracy,
    full: r.skillName,
  }));

  const pieRaw = [
    { name: "已完成", value: report.pieVideo.completed, fill: COL_TEAL },
    { name: "未完成", value: report.pieVideo.incomplete, fill: COL_SLATE },
  ];
  const pieData =
    pieRaw.some((d) => d.value > 0)
      ? pieRaw.filter((d) => d.value > 0)
      : [{ name: "尚無影片", value: 1, fill: "#e2e8f0" }];

  const totalPieVideos = report.pieVideo.completed + report.pieVideo.incomplete;

  const barData = report.barUnits.map((u) => ({
    name: u.unitTitle.length > 8 ? `${u.unitTitle.slice(0, 8)}…` : u.unitTitle,
    full: u.unitTitle,
    影片完成度: u.videoCompletionRate,
    測驗表現: u.quizPassRate,
  }));

  const sum = report.summary;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">任務完成狀況</h2>
        <p className="mt-1 text-sm text-slate-600">
          以下為本次學習範圍內的影片完成比例與統計摘要
        </p>
        <ul className="mt-4 space-y-1 text-sm text-slate-800">
          <li>
            已完成影片數：
            {sum.totalVideos > 0
              ? `${sum.completedVideos} / ${sum.totalVideos}`
              : totalPieVideos > 0
                ? `${report.pieVideo.completed} / ${totalPieVideos}`
                : "—"}
          </li>
          <li>
            完成率：
            {sum.totalVideos === 0 && totalPieVideos === 0 ? "—" : `${sum.videoCompletionRate}%`}
          </li>
        </ul>
        <div className="mt-6 h-56 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                label={({ name, value }) => `${name} ${value}`}
              >
                {pieData.map((e, i) => (
                  <Cell key={`c-${i}`} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">學習能力分析</h2>
        <p className="mt-1 text-sm text-slate-600">
          依各主題測驗作答正確率整理（0～100%）
        </p>
        {radarData.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            目前尚無學習資料
            <br />
            <span className="text-slate-500">
              待學生開始觀看影片與完成測驗後，系統將自動產生學習紀錄
            </span>
          </p>
        ) : (
          <div className="mt-4 h-[min(360px,70vw)] w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="正答率"
                  dataKey="accuracy"
                  stroke={COL_TEAL}
                  fill={COL_TEAL}
                  fillOpacity={0.35}
                />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, "作答正確率"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">任務完成進度</h2>
        <p className="mt-1 text-sm text-slate-600">
          依學習任務排程顯示各影片預定與實際完成情況
        </p>
        {report.gantt ? (
          <GanttSection gantt={report.gantt} />
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            目前無對應任務資料，或尚未建立學習任務。
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">各單元完成情況</h2>
        <p className="mt-1 text-sm text-slate-600">比較各單元影片完成度與測驗表現</p>
        {barData.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">目前尚無單元統計資料。</p>
        ) : (
          <div className="mt-4 h-64 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={48} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(v) => [`${Number(v ?? 0)}%`, ""]}
                  labelFormatter={(_, p) => {
                    const pl = p as { payload?: { full?: string } } | undefined;
                    return pl?.payload?.full ?? "";
                  }}
                />
                <Legend />
                <Bar dataKey="影片完成度" fill={COL_TEAL} radius={[4, 4, 0, 0]} />
                <Bar dataKey="測驗表現" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {sum.weakSkills.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">需加強的重點</h2>
          <p className="mt-1 text-sm text-slate-600">依測驗作答正確率較低者優先列出</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-800">
            {sum.weakSkills.map((w) => (
              <li key={w.skillCode} className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-amber-100">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
                <span>
                  {w.skillName}（正答率約 {w.accuracy}%）
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.audience === "admin" && (report.summary.teacherInsight?.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">教學觀察（給老師／家長）</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-800">
            {report.summary.teacherInsight!.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(report.summary.studentInsight?.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-teal-200/70 bg-teal-50/40 p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">給同學的學習提醒</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-800">
            {report.summary.studentInsight!.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">學習建議</h2>
        <p className="mt-1 text-sm text-slate-600">
          建議重新觀看相關影片並再次練習，以加強觀念理解與應用能力。
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-800">
          {report.summary.paragraphs.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        {report.summary.suggestedVideos.length > 0 ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-800">建議複習的影片</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {report.summary.suggestedVideos.map((s) => (
                <li key={s.videoId}>
                  《{s.title}》— {s.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function GanttSection({ gantt }: { gantt: NonNullable<StudentReportDto["gantt"]> }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-700">
        任務：{gantt.taskTitle}（{gantt.startDate} — {gantt.endDate}）
      </p>
      <ul className="space-y-3">
        {gantt.items.map((item) => {
          const label = ganttStatusLabel(item, gantt.endDate);
          const tone =
            item.status === "on_time"
              ? "bg-teal-100 text-teal-900"
              : item.status === "late"
                ? "bg-amber-100 text-amber-950"
                : label === "逾期未完成"
                  ? "bg-red-100 text-red-900"
                  : "bg-slate-200 text-slate-800";
          return (
            <li
              key={item.videoId}
              className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-3 sm:px-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    第 {item.dayIndex} 天 · 預定 {item.plannedDate}
                    {item.completedAt ? ` · 完成於 ${item.completedAt.slice(0, 10)}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
                  {label}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:
                      item.status === "incomplete"
                        ? label === "逾期未完成"
                          ? "22%"
                          : "35%"
                        : item.status === "late"
                          ? "88%"
                          : "100%",
                    backgroundColor:
                      item.status === "incomplete"
                        ? label === "逾期未完成"
                          ? "#f87171"
                          : COL_SLATE
                        : item.status === "late"
                          ? COL_AMBER
                          : COL_TEAL,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
