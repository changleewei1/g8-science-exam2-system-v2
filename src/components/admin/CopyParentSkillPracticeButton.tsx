"use client";

import { useCallback, useState } from "react";

type Props = {
  text: string;
};

export function CopyParentSkillPracticeButton({ text }: Props) {
  const [msg, setMsg] = useState<string | null>(null);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("已複製");
      setTimeout(() => setMsg(null), 2400);
    } catch {
      setMsg("複製失敗");
      setTimeout(() => setMsg(null), 2400);
    }
  }, [text]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex min-h-10 items-center rounded-lg border border-white/15 bg-white px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/[0.04]"
        onClick={onCopy}
      >
        複製家長回報文字
      </button>
      {msg ? <span className="text-xs text-cyan-300">{msg}</span> : null}
    </div>
  );
}
