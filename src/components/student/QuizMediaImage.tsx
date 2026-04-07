type Props = {
  src: string;
  alt?: string;
  className?: string;
};

/** 測驗題／選項圖（允許任意 https 來源，不使用 next/image） */
export function QuizMediaImage({ src, alt = "", className = "" }: Props) {
  if (!src.trim()) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 老師可貼任意外部圖床 URL
    <img
      src={src}
      alt={alt}
      className={`max-h-56 w-full max-w-lg rounded-lg border border-slate-200 object-contain sm:max-h-64 ${className}`}
      loading="lazy"
    />
  );
}
