import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { analyzeHandwriting, getStudent } from "../lib/api";
import { useApi, fmtDate } from "../lib/useApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { UploadDropzone } from "../components/UploadDropzone";
import { ErrorState } from "../components/ErrorState";
import { useToast } from "../components/Toast";
import { PageTitle, StudentTabs, PageSkeleton } from "./shared";

export default function StudentProfile() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: s, error, loading, retry } = useApi(() => getStudent(id), [id]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true); setProgress(0); setUploadError(null);
    try {
      const a = await analyzeHandwriting(id, file, setProgress);
      if (a.status === "failed") {
        setUploadError(a.warnings[0] ?? "The sample could not be analysed. Please try a clearer photo.");
        toast("Analysis could not be completed.", "error");
      } else {
        toast(a.warnings.length ? "Analysis complete with warnings. Please review." : "Analysis complete.", a.warnings.length ? "info" : "success");
        nav(`/students/${id}/assessment`);
      }
    } catch (e) { setUploadError((e as Error).message); toast((e as Error).message, "error"); }
    finally { setUploading(false); setProgress(null); }
  };

  if (error) return <ErrorState message={error.message} onRetry={retry} />;
  if (loading || !s) return <PageSkeleton />;
  const goals = s.primary_goals ?? [];
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Students", to: "/students" }, { label: s.name }]} />
      <PageTitle title={s.name} subtitle={`Age ${s.age} · ${s.grade}`} />
      <StudentTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Overview</h2>
          <div className="mb-4 flex items-center justify-between border-b border-warm-200 pb-2 text-sm"><span className="text-navy-700">Added</span><span className="font-semibold">{fmtDate(s.created_at)}</span></div>
          <h3 className="text-sm font-bold">Therapy goals</h3>
          {goals.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-800">{goals.map((g) => <li key={g}>{g}</li>)}</ul> : <p className="mt-1 text-sm text-navy-700">No goals recorded.</p>}
          {s.notes && <p className="mt-4 rounded-xl bg-warm-100 p-3 text-sm text-navy-800">{s.notes}</p>}
        </section>
        <section className="lg:col-span-3">
          <h2 className="mb-3 text-lg font-bold">Upload handwriting sample</h2>
          <UploadDropzone onUpload={upload} uploading={uploading} progress={progress} />
          {uploadError && <div role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{uploadError}</div>}
        </section>
      </div>
    </>
  );
}
