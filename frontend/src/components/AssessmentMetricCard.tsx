import type { AssessmentMetric } from "../lib/types";
import { clamp } from "../lib/scoring";
import { toneForMetricLabel } from "../lib/labels";
import { StatusBadge } from "./StatusBadge";

export function AssessmentMetricCard({ name, metric }: { name: string; metric: AssessmentMetric }) {
  const score = clamp(metric.score);
  const bar = score >= 75 ? "bg-mint-500" : score >= 65 ? "bg-indigo-500" : "bg-amber-500";
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold">{name}</h3>
        <StatusBadge label={metric.label} tone={toneForMetricLabel(metric.label)} />
      </div>
      <div className="mt-2 font-display text-4xl font-extrabold">{score}<span className="text-lg text-navy-700">/100</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-warm-200" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={name}>
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-sm text-navy-700">{metric.description}</p>
    </div>
  );
}
