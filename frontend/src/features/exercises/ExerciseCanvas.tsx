import { Hand } from "lucide-react";

export function ExerciseCanvas({ character }: { character: string }) {
  return (
    <div className="grid place-items-center rounded-2xl bg-navy-950 py-12 text-center text-white" aria-label="Exercise canvas">
      <div className="font-display text-8xl font-extrabold text-mint-500">{character}</div>
      <p className="mt-3 flex items-center gap-2 text-sm text-indigo-100">
        <Hand size={16} /> Trace along the guideline path
      </p>
    </div>
  );
}

export default ExerciseCanvas;
