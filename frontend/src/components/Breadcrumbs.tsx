import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb { label: string; to?: string }
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-navy-700">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {c.to ? <Link to={c.to} className="rounded hover:text-indigo-600 hover:underline">{c.label}</Link>
                  : <span aria-current="page" className="font-semibold text-navy-950">{c.label}</span>}
            {i < items.length - 1 && <ChevronRight size={14} className="text-navy-700/50" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
