export function ExerciseInstructions({ title, instructions }: { title: string; instructions?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {instructions && <p className="text-sm text-navy-700 mt-1">{instructions}</p>}
    </div>
  );
}

export default ExerciseInstructions;
