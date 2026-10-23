import { Activity } from "lucide-react";
import { fmtDate } from "../../lib/useApi";
import type { RecentSession } from "../../lib/types";

export function RecentActivity({ sessions }: { sessions: RecentSession[] }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="card p-5 text-sm text-navy-700">
        No recent activity logged.
      </div>
    );
  }
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-base font-bold flex items-center gap-2">
        <Activity size={18} className="text-indigo-600" /> Recent Activity
      </h3>
      <ul className="space-y-2.5">
        {sessions.map((s) => (
          <li key={s.session_id} className="flex items-center justify-between border-b border-warm-100 pb-2 text-sm last:border-b-0">
            <div>
              <span className="font-semibold">Letter {s.target_character}</span>
              <span className="ml-2 text-xs text-navy-700">{fmtDate(s.created_at)}</span>
            </div>
            <span className="rounded-full bg-mint-50 px-2 py-0.5 text-xs font-bold text-mint-700">
              Score: {s.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentActivity;
