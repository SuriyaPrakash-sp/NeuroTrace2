import { TrendingUp, Activity } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import type { StudentProgress } from "../../lib/types";

export function ProgressOverview({ progress }: { progress: StudentProgress }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <StatCard label="Overall progress" value={progress.overall_progress} icon={<TrendingUp size={22} />} tone="mint" />
      <StatCard label="Exercise sessions completed" value={progress.sessions_completed} icon={<Activity size={22} />} />
    </div>
  );
}

export default ProgressOverview;
