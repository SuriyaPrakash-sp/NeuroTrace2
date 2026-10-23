import { useParams, Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { getLatestAssessment, getStudent, resolveAssetUrl } from "../lib/api";
import { useApi, fmtDate } from "../lib/useApi";
import { METRIC_NAMES, METRIC_ORDER } from "../lib/labels";
import { clamp } from "../lib/scoring";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { AssessmentMetricCard } from "../components/AssessmentMetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageTitle, StudentTabs, GridSkeleton } from "./shared";

export default function Assessment() {
  const { id = "" } = useParams();
  const { data, error, loading, retry } = useApi(async () => ({ student: await getStudent(id), a: await getLatestAssessment(id) }), [id]);
  const a = data?.a;
  const img = a ? resolveAssetUrl(a.sample_url) : null;
  return (
    <>
      <Breadcrumbs items={[{ label: "Students", to: "/students" }, { label: data?.student.name ?? "Student", to: `/students/${id}` }, { label: "Assessment" }]} />
      <PageTitle title="Handwriting observations" subtitle={a ? `AI-assisted analysis · ${fmtDate(a.created_at)}` : undefined} />
      <StudentTabs id={id} />
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading ? <GridSkeleton n={6} /> : !a ? (
        <EmptyState title="No assessment yet" description="Upload a handwriting sample to receive AI-assisted observations." action={<Link to={`/students/${id}`} className="btn-primary">Upload sample</Link>} />
      ) : (
        <>
          {a.warnings.length > 0 && (
            <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <ul className="space-y-1">{a.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          {a.status === "processing" && <div className="mb-6 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-800">This analysis is still processing. Results shown may be incomplete.</div>}
          <div className="card mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-navy-900 text-center text-white">
              <div><div className="font-display text-4xl font-extrabold leading-none">{clamp(a.overall_score)}</div><div className="text-xs text-indigo-100">overall</div></div>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={a.status[0].toUpperCase() + a.status.slice(1)} tone={a.status === "completed" ? "mint" : a.status === "failed" ? "rose" : "indigo"} />
                <span className="text-sm text-navy-700">{a.analysis_confidence === null ? "Confidence not available" : `Analysis confidence ${Math.round(a.analysis_confidence * 100)}%`}</span>
              </div>
              {a.observations.length > 0 && (
                <>
                  <h2 className="mt-3 text-sm font-bold">Handwriting observations</h2>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-navy-800">{a.observations.map((o) => <li key={o}>{o}</li>)}</ul>
                </>
              )}
            </div>
            {img && <img src={img} alt="Uploaded handwriting sample" className="h-28 w-40 rounded-xl border border-warm-200 object-cover" />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {METRIC_ORDER.map((k) => a.metrics[k] && <AssessmentMetricCard key={k} name={METRIC_NAMES[k]} metric={a.metrics[k]} />)}
          </div>
          <div className="mt-6 flex justify-end"><Link to={`/students/${id}/therapy-plan`} className="btn-primary">Continue to therapy plan</Link></div>
        </>
      )}
    </>
  );
}
