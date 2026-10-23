import { ClipboardCheck } from "lucide-react";

export function TherapistReviewBanner({ onReview }: { onReview: () => void }) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm font-medium text-amber-900">
        <ClipboardCheck size={20} className="mt-0.5 shrink-0" />
        This plan is a draft. Therapist review is required before exercises are assigned.
      </p>
      <button className="btn-primary shrink-0" onClick={onReview}>
        Mark as reviewed
      </button>
    </div>
  );
}

export default TherapistReviewBanner;
