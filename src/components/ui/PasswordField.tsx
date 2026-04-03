"use client";

import { useId, useState, type ReactNode } from "react";

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a18.29 18.29 0 0 1-3.29 4.59M6.12 6.12A18.29 18.29 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 4.73-1.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  /** 輸入框下方說明（選填） */
  hint?: ReactNode;
  /** 與既有頁面 input 樣式對齊 */
  inputClassName?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required,
  hint,
  inputClassName,
}: Props) {
  const baseId = useId();
  const inputId = `${baseId}-password`;
  const [visible, setVisible] = useState(false);

  const inputBase =
    inputClassName ??
    "min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-3 pr-11 text-base text-slate-900 outline-none ring-teal-500 focus:ring-2";

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={inputBase}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "隱藏密碼" : "顯示密碼"}
          aria-pressed={visible}
        >
          {visible ? (
            <IconEyeOff className="h-5 w-5 shrink-0" />
          ) : (
            <IconEye className="h-5 w-5 shrink-0" />
          )}
        </button>
      </div>
      {hint != null ? <div className="mt-1">{hint}</div> : null}
    </div>
  );
}
