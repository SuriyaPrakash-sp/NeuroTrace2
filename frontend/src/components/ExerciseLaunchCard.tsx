import { Glasses, Clock, Repeat } from "lucide-react";
import type { TherapyExercise } from "../lib/types";

/** Interface-only launcher. No camera or hand-tracking logic lives here. */
export function ExerciseLaunchCard({ exercise, week, blockedReason, launched, onLaunch }: {
  exercise: TherapyExercise; week: number; blockedReason: string | null; launched: boolean; onLaunch: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-navy-900 to-indigo-700 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Glasses size={24} /></div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-mint-100">Interactive exercise · Week {week}</div>
            <h2 className="font-display text-xl font-bold text-white">{exercise.name}</h2>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm text-indigo-100">{exercise.instructions}</p>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-navy-700">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Target <span className="font-bold text-navy-950">{exercise.target_character}</span></span>
            <span className="flex items-center gap-1"><Repeat size={14} />{exercise.repetitions}×</span>
            <span className="flex items-center gap-1"><Clock size={14} />{exercise.duration_minutes} min</span>
          </p>
          <p>Use a flat surface and good lighting. A therapist should supervise the session.</p>
          {blockedReason && <p role="alert" className="font-semibold text-amber-800">{blockedReason}</p>}
        </div>
        <button className="btn-mint shrink-0" disabled={!!blockedReason || launched} onClick={onLaunch}>
          {launched ? "Exercise open" : "Launch interactive exercise"}
        </button>
      </div>
    </div>
  );
}
