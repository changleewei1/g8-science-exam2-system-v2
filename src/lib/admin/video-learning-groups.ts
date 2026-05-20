import type { VideoWatchStats } from "@/domain/services/admin-dashboard-service";

export type VideoLearningItem = {
  id: string;
  title: string;
  unitName: string;
  unitSortOrder: number;
  videoSortOrder: number;
  completedCount: number;
  totalStudents: number;
  completionRate: number;
  averageQuizScore: number;
};

export type UnitLearningGroup = {
  unitName: string;
  videos: VideoLearningItem[];
  videoCount: number;
  averageCompletionRate: number;
  averageQuizScore: number;
  completedStudentCount: number;
  totalStudents: number;
};

const UNCATEGORIZED_UNIT = "未分類單元";

/** DB sort_order 相同或異常時，第三次段考理化單元慣用順序 */
function examScopeUnitRank(name: string): number {
  if (name.includes("有機化合物")) return 1;
  if (name.includes("力與壓力")) return 2;
  return 50;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return round1(nums.reduce((s, n) => s + n, 0) / nums.length);
}

export function videoWatchStatsToLearningItem(v: VideoWatchStats): VideoLearningItem {
  return {
    id: v.videoId,
    title: v.title,
    unitName: v.unitTitle?.trim() || UNCATEGORIZED_UNIT,
    unitSortOrder: v.unitSortOrder,
    videoSortOrder: v.videoSortOrder,
    completedCount: v.completedCount,
    totalStudents: v.totalStudents,
    completionRate: v.completionRate,
    averageQuizScore: v.avgQuizPassRate,
  };
}

/** 依所屬單元分組，並計算單元層級統計 */
export function groupVideosByUnit(videos: VideoWatchStats[]): UnitLearningGroup[] {
  const map = new Map<string, VideoLearningItem[]>();

  for (const raw of videos) {
    const item = videoWatchStatsToLearningItem(raw);
    const list = map.get(item.unitName) ?? [];
    list.push(item);
    map.set(item.unitName, list);
  }

  const groups: UnitLearningGroup[] = [];

  for (const [unitName, items] of map.entries()) {
    items.sort(
      (a, b) =>
        a.videoSortOrder - b.videoSortOrder ||
        a.title.localeCompare(b.title, "zh-Hant", { numeric: true }),
    );
    const totalStudents = items[0]?.totalStudents ?? 0;
    const averageCompletionRate = avg(items.map((v) => v.completionRate));
    const averageQuizScore = avg(items.map((v) => v.averageQuizScore));
    const completedStudentCount =
      totalStudents > 0
        ? Math.round((averageCompletionRate / 100) * totalStudents)
        : 0;

    groups.push({
      unitName,
      videos: items,
      videoCount: items.length,
      averageCompletionRate,
      averageQuizScore,
      completedStudentCount,
      totalStudents,
    });
  }

  return groups.sort((a, b) => {
    if (a.unitName === UNCATEGORIZED_UNIT) return 1;
    if (b.unitName === UNCATEGORIZED_UNIT) return -1;
    const orderA = a.videos[0]?.unitSortOrder ?? 9999;
    const orderB = b.videos[0]?.unitSortOrder ?? 9999;
    if (orderA !== orderB) return orderA - orderB;
    const ra = examScopeUnitRank(a.unitName);
    const rb = examScopeUnitRank(b.unitName);
    if (ra !== rb) return ra - rb;
    return a.unitName.localeCompare(b.unitName, "zh-Hant");
  });
}

export type ProgressRateTier = "low" | "mid" | "high";

export function progressRateTier(value: number): ProgressRateTier {
  if (value >= 80) return "high";
  if (value >= 50) return "mid";
  return "low";
}
