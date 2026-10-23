export function ExerciseProgress({ percent }: { percent: number }) {
  return (
    <div className="mt-4" aria-live="polite">
      <div className="h-2 overflow-hidden rounded-full bg-warm-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-mint-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-navy-700">Exercise in progress: {Math.round(percent)}%</p>
    </div>
  );
}

export default ExerciseProgress;
