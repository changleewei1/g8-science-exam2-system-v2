"use client";

import { useEffect } from "react";

type Props = { taskId: string | undefined };

/**
 * 從測驗結果帶 ?taskId= 回到任務列表時，捲動到對應任務區塊。
 */
export function TaskListScrollAnchor({ taskId }: Props) {
  useEffect(() => {
    if (!taskId) return;
    const el = document.getElementById(`learning-task-${taskId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [taskId]);
  return null;
}
