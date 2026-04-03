import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
};

/** 學生端統一的「返回」連結樣式 */
export function StudentBackLink({ href, children }: Props) {
  return (
    <Link
      href={href}
      className="interactive-nav inline-flex items-center gap-1 text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
