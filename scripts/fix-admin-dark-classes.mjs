/**
 * Batch: admin TSX legacy dark-glass classes → light admin styling.
 * Run from repo root: node scripts/fix-admin-dark-classes.mjs
 *
 * Do not use naive substring replace for `text-slate-50` → it corrupts `text-slate-500`
 * into `text-slate-9000`. Prefer /\btext-slate-50\b/g if adding text rules again.
 */
import fs from "node:fs";
import path from "node:path";

const roots = [
  path.join("src", "app", "admin"),
  path.join("src", "components", "admin"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Longer patterns first */
const pairs = [
  [
    "overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_36px_-16px_rgba(0,0,0,0.45)]",
    "overflow-x-auto rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]",
  ],
  [
    "overflow-x-auto rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)]",
    "overflow-x-auto rounded-xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]",
  ],
  [
    "rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-md",
    "rounded-2xl border border-cyan-200/50 bg-white px-6 py-12 text-center shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]",
  ],
  [
    "border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)]",
    "border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]",
  ],
  [
    "border border-white/10 bg-white/[0.06] backdrop-blur-md",
    "border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]",
  ],
  [
    "rounded-2xl border border-white/10 bg-white/[0.12] p-4 shadow-sm backdrop-blur sm:p-5",
    "rounded-2xl border border-cyan-200/50 bg-white p-4 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] sm:p-5",
  ],
  [
    "rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5",
    "rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5",
  ],
  ["border border-white/10 bg-white/[0.04]", "border border-slate-200/80 bg-slate-50/70"],
  ["border-t border-white/10", "border-t border-slate-200"],
  ["border-b border-white/10", "border-b border-slate-200"],
  ["border-t border-white/5", "border-t border-slate-100"],
  ["border-b border-white/5", "border-b border-slate-100"],
  ["border border-white/5", "border border-slate-200/60"],
  ["border border-white/15", "border border-slate-200/90"],
  ["border-white/15", "border-slate-200/90"],
  ["border-white/10", "border-slate-200/90"],
  ["ring-1 ring-white/10", "ring-1 ring-slate-200/90"],
  ["ring-white/10", "ring-slate-200/90"],
  ["bg-white/[0.08]/90 text-slate-300", "bg-slate-50/95 text-slate-600"],
  ["bg-white/[0.08]/90", "bg-slate-50/95"],
  ["bg-white/[0.08]", "bg-slate-50"],
  ["bg-white/[0.04]", "bg-slate-50/80"],
  ["bg-white/[0.02]", "bg-slate-50"],
  ["bg-white/[0.12]", "bg-slate-100"],
  ["bg-white/[0.06]", "bg-white"],
  ["hover:bg-white/[0.08]", "hover:bg-slate-100"],
  ["hover:bg-white/[0.04]", "hover:bg-cyan-50/70"],
  ["hover:bg-white/[0.03]", "hover:bg-slate-50"],
  ["bg-slate-950/30", "bg-slate-100"],
  ["bg-slate-950/50", "bg-white"],
  ["hover:bg-white/10", "hover:bg-cyan-50/80"],
  ["bg-white/5", "bg-cyan-50/40"],
];

function applyTextColorMigrations(s) {
  return s
    .replace(/\btext-slate-50\b/g, "text-slate-900")
    .replace(/\btext-slate-200\b/g, "text-slate-700")
    .replace(/\btext-slate-300\b/g, "text-slate-600");
}

function fixFile(file) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  for (const [a, b] of pairs) {
    s = s.split(a).join(b);
  }
  s = applyTextColorMigrations(s);
  if (s !== orig) fs.writeFileSync(file, s, "utf8");
}

let count = 0;
for (const root of roots) {
  const dir = path.join(process.cwd(), root);
  for (const file of walk(dir)) {
    fixFile(file);
    count++;
  }
}
console.log(`Checked ${count} .tsx files under`, roots.join(", "));
