import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getLatestTherapyPlan, getStudent, isPlanReviewed, submitExerciseSession } from "../lib/api";
import type { ExerciseResult, ExerciseSessionResponse } from "../lib/types";
import { toneForPerformance } from "../lib/labels";
import { useApi } from "../lib/useApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ExerciseLaunchCard } from "../components/ExerciseLaunchCard";
import { ARExercisePanel } from "../components/ARExercisePanel";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { PageTitle, StudentTabs } from "./shared";

export default function Exercise() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { data, error, loading, retry } = useApi(async () => ({ student: await getStudent(id), plan: await getLatestTherapyPlan(id) }), [id]);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState<ExerciseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [response, setResponse] = useState<ExerciseSessionResponse | null>(null);

  const plan = data?.plan ?? null;
  const all = plan ? plan.weeks.flatMap((w) => w.exercises.map((e) => ({ week: w.week, ex: e }))) : [];
  const selected = all.find((x) => x.ex.id === params.get("exercise")) ?? all[0];
  const blocked = plan && plan.therapist_review_required && !isPlanReviewed(plan.plan_id) ? "Therapist review is required before this exercise can be launched." : null;

  const submit = async (result: ExerciseResult) => {
    if (!selected) return;
    setPending(result); setSubmitting(true); setSubmitError(null);
    try {
      const r = await submitExerciseSession({ ...result, student_id: id, exercise_id: selected.ex.id });
      setResponse(r); setPending(null); setActive(false); toast("Session saved.", "success");
    } catch (e) { setSubmitError((e as Error).message); toast((e as Error).message, "error"); } finally { setSubmitting(false); }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: "Students", to: "/students" }, { label: data?.student.name ?? "Student", to: `/students/${id}` }, { label: "Exercise" }]} />
      <PageTitle title="Interactive exercise" subtitle="Launch a guided exercise and review the session result." />
      <StudentTabs id={id} />
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading ? <CardSkeleton lines={4} /> : !selected ? (
        <EmptyState title="No exercises available" description="Generate a therapy plan that includes exercises first." action={<Link to={`/students/${id}/therapy-plan`} className="btn-primary">Go to therapy plan</Link>} />
      ) : (
        <>
          {all.length > 1 && (
            <label className="mb-4 block text-sm font-semibold">Exercise
              <select value={selected.ex.id} onChange={(e) => { setActive(false); setResponse(null); setParams({ exercise: e.target.value }); }}
                className="mt-1 block w-full max-w-sm rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm font-medium">
                {all.map((x) => <option key={x.ex.id} value={x.ex.id}>Week {x.week}: {x.ex.name}</option>)}
              </select>
            </label>
          )}
          <ExerciseLaunchCard exercise={selected.ex} week={selected.week} blockedReason={blocked} launched={active} onLaunch={() => { setResponse(null); setActive(true); }} />
          {blocked && <p className="mt-3 text-sm"><Link className="font-semibold text-indigo-600 underline" to={`/students/${id}/therapy-plan`}>Open the therapy plan to review it</Link></p>}
          {active && !pending && <ARExercisePanel exercise={selected.ex} onComplete={submit} onCancel={() => setActive(false)} />}

          {pending && (
            <div className="card mt-4 p-5" aria-live="polite">
              {submitting ? <p className="text-sm font-medium">Saving session…</p> : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p role="alert" className="text-sm font-medium text-rose-700">{submitError ?? "The session has not been saved."}</p>
                  <button className="btn-primary" onClick={() => submit(pending)}>Retry saving</button>
                </div>
              )}
            </div>
          )}

          {response && (
            <section className="card mt-6 animate-fadeUp p-6" aria-labelledby="result-h">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="result-h" className="text-xl font-bold">Session result</h2>
                <StatusBadge label={response.performance_label} tone={toneForPerformance(response.performance_label)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[["Score", response.score], ["Accuracy", response.accuracy], ["Path coverage", response.path_coverage], ["Smoothness", response.smoothness], ["Deviations", response.deviations]].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-warm-100 p-4"><div className="font-display text-2xl font-extrabold">{v}</div><div className="text-xs text-navy-700">{k}</div></div>
                ))}
              </div>
              <p className="mt-3 text-sm text-navy-700">Completed in {response.completion_time_seconds}s · target {response.target_character}</p>
              <ul className="mt-4 list-disc space-y-1 rounded-xl bg-indigo-50 p-4 pl-8 text-sm text-navy-800">{response.feedback.map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="mt-5 flex justify-end"><Link to={`/students/${id}/progress`} className="btn-primary">View updated progress</Link></div>
            </section>
          )}
        </>
      )}
    </>
  );
}
