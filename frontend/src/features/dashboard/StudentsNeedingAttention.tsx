import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { Student } from "../../lib/types";

export function StudentsNeedingAttention({ students }: { students: Student[] }) {
  if (!students || students.length === 0) {
    return null;
  }

  return (
    <div className="card mb-6 border-amber-200 bg-amber-50/50 p-4">
      <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-2">
        <AlertCircle size={18} className="text-amber-600" />
        Caseload Overview ({students.length})
      </h3>
      <ul className="space-y-1.5 text-sm text-amber-950">
        {students.slice(0, 5).map((s) => (
          <li key={s.id} className="flex justify-between items-center">
            <Link to={`/students/${s.id}`} className="font-semibold underline hover:text-amber-800">
              {s.name}
            </Link>
            <span className="text-xs bg-amber-100 text-amber-800 rounded px-2 py-0.5">
              Grade {s.grade}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StudentsNeedingAttention;
