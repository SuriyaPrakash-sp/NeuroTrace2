import { Users, Activity, TrendingUp, UserX } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import type { DashboardData } from "../../lib/api";

export function DashboardStats({ data }: { data: DashboardData }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Students" value={data.total} icon={<Users size={22} />} />
      <StatCard label="Exercise sessions recorded" value={data.totalSessions} icon={<Activity size={22} />} />
      <StatCard label="Average progress indicator" value={data.avgProgress === null ? "—" : data.avgProgress} icon={<TrendingUp size={22} />} tone="mint" />
      <StatCard label="Not started exercises" value={data.notStarted} icon={<UserX size={22} />} tone="amber" />
    </div>
  );
}

export default DashboardStats;
