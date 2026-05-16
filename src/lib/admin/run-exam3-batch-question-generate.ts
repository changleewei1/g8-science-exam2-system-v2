import type { SupabaseClient } from "@supabase/supabase-js";
import { generateExam3CandidatesForVideo } from "@/lib/admin/generate-exam3-questions-for-video";

export type Exam3BatchItemResult = {
  videoId: string;
  ok: boolean;
  inserted?: number;
  reason?: string;
  message?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function generateOneWithRetries(
  supabase: SupabaseClient,
  videoUuid: string,
  openAiKey: string,
  model: string,
): Promise<Exam3BatchItemResult> {
  let last: Exam3BatchItemResult = { videoId: videoUuid, ok: false, message: "UNKNOWN" };
  const nonRetry = new Set(["NOT_EXAM3", "NOT_FOUND", "NO_SKILLS_TAGGED"]);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await withTimeout(
        generateExam3CandidatesForVideo(supabase, { videoUuid, openAiKey, model }),
        120_000,
      );
      if (r.ok) {
        return { videoId: videoUuid, ok: true, inserted: r.inserted };
      }
      last = { videoId: videoUuid, ok: false, reason: r.reason, message: r.message };
      if (r.reason && nonRetry.has(r.reason)) break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ERROR";
      last = { videoId: videoUuid, ok: false, message: msg.slice(0, 400) };
    }
    if (attempt < 2) await sleep(800);
  }
  return last;
}

/**
 * 第三次段考：批次產生 draft 候選題。concurrency=2、chunk 間隔 1s、每支最多 retry 3 次、單支 timeout 120s。
 */
export async function runExam3BatchQuestionGenerate(params: {
  supabase: SupabaseClient;
  videoIds: string[];
  openAiKey: string;
  model?: string;
}): Promise<{ results: Exam3BatchItemResult[]; completed: number; failed: number }> {
  const model = (params.model ?? process.env.OPENAI_EXAM3_MODEL?.trim()) || "gpt-4o-mini";
  const ids = [...new Set(params.videoIds.map((x) => x.trim()).filter(Boolean))];
  const results: Exam3BatchItemResult[] = [];

  for (let i = 0; i < ids.length; i += 2) {
    const chunk = ids.slice(i, i + 2);
    const part = await Promise.all(
      chunk.map((videoId) => generateOneWithRetries(params.supabase, videoId, params.openAiKey, model)),
    );
    results.push(...part);
    if (i + 2 < ids.length) await sleep(1000);
  }

  const completed = results.filter((r) => r.ok).length;
  return { results, completed, failed: results.length - completed };
}
