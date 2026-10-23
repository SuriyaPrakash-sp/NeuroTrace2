import { useEffect, useSyncExternalStore } from "react";
import { Menu, DatabaseZap } from "lucide-react";
import { checkHealth, fallbackStore } from "../lib/api";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const demo = useSyncExternalStore(fallbackStore.subscribe, fallbackStore.get);
  useEffect(() => { void checkHealth(); }, []);
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-warm-200 bg-warm-50/90 px-4 py-3 backdrop-blur sm:px-8">
      <button className="btn-ghost !px-3 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={18} /></button>
      <div className="hidden text-sm text-navy-700 lg:block">Welcome back, therapist</div>
      <div className="flex items-center gap-3">
        {demo && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
            <DatabaseZap size={14} /> Demo data (backend offline)
          </span>
        )}
        <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white" aria-label="Therapist account">DR</div>
      </div>
    </header>
  );
}
