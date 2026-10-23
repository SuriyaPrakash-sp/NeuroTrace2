import type { Tone } from "../lib/labels";

const tones: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  mint: "bg-mint-50 text-mint-700 ring-mint-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};
export function StatusBadge({ label, tone = "slate" }: { label: string; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{label}</span>;
}
