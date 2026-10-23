import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { Skeleton, CardSkeleton } from "../components/Skeleton";

export const PageTitle = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-navy-700">{subtitle}</p>}</div>
    {action}
  </div>
);

const tabs = [
  ["", "Profile"], ["/assessment", "Assessment"], ["/therapy-plan", "Therapy plan"], ["/exercise", "Exercise"], ["/progress", "Progress"],
];
export const StudentTabs = ({ id }: { id: string }) => (
  <nav aria-label="Student sections" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-warm-200 bg-white p-1.5">
    {tabs.map(([p, label]) => (
      <NavLink key={p} end={p === ""} to={`/students/${id}${p}`}
        className={({ isActive }) => `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-warm-100"}`}>{label}</NavLink>
    ))}
  </nav>
);

export const GridSkeleton = ({ n = 3 }: { n?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: n }).map((_, i) => <CardSkeleton key={i} />)}</div>
);
export const PageSkeleton = () => (<div><Skeleton className="mb-6 h-9 w-64" /><GridSkeleton /></div>);
