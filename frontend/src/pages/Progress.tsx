import { Link, useParams } from "react-router-dom";
import { TrendingUp, Activity } from "lucide-react";
import { getStudent, getStudentProgress } from "../lib/api";
import { useApi, fmtDate } from "../lib/useApi";
import { toneForPerformance } from "../lib/labels";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProgressChart } from "../components/ProgressChart";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { PageTitle, StudentTabs } from "./shared";

export default function Progress() {
  const { id = "" } = useParams();
  const { data, error, loading, retry } = useApi(async () => ({ student: await getStudent(id), p: await getStudentProgress(id) }), [id]);
  const p = data?.p;
  return (
    <>
      <Breadcrumbs items={[{ label: "Students", to: "/students" }, { label: data?.student.name ?? "Student", to: `/students/${id}` }, { label: "Progress" }]} />
      <PageTitle title="Progress indicators" subtitle="Change in handwriting observations and exercise scores over time." />
      <StudentTabs id={id} />
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading ? <Skeleton className="h-96" /> : !p || (p.metrics.length === 0 && p.recent_sessions.length === 0) ? (
        <EmptyState title="No progress data yet" description="Upload a sample and complete an exercise to start the timeline." action={<Link to={`/students/${id}`} className="btn-primary">Upload sample</Link>} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard label="Overall progress" value={p.overall_progress} icon={<TrendingUp size={22} />} tone="mint" />
            <StatCard label="Exercise sessions completed" value={p.sessions_completed} icon={<Activity size={22} />} />
          </div>
          <ProgressChart points={p.metrics} />
          <h2 className="mb-3 mt-8 text-xl font-bold">Recent sessions</h2>
          {p.recent_sessions.length === 0 ? <EmptyState title="No sessions yet" description="Completed exercises will be listed here." /> : (
            <ul className="space-y-3">
              {p.recent_sessions.map((s) => (
                <li key={s.session_id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div><div className="font-bold">Letter {s.target_character} · score {s.score}</div><div className="text-xs text-navy-700">{fmtDate(s.created_at)}</div></div>
                  <StatusBadge label={s.performance_label} tone={toneForPerformance(s.performance_label)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
