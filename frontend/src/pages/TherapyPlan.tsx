import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, ClipboardCheck } from "lucide-react";
import { generateTherapyPlan, getLatestAssessment, getLatestTherapyPlan, getStudent, isPlanReviewed, markPlanReviewed } from "../lib/api";
import type { TherapyPlan as Plan } from "../lib/types";
import { useApi } from "../lib/useApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { TherapyPlanCard } from "../components/TherapyPlanCard";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import { PageTitle, StudentTabs } from "./shared";

export default function TherapyPlan() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { data, error, loading, retry } = useApi(async () => ({
    student: await getStudent(id), assessment: await getLatestAssessment(id), plan: await getLatestTherapyPlan(id),
  }), [id]);
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [weeks, setWeeks] = useState(4);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const current = plan === undefined ? data?.plan ?? null : plan;
  const assessment = data?.assessment ?? null;
  const isReviewed = current ? reviewed[current.plan_id] ?? isPlanReviewed(current.plan_id) : false;

  const generate = async () => {
    if (!assessment) return;
    setBusy(true); setGenError(null);
    try {
      const p = await generateTherapyPlan({ student_id: id, assessment_id: assessment.assessment_id, duration_weeks: weeks, ...(notes.trim() ? { therapist_notes: notes.trim() } : {}) });
      setPlan(p); setShowForm(false); toast("Draft plan generated. Please review before assigning.", "success");
    } catch (e) { setGenError((e as Error).message); toast((e as Error).message, "error"); } finally { setBusy(false); }
  };
  const review = () => { if (!current) return; markPlanReviewed(current.plan_id); setReviewed((r) => ({ ...r, [current.plan_id]: true })); toast("Plan marked as therapist-reviewed.", "success"); };

  const form = (
    <div className="card mb-6 animate-fadeUp space-y-4 p-5">
      <h2 className="text-lg font-bold">Generate a therapy plan</h2>
      <label className="block text-sm font-semibold">Duration (weeks)
        <input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Math.max(1, Math.min(12, Number(e.target.value) || 4)))}
          className="mt-1 block w-28 rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm" /></label>
      <label className="block text-sm font-semibold">Therapist notes <span className="font-normal text-navy-700">(optional)</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Prioritize baseline alignment and letter formation."
          className="mt-1 w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm" /></label>
      {genError && <p role="alert" className="text-sm font-medium text-rose-700">{genError}</p>}
      <div className="flex justify-end gap-2">
        {current && <button className="btn-ghost" onClick={() => setShowForm(false)} disabled={busy}>Cancel</button>}
        <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : `Generate ${weeks}-week plan`}</button>
      </div>
    </div>
  );

  return (
    <>
      <Breadcrumbs items={[{ label: "Students", to: "/students" }, { label: data?.student.name ?? "Student", to: `/students/${id}` }, { label: "Therapy plan" }]} />
      <PageTitle title="Therapy plan" subtitle="Therapy support recommendations for therapist review." />
      <StudentTabs id={id} />
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading ? <div className="space-y-4">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div> : !assessment ? (
        <EmptyState title="Assessment needed first" description="A plan is generated from an assessment. Upload a handwriting sample to begin." action={<Link to={`/students/${id}`} className="btn-primary">Upload sample</Link>} />
      ) : !current || showForm ? (
        <>{!current && <EmptyState title="No plan yet" description="Generate a draft plan from the latest assessment." />}<div className={current ? "" : "mt-6"}>{form}</div></>
      ) : (
        <>
          <div className="card mb-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">{current.title}</h2><p className="mt-1 text-sm text-navy-700">{current.summary}</p></div>
              <div className="flex items-center gap-2"><StatusBadge label={isReviewed ? "Reviewed" : current.status[0].toUpperCase() + current.status.slice(1)} tone={isReviewed ? "mint" : "amber"} />
                <button className="btn-ghost" onClick={() => setShowForm(true)}>Generate new</button></div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Primary focus">{current.primary_focus.map((f) => <li key={f} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{f}</li>)}</ul>
          </div>
          {current.therapist_review_required && !isReviewed && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm font-medium text-amber-900"><ClipboardCheck size={20} className="mt-0.5 shrink-0" />This plan is a draft. Therapist review is required before exercises are assigned.</p>
              <button className="btn-primary shrink-0" onClick={review}>Mark as reviewed</button>
            </div>
          )}
          {isReviewed && <p className="mb-6 flex items-center gap-2 text-sm font-semibold text-mint-700"><ShieldCheck size={18} /> Therapist-reviewed plan</p>}
          <div className="space-y-4">{current.weeks.map((w) => <TherapyPlanCard key={w.week} week={w} studentId={id} canLaunch={isReviewed || !current.therapist_review_required} />)}</div>
        </>
      )}
    </>
  );
}
