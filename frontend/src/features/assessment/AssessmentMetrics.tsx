import { AssessmentMetricCard } from "../../components/AssessmentMetricCard";
import { METRIC_NAMES, METRIC_ORDER } from "../../lib/labels";
import type { AssessmentResponse } from "../../lib/types";

export function AssessmentMetrics({ assessment }: { assessment: AssessmentResponse }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {METRIC_ORDER.map(
        (k) =>
          assessment.metrics[k] && (
            <AssessmentMetricCard key={k} name={METRIC_NAMES[k]} metric={assessment.metrics[k]} />
          )
      )}
    </div>
  );
}

export default AssessmentMetrics;
