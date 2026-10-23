import { TherapyPlanCard } from "../../components/TherapyPlanCard";
import type { TherapyWeek } from "../../lib/types";

export function WeeklyPlanTimeline({
  weeks,
  studentId,
  canLaunch
}: {
  weeks: TherapyWeek[];
  studentId: string;
  canLaunch: boolean;
}) {
  return (
    <div className="space-y-4">
      {weeks.map((w) => (
        <TherapyPlanCard key={w.week} week={w} studentId={studentId} canLaunch={canLaunch} />
      ))}
    </div>
  );
}

export default WeeklyPlanTimeline;
