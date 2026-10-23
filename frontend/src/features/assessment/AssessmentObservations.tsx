export function AssessmentObservations({ observations }: { observations: string[] }) {
  if (!observations || observations.length === 0) return null;
  return (
    <div className="mt-3">
      <h2 className="text-sm font-bold">Handwriting observations</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-navy-800">
        {observations.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </div>
  );
}

export default AssessmentObservations;
