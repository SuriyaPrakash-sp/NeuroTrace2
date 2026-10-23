import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileImage, X, Loader2 } from "lucide-react";

const MAX_MB = 10;
const ACCEPT = ["image/png", "image/jpeg"]; // contract: PNG, JPG, JPEG

export function UploadDropzone({ onUpload, uploading, progress }: { onUpload: (file: File) => void; uploading: boolean; progress: number | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = (f?: File) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setErr("Please choose a PNG, JPG, or JPEG image.");
    if (f.size > MAX_MB * 1024 * 1024) return setErr(`File is larger than ${MAX_MB} MB.`);
    setErr(null); setFile(f);
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); };

  return (
    <div className="card p-5">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={drop}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-indigo-500 bg-indigo-50" : "border-indigo-100 bg-warm-50"}`}>
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><UploadCloud size={26} /></div>
        <p className="font-bold">Drag a handwriting sample here</p>
        <p className="mt-1 text-sm text-navy-700">PNG, JPG or JPEG up to {MAX_MB} MB. Use a well-lit, flat photo of the page.</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => input.current?.click()} disabled={uploading}>Browse files</button>
        <input ref={input} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" className="sr-only" aria-label="Upload handwriting sample" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{err}</p>}
      {file && (
        <div className="mt-4 rounded-xl bg-indigo-50 p-3 animate-fadeUp">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm"><FileImage className="text-indigo-600" size={20} />
              <div><div className="font-semibold">{file.name}</div><div className="text-navy-700">{(file.size / 1024).toFixed(0)} KB</div></div></div>
            <div className="flex items-center gap-2">
              <button className="btn-primary" disabled={uploading} onClick={() => onUpload(file)}>
                {uploading ? <><Loader2 size={16} className="animate-spin" /> Analysing…</> : "Upload & analyse"}
              </button>
              {!uploading && <button className="btn-ghost !px-2.5" onClick={() => setFile(null)} aria-label="Remove file"><X size={16} /></button>}
            </div>
          </div>
          {uploading && progress !== null && (
            <div className="mt-3" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-navy-700">{progress < 100 ? `Uploading ${progress}%` : "Upload complete. AI-assisted analysis in progress…"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
