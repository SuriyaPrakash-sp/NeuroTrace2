import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createStudent } from "../lib/api";
import type { Student } from "../lib/types";
import { useToast } from "./Toast";

export function AddStudentForm({ onCreated, onCancel }: { onCreated: (s: Student) => void; onCancel: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(""); const [age, setAge] = useState(""); const [grade, setGrade] = useState("");
  const [goals, setGoals] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(age);
    if (!name.trim() || !grade.trim() || !Number.isInteger(n) || n < 1) return setErr("Please enter a name, a whole-number age, and a grade.");
    setBusy(true); setErr(null);
    try {
      const s = await createStudent({ name: name.trim(), age: n, grade: grade.trim(),
        primary_goals: goals.split("\n").map((g) => g.trim()).filter(Boolean), notes: notes.trim() || undefined });
      toast(`${s.name} added.`, "success"); onCreated(s);
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };
  const field = "mt-1 w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm";
  return (
    <form onSubmit={submit} className="card mb-6 animate-fadeUp space-y-4 p-5">
      <h2 className="text-lg font-bold">Add a student</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold sm:col-span-1">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="text-sm font-semibold">Age<input className={field} type="number" min={1} value={age} onChange={(e) => setAge(e.target.value)} required /></label>
        <label className="text-sm font-semibold">Grade<input className={field} placeholder="Grade 4" value={grade} onChange={(e) => setGrade(e.target.value)} required /></label>
      </div>
      <label className="block text-sm font-semibold">Therapy goals <span className="font-normal text-navy-700">(one per line, optional)</span>
        <textarea className={field} rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Therapist notes <span className="font-normal text-navy-700">(optional)</span>
        <textarea className={field} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      {err && <p role="alert" className="text-sm font-medium text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Create student"}</button>
      </div>
    </form>
  );
}
