import { StatusBadge } from "../../components/StatusBadge";
import { toneForPerformance } from "../../lib/labels";
import type { ExerciseSessionResponse } from "../../lib/types";

export function ExerciseResult({ response }: { response: ExerciseSessionResponse }) {
  return (
    <section className="card mt-6 animate-fadeUp p-6" aria-labelledby="result-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="result-h" className="text-xl font-bold">Session result</h2>
        <StatusBadge label={response.performance_label} tone={toneForPerformance(response.performance_label)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          ["Score", response.score],
          ["Accuracy", response.accuracy],
          ["Path coverage", response.path_coverage],
          ["Smoothness", response.smoothness],
          ["Deviations", response.deviations]
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-warm-100 p-4">
            <div className="font-display text-2xl font-extrabold">{v}</div>
            <div className="text-xs text-navy-700">{k}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-navy-700">
        Completed in {response.completion_time_seconds}s · target {response.target_character}
      </p>
      <ul className="mt-4 list-disc space-y-1 rounded-xl bg-indigo-50 p-4 pl-8 text-sm text-navy-800">
        {response.feedback.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </section>
  );
}

export default ExerciseResult;
