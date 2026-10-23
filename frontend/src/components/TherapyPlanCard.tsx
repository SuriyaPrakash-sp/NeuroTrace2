import { Link } from "react-router-dom";
import { Clock, Repeat, Target, Play } from "lucide-react";
import type { TherapyWeek } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

/** One week of the plan. Launch is disabled until the therapist has reviewed the plan (contract section 2). */
export function TherapyPlanCard({ week, studentId, canLaunch }: { week: TherapyWeek; studentId: string; canLaunch: boolean }) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-center font-display text-xs font-bold leading-tight text-mint-100">
          <span>Wk<br /><span className="text-base">{week.week}</span></span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{week.goal}</h3>
          {week.exercises.length === 0 ? (
            <p className="mt-2 rounded-xl bg-warm-100 p-3 text-sm text-navy-700">No exercises scheduled yet for this week. The therapist can add support activities after reviewing progress.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {week.exercises.map((ex) => (
                <li key={ex.id} className="rounded-xl border border-warm-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{ex.name}</span><StatusBadge label={ex.difficulty} tone="indigo" /></div>
                      <p className="mt-1 text-sm text-navy-700">{ex.instructions}</p>
                    </div>
                    {canLaunch
                      ? <Link to={`/students/${studentId}/exercise?exercise=${ex.id}`} className="btn-ghost shrink-0"><Play size={14} /> Launch</Link>
                      : <button className="btn-ghost shrink-0" disabled title="Therapist review required first"><Play size={14} /> Launch</button>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-navy-800">
                    <span className="flex items-center gap-1.5"><Target size={14} className="text-indigo-600" />Letter {ex.target_character} · {ex.type.replace("_", " ")}</span>
                    <span className="flex items-center gap-1.5"><Repeat size={14} className="text-indigo-600" />{ex.repetitions} repetitions</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-indigo-600" />{ex.duration_minutes} min</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
