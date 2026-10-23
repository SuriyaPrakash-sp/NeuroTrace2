import { Link } from "react-router-dom";
import { Users, Activity, TrendingUp, UserX } from "lucide-react";
import { getDashboardData } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StatCard } from "../components/StatCard";
import { StudentCard } from "../components/StudentCard";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { PageTitle, GridSkeleton } from "./shared";

export default function Dashboard() {
  const { data, error, loading, retry } = useApi(getDashboardData, []);
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <PageTitle title="Dashboard" subtitle="Your caseload at a glance." action={<Link to="/students" className="btn-primary">View all students</Link>} />
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading || !data ? (
        <><div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><GridSkeleton /></>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students" value={data.total} icon={<Users size={22} />} />
            <StatCard label="Exercise sessions recorded" value={data.totalSessions} icon={<Activity size={22} />} />
            <StatCard label="Average progress indicator" value={data.avgProgress === null ? "—" : data.avgProgress} icon={<TrendingUp size={22} />} tone="mint" />
            <StatCard label="Not started exercises" value={data.notStarted} icon={<UserX size={22} />} tone="amber" />
          </div>
          <h2 className="mb-3 text-xl font-bold">Students</h2>
          {data.students.length === 0 ? (
            <EmptyState title="No students yet" description="Add your first student to begin AI-assisted handwriting observations." action={<Link to="/students" className="btn-primary">Add a student</Link>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.students.map((s) => <StudentCard key={s.id} student={s} />)}</div>
          )}
        </>
      )}
    </>
  );
}
