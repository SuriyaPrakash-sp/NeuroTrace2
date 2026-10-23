import { StatusBadge } from "../../components/StatusBadge";
import { toneForPerformance } from "../../lib/labels";
import { fmtDate } from "../../lib/useApi";
import type { RecentSession } from "../../lib/types";

export function SessionHistory({ sessions }: { sessions: RecentSession[] }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.session_id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-bold">
              Letter {s.target_character} · score {s.score}
            </div>
            <div className="text-xs text-navy-700">{fmtDate(s.created_at)}</div>
          </div>
          <StatusBadge label={s.performance_label} tone={toneForPerformance(s.performance_label)} />
        </li>
      ))}
    </ul>
  );
}

export default SessionHistory;
