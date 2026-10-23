import { StatusBadge } from "../../components/StatusBadge";
import type { TherapyPlan } from "../../lib/types";

export function TherapyPlanHeader({ plan, isReviewed }: { plan: TherapyPlan; isReviewed: boolean }) {
  return (
    <div className="card mb-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{plan.title}</h2>
          <p className="mt-1 text-sm text-navy-700">{plan.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            label={isReviewed ? "Reviewed" : plan.status[0].toUpperCase() + plan.status.slice(1)}
            tone={isReviewed ? "mint" : "amber"}
          />
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Primary focus">
        {plan.primary_focus.map((f) => (
          <li key={f} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TherapyPlanHeader;
