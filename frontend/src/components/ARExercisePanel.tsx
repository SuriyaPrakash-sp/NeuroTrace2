import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Hand, Loader2, Play, RotateCcw, X } from "lucide-react";
import type { ExerciseCompleteHandler, TherapyExercise } from "../lib/types";
import { calculateScore, calculateTraceMetrics } from "../lib/scoring";
import { TARGET_PATHS, type Point } from "../lib/targetPaths";
import { tracker } from "../features/exercises/HandLandmarkTracker";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const describeCameraError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was denied. Allow camera access for localhost in the browser address bar, then retry.";
  if (name === "NotFoundError") return "No camera was found. Connect a webcam or choose demo mode.";
  if (name === "NotReadableError" || name === "TrackStartError") return "The camera is already being used by another application. Close other camera apps and retry.";
  if (name === "OverconstrainedError") return "The selected camera does not support the requested resolution. Retry with another camera.";
  if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return "Camera access requires HTTPS or localhost. Open the app at http://localhost:5173.";
  if (error instanceof Error && /fetch|network|wasm|model|delegate/i.test(error.message)) return "The hand-tracking model could not load. Check your internet connection and retry; CPU fallback is enabled.";
  return error instanceof Error ? error.message : "Camera or hand tracking could not be started.";
};
const normalizePath = (character: string): Point[] => {
  const source = TARGET_PATHS[character.toLowerCase()] ?? TARGET_PATHS.a;
  return source.points.map((point) => ({ x: point.x / 100, y: point.y / 100 }));
};

type Mode = "idle" | "loading" | "camera" | "demo" | "complete";

export function ARExercisePanel({
  exercise,
  onComplete,
  onCancel,
}: {
  exercise: TherapyExercise;
  onComplete: ExerciseCompleteHandler;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const pathRef = useRef<Point[]>([]);
  const startedAtRef = useRef<number>(0);
  const lastTimestampRef = useRef(0);
  const smoothPointRef = useRef<Point | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [message, setMessage] = useState("Enable the camera and trace the highlighted path with your index finger.");
  const [handDetected, setHandDetected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const targetPath = useMemo(() => normalizePath(exercise.target_character), [exercise.target_character]);

  const stopMedia = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (demoTimerRef.current !== null) window.clearTimeout(demoTimerRef.current);
    demoTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    tracker.stop();
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => {
    stopMedia();
    tracker.close();
  }, [stopMedia]);

  const draw = useCallback((width: number, height: number, currentPoint?: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.lineCap = "round";
    context.lineJoin = "round";

    context.setLineDash([10, 12]);
    context.lineWidth = Math.max(5, width * 0.012);
    context.strokeStyle = "rgba(110, 231, 183, 0.8)";
    context.beginPath();
    targetPath.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.setLineDash([]);

    const userPath = pathRef.current;
    if (userPath.length > 1) {
      context.lineWidth = Math.max(4, width * 0.009);
      context.strokeStyle = "#fbbf24";
      context.beginPath();
      userPath.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }

    if (currentPoint) {
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#22c55e";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(currentPoint.x * width, currentPoint.y * height, Math.max(9, width * 0.018), 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }, [targetPath]);

  const finish = useCallback(() => {
    if (mode !== "camera" && mode !== "demo") return;
    const metrics = calculateTraceMetrics(pathRef.current, targetPath);
    const score = calculateScore(metrics.path_coverage, metrics.proximity, metrics.smoothness);
    const completion_time_seconds = Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000));
    stopMedia();
    setMode("complete");
    setProgress(100);
    setMessage("Exercise complete. Your result is ready to review.");
    onComplete({
      target_character: exercise.target_character,
      path_coverage: metrics.path_coverage,
      accuracy: metrics.proximity,
      smoothness: metrics.smoothness,
      deviations: metrics.deviations,
      completion_time_seconds,
      score,
    });
  }, [exercise.target_character, mode, onComplete, stopMedia, targetPath]);

  const loop = useCallback((timestamp: number) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(loop);
      return;
    }
    const result = tracker.detect(video, timestamp);
    const landmarks = result?.landmarks?.[0];
    const indexTip = landmarks?.[8];
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || video.clientWidth || 640;
    const height = canvas?.clientHeight || video.clientHeight || 480;
    if (indexTip) {
      setHandDetected(true);
      const raw = { x: clamp01(indexTip.x), y: clamp01(indexTip.y) };
      const previous = smoothPointRef.current;
      const point = previous
        ? { x: previous.x * 0.65 + raw.x * 0.35, y: previous.y * 0.65 + raw.y * 0.35 }
        : raw;
      smoothPointRef.current = point;
      const last = pathRef.current[pathRef.current.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 0.004) pathRef.current.push(point);
      const metrics = calculateTraceMetrics(pathRef.current, targetPath);
      setProgress(Math.min(99, Math.max(0, metrics.path_coverage)));
      draw(width, height, point);
    } else {
      setHandDetected(false);
      draw(width, height);
    }
    lastTimestampRef.current = timestamp;
    frameRef.current = requestAnimationFrame(loop);
  }, [draw, targetPath]);

  const startCamera = async () => {
    setError(null);
    setMode("loading");
    setMessage("Loading the camera and hand-tracking model…");
    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        throw new Error("Camera access requires HTTPS or localhost. Open the app at http://localhost:5173.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not expose camera access. Use the latest Chrome or Edge.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is unavailable.");
      video.srcObject = stream;
      await video.play();
      await tracker.start();
      pathRef.current = [];
      smoothPointRef.current = null;
      startedAtRef.current = performance.now();
      setMode("camera");
      setMessage(`Trace the glowing path with your index finger. ${tracker.getDelegate()} tracking active.`);
      frameRef.current = requestAnimationFrame(loop);
    } catch (caught) {
      stopMedia();
      setMode("idle");
      setError(describeCameraError(caught));
      setMessage("You can retry camera access or use the controlled demo fallback.");
    }
  };

  const startDemo = () => {
    stopMedia();
    pathRef.current = [];
    startedAtRef.current = performance.now();
    setMode("demo");
    setError(null);
    setMessage("Demo mode is simulating a steady finger trace through the target path.");
    let index = 0;
    const tick = () => {
      const point = targetPath[Math.min(index, targetPath.length - 1)];
      pathRef.current.push(point);
      draw(640, 420, point);
      setProgress(Math.round((index / Math.max(1, targetPath.length - 1)) * 100));
      index += 1;
      if (index < targetPath.length) demoTimerRef.current = window.setTimeout(tick, 400);
    };
    tick();
  };

  return (
    <div className="card mt-4 animate-fadeUp p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-500">Interactive exercise</p>
          <h3 className="font-display text-xl font-extrabold text-navy-950">Trace {exercise.target_character}</h3>
        </div>
        {mode !== "camera" && mode !== "demo" && <button className="btn-ghost !px-2.5" onClick={onCancel} aria-label="Close exercise"><X size={16} /></button>}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl bg-navy-950">
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${mode === "camera" ? "scale-x-[-1]" : "opacity-0"}`} playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full scale-x-[-1]" aria-label="Tracing path overlay" />
        {mode === "idle" || mode === "loading" ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            <div><div className="font-display text-8xl font-extrabold text-mint-400">{exercise.target_character}</div><p className="mt-3 text-sm text-indigo-100">Camera-guided finger tracing</p></div>
          </div>
        ) : null}
        {mode === "complete" ? <div className="absolute inset-0 grid place-items-center bg-navy-950/90 text-center text-white"><div><div className="text-5xl">✓</div><p className="mt-2 font-bold">Exercise recorded</p></div></div> : null}
        {mode === "camera" ? <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-semibold text-white"><span className={`h-2 w-2 rounded-full ${handDetected ? "bg-mint-400" : "bg-amber-400"}`} />{handDetected ? "Hand detected" : "Show your index finger"}</div> : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-navy-700"><Hand size={16} /> {message}</span>
        <strong className="text-navy-950">{progress}%</strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-warm-200"><div className="h-full rounded-full bg-mint-500 transition-all" style={{ width: `${progress}%` }} /></div>
      {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {(mode === "idle" || mode === "loading") && <><button className="btn-primary" onClick={startCamera} disabled={mode === "loading"}>{mode === "loading" ? <><Loader2 className="mr-2 inline animate-spin" size={16} />Loading…</> : <><Camera className="mr-2 inline" size={16} />Enable camera</>}</button><button className="btn-ghost" onClick={startDemo}><Play className="mr-2 inline" size={16} />Use demo mode</button></>}
        {(mode === "camera" || mode === "demo") && <><button className="btn-primary" onClick={finish}>Finish exercise</button><button className="btn-ghost" onClick={() => { stopMedia(); setMode("idle"); setProgress(0); pathRef.current = []; }}><RotateCcw className="mr-2 inline" size={16} />Restart</button></>}
        {mode === "complete" && <button className="btn-primary" onClick={onCancel}>Return to plan</button>}
      </div>
    </div>
  );
}
