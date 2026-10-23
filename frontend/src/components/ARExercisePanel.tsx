import { useEffect, useRef, useState } from "react";
import { Hand, X } from "lucide-react";
import type { ExerciseCompleteHandler, TherapyExercise } from "../lib/types";
import { calculateScore } from "../lib/scoring";

/**
 * SWAP POINT for the camera module (contract section 11).
 * The real AR component only has to honour this contract: accept the exercise, and call
 * onComplete(result) with an ExerciseResult. It must not contain backend URLs; the parent page submits the result.
 *
 * This placeholder runs a clearly labelled DEMO simulation. It uses no camera and no hand tracking.
 */
export function ARExercisePanel({ exercise, onComplete, onCancel }: { exercise: TherapyExercise; onComplete: ExerciseCompleteHandler; onCancel: () => void }) {
  const [running, setRunning] = useState(false);
  const [pct, setPct] = useState(0);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const run = () => {
    setRunning(true); setPct(0);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += 4; setPct(Math.min(p, 100));
      if (p >= 100) {
        window.clearInterval(timer.current);
        // Demo values; score uses the contract 7.2 formula.
        const path_coverage = 90, accuracy = 82, smoothness = 73;
        onComplete({ target_character: exercise.target_character, path_coverage, accuracy, smoothness,
          deviations: 4, completion_time_seconds: 24, score: calculateScore(path_coverage, accuracy, smoothness) });
      }
    }, 100);
  };

  return (
    <div className="card mt-4 animate-fadeUp p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-100">Demo mode · no camera in use</span>
        {!running && <button className="btn-ghost !px-2.5" onClick={onCancel} aria-label="Close exercise"><X size={16} /></button>}
      </div>
      <div className="grid place-items-center rounded-2xl bg-navy-950 py-12 text-center text-white" aria-label="Exercise canvas placeholder">
        <div className="font-display text-8xl font-extrabold text-mint-500">{exercise.target_character}</div>
        <p className="mt-3 flex items-center gap-2 text-sm text-indigo-100"><Hand size={16} /> The camera tracking module will appear here.</p>
      </div>
      {running ? (
        <div className="mt-4" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-warm-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Demo exercise progress">
            <div className="h-full rounded-full bg-mint-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-navy-700">Running demo exercise…</p>
        </div>
      ) : (
        <div className="mt-4 flex justify-end"><button className="btn-primary" onClick={run}>Run demo exercise</button></div>
      )}
    </div>
  );
}
