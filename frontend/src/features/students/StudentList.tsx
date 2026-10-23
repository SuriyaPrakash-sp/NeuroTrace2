import { StudentCard } from "../../components/StudentCard";
import type { Student } from "../../lib/types";

export function StudentList({ students }: { students: Student[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((s) => (
        <StudentCard key={s.id} student={s} />
      ))}
    </div>
  );
}

export default StudentList;
