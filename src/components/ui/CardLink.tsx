import Link from "next/link";

type Props = {
  href: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

export function CardLink({ href, title, subtitle, badge }: Props) {
  return (
    <Link
      href={href}
      className="interactive-btn block rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
