import { TrendingUp } from "lucide-react";

export function ImprovementSummary({ overallProgress }: { overallProgress: string }) {
  return (
    <div className="card p-4 border-mint-200 bg-mint-50/50 flex items-center gap-3">
      <TrendingUp className="text-mint-600" size={24} />
      <div>
        <h4 className="font-bold text-mint-950">Overall Trajectory</h4>
        <p className="text-xs text-mint-800">Longitudinal motor control indicator: {overallProgress}</p>
      </div>
    </div>
  );
}

export default ImprovementSummary;
