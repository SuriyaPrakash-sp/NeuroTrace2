import { AlertTriangle, RotateCw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center border-rose-100 px-6 py-12 text-center animate-fadeUp">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle size={26} /></div>
      <h3 className="text-lg font-bold">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-700">{message ?? "We couldn't load this right now."}</p>
      {onRetry && <button onClick={onRetry} className="btn-primary mt-5"><RotateCw size={16} /> Try again</button>}
    </div>
  );
}
