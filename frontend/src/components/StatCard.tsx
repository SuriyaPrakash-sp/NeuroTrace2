import type { ReactNode } from "react";

export function StatCard({ label, value, icon, tone = "indigo" }: { label: string; value: string | number; icon: ReactNode; tone?: "indigo" | "mint" | "amber" }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600", mint: "bg-mint-50 text-mint-600", amber: "bg-amber-50 text-amber-700" };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <div>
        <div className="font-display text-3xl font-extrabold leading-none">{value}</div>
        <div className="mt-1 text-sm text-navy-700">{label}</div>
      </div>
    </div>
  );
}
