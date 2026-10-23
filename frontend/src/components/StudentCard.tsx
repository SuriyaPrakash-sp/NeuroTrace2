import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Student } from "../lib/types";
import { fmtDate } from "../lib/useApi";

export function StudentCard({ student: s }: { student: Student }) {
  const initials = s.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const goals = s.primary_goals ?? [];
  return (
    <Link to={`/students/${s.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
          : <div className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 font-display font-bold text-mint-100">{initials}</div>}
        <div>
          <div className="font-display text-lg font-bold">{s.name}</div>
          <div className="text-sm text-navy-700">Age {s.age} · {s.grade}</div>
        </div>
      </div>
      {goals.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Therapy goals">
          {goals.slice(0, 3).map((g) => <li key={g} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{g}</li>)}
        </ul>
      )}
      {s.notes && <p className="mt-3 line-clamp-2 text-sm text-navy-700">{s.notes}</p>}
      <div className="mt-4 flex items-center justify-between border-t border-warm-200 pt-3 text-xs text-navy-700">
        <span>Added {fmtDate(s.created_at)}</span>
        <ArrowRight size={16} className="text-indigo-600 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
