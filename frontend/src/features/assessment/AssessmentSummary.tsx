import { clamp } from "../../lib/scoring";
import { StatusBadge } from "../../components/StatusBadge";
import type { AssessmentResponse } from "../../lib/types";

export function AssessmentSummary({ assessment }: { assessment: AssessmentResponse }) {
  return (
    <div className="card mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-navy-900 text-center text-white">
        <div>
          <div className="font-display text-4xl font-extrabold leading-none">
            {clamp(assessment.overall_score)}
          </div>
          <div className="text-xs text-indigo-100">overall</div>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={assessment.status[0].toUpperCase() + assessment.status.slice(1)}
            tone={assessment.status === "completed" ? "mint" : assessment.status === "failed" ? "rose" : "indigo"}
          />
          <span className="text-sm text-navy-700">
            {assessment.analysis_confidence === null
              ? "Confidence not available"
              : `Analysis confidence ${Math.round(assessment.analysis_confidence * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AssessmentSummary;
