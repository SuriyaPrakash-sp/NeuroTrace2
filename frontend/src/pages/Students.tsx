import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Plus } from "lucide-react";
import { listStudents } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StudentCard } from "../components/StudentCard";
import { AddStudentForm } from "../components/AddStudentForm";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageTitle, GridSkeleton } from "./shared";

export default function Students() {
  const nav = useNavigate();
  const { data, error, loading, retry } = useApi(listStudents, []);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const list = (data?.items ?? []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Students" }]} />
      <PageTitle title="Students" subtitle="Everyone on your caseload." action={!adding && <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add student</button>} />
      {adding && <AddStudentForm onCancel={() => setAdding(false)} onCreated={(s) => nav(`/students/${s.id}`)} />}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-700" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" aria-label="Search students"
          className="w-full rounded-xl border border-warm-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-navy-700/60" />
      </div>
      {error ? <ErrorState message={error.message} onRetry={retry} /> : loading ? <GridSkeleton n={6} /> : list.length === 0 ? (
        <EmptyState title={q ? "No matches" : "No students yet"} description={q ? "Try a different name." : "Students you add will appear here."} icon={<UserPlus size={26} />}
          action={!q && !adding ? <button className="btn-primary" onClick={() => setAdding(true)}>Add student</button> : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((s) => <StudentCard key={s.id} student={s} />)}</div>
      )}
    </>
  );
}
