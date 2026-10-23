import type * as T from "./types";
import * as M from "./mockData";
import { cache } from "./cache";
import { clamp, performanceLabel } from "./scoring";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";
const MOCK_ENABLED = import.meta.env.VITE_USE_MOCK_FALLBACK !== "false";

// Routes exactly as in the contract (relative to VITE_API_BASE_URL).
const ROUTES = {
  health: "/health",
  students: "/api/students",
  student: (id: string) => `/api/students/${encodeURIComponent(id)}`,
  analyze: "/api/assessments/analyze",
  generatePlan: "/api/therapy-plans/generate",
  sessions: "/api/exercises/sessions",
  progress: (id: string) => `/api/students/${encodeURIComponent(id)}/progress`,
} as const;

// ---------- demo-mode flag (drives the topbar banner) ----------
let usingDemo = false;
const listeners = new Set<() => void>();
export const fallbackStore = {
  subscribe: (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
  get: () => usingDemo,
};
const setDemo = (v: boolean) => { if (usingDemo !== v) { usingDemo = v; listeners.forEach((l) => l()); } };

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) { super(message); }
}

function parseError(status: number, text: string): ApiError {
  try {
    const body = JSON.parse(text) as Partial<T.ApiErrorBody>;
    if (body.error?.message) return new ApiError(body.error.message, status, body.error.code);
  } catch { /* not JSON */ }
  const msg = status === 413 ? "The file is too large." : status === 404 ? "We couldn't find that record." : `Request failed (${status}).`;
  return new ApiError(msg, status);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Backend is considered unavailable on network failure or 5xx. 4xx errors are real answers and are surfaced. */
async function onFailure<R>(e: unknown, demo?: () => R | Promise<R>): Promise<R> {
  const unavailable = !(e instanceof ApiError) || (e.status !== undefined && e.status >= 500);
  if (unavailable && MOCK_ENABLED && demo) { setDemo(true); await delay(450); return demo(); }
  if (e instanceof ApiError) throw e;
  throw new ApiError("Cannot reach the NeuroTrace server.", undefined, "NETWORK_ERROR");
}

async function request<R>(path: string, init?: RequestInit, demo?: () => R | Promise<R>): Promise<R> {
  try {
    const res = await fetch(BASE + path, init);
    if (!res.ok) throw parseError(res.status, await res.text());
    setDemo(false);
    return (await res.json()) as R;
  } catch (e) { return onFailure(e, demo); }
}

const postJson = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ---------- demo state (in-memory, only used in fallback mode) ----------
const demoStudents: T.Student[] = [...M.mockStudentsResponse.items];
const emptyProgress = (id: string): T.StudentProgress => ({ student_id: id, overall_progress: 0, sessions_completed: 0, metrics: [], recent_sessions: [] });
const demoProgress = new Map<string, T.StudentProgress>([[M.AARAV.id, structuredClone(M.mockProgress)]]);
const demoStudent = (id: string) => {
  const s = demoStudents.find((x) => x.id === id);
  if (!s) throw new ApiError("Student not found.", 404, "NOT_FOUND");
  return s;
};

// ---------- health ----------
export async function checkHealth(): Promise<T.HealthResponse | null> {
  try {
    const res = await fetch(BASE + ROUTES.health);
    if (!res.ok) throw new Error();
    setDemo(false);
    return (await res.json()) as T.HealthResponse;
  } catch { if (MOCK_ENABLED) setDemo(true); return null; }
}

// ---------- students ----------
export const createStudent = (input: T.CreateStudentInput) =>
  request<T.Student>(ROUTES.students, postJson(input), () => {
    const s: T.Student = { id: `student_${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${String(demoStudents.length + 1).padStart(3, "0")}`,
      avatar_url: null, primary_goals: [], notes: "", created_at: new Date().toISOString(), ...input };
    demoStudents.push(s); demoProgress.set(s.id, emptyProgress(s.id));
    return s;
  });

export const listStudents = () => request<T.StudentListResponse>(ROUTES.students, undefined, () => ({ items: [...demoStudents], total: demoStudents.length }));
export const getStudent = (studentId: string) => request<T.Student>(ROUTES.student(studentId), undefined, () => demoStudent(studentId));

// ---------- assessment ----------
export async function analyzeHandwriting(studentId: string, file: File, onProgress?: (pct: number) => void): Promise<T.AssessmentResponse> {
  const form = new FormData();
  form.append("student_id", studentId);
  form.append("sample_type", "handwriting_sample");
  form.append("file", file);
  try {
    const result = await new Promise<T.AssessmentResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest(); // XHR gives real upload progress
      xhr.open("POST", BASE + ROUTES.analyze);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new ApiError("Unexpected server response.", xhr.status, "INTERNAL_ERROR")); }
        } else reject(parseError(xhr.status, xhr.responseText));
      };
      xhr.onerror = () => reject(new TypeError("network"));
      xhr.send(form);
    });
    setDemo(false);
    cache.setAssessment(studentId, result);
    return result;
  } catch (e) {
    const r = await onFailure<T.AssessmentResponse>(e, async () => {
      demoStudent(studentId);
      for (const p of [20, 45, 70, 100]) { onProgress?.(p); await delay(200); }
      return { ...M.mockAssessment, assessment_id: `assessment_demo_${Date.now()}`, student_id: studentId, created_at: new Date().toISOString() };
    });
    cache.setAssessment(studentId, r);
    return r;
  }
}

/** No GET assessment endpoint exists in the contract: reads the latest result returned by analyze (this session). */
export async function getLatestAssessment(studentId: string): Promise<T.AssessmentResponse | null> {
  const cached = cache.getAssessment<T.AssessmentResponse>(studentId);
  if (cached) return cached;
  return usingDemo && studentId === M.AARAV.id ? M.mockAssessment : null;
}

// ---------- therapy plan ----------
export async function generateTherapyPlan(input: T.GenerateTherapyPlanInput): Promise<T.TherapyPlan> {
  const plan = await request<T.TherapyPlan>(ROUTES.generatePlan, postJson(input), () => {
    const s = demoStudent(input.student_id);
    const goals = M.mockPlan.weeks.map((w) => w.goal);
    return {
      ...M.mockPlan, plan_id: `plan_demo_${Date.now()}`, student_id: s.id, assessment_id: input.assessment_id,
      title: `${s.name.split(" ")[0]}'s ${input.duration_weeks}-Week Handwriting Control Plan`, created_at: new Date().toISOString(),
      weeks: Array.from({ length: input.duration_weeks }, (_, i) => ({
        week: i + 1, goal: goals[i] ?? "Consolidate skills in short writing tasks", exercises: i === 0 ? M.mockPlan.weeks[0].exercises : [] })),
    };
  });
  cache.setPlan(input.student_id, plan);
  return plan;
}

/** No GET plan endpoint exists in the contract: reads the latest generated plan (this session). */
export async function getLatestTherapyPlan(studentId: string): Promise<T.TherapyPlan | null> {
  const cached = cache.getPlan<T.TherapyPlan>(studentId);
  if (cached) return cached;
  return usingDemo && studentId === M.AARAV.id ? M.mockPlan : null;
}
export const isPlanReviewed = (planId: string) => cache.isReviewed(planId);
export const markPlanReviewed = (planId: string) => cache.markReviewed(planId);

// ---------- exercise sessions ----------
export const submitExerciseSession = (input: T.SubmitExerciseSessionInput) =>
  request<T.ExerciseSessionResponse>(ROUTES.sessions, postJson(input), () => {
    demoStudent(input.student_id);
    const created_at = new Date().toISOString();
    const res: T.ExerciseSessionResponse = {
      ...input, session_id: `session_demo_${Date.now()}`, performance_label: performanceLabel(input.score), created_at,
      feedback: [input.deviations <= 3 ? "You stayed close to the target path." : "Take your time to stay on the highlighted path.",
        input.smoothness < 80 ? "Try to slow down slightly on diagonal strokes." : "Your movements were smooth and steady."],
    };
    const p = demoProgress.get(input.student_id) ?? emptyProgress(input.student_id);
    const date = created_at.slice(0, 10);
    const row = p.metrics.find((m) => m.date === date);
    if (row) row.exercise_score = input.score;
    else {
      const a = cache.getAssessment<T.AssessmentResponse>(input.student_id);
      p.metrics.push({ date, baseline_alignment: a?.metrics.baseline_alignment.score ?? null, letter_formation: a?.metrics.letter_formation.score ?? null,
        word_spacing: a?.metrics.word_spacing.score ?? null, letter_size_consistency: a?.metrics.letter_size_consistency.score ?? null,
        stroke_control: a?.metrics.stroke_control.score ?? null, exercise_score: input.score });
    }
    p.recent_sessions.unshift({ session_id: res.session_id, exercise_id: input.exercise_id, target_character: input.target_character, score: input.score, performance_label: res.performance_label, created_at });
    p.sessions_completed += 1;
    const first = p.metrics.find((m) => m.exercise_score !== null)?.exercise_score ?? input.score;
    p.overall_progress = clamp(input.score - first);
    demoProgress.set(input.student_id, p);
    return res;
  });

// ---------- progress ----------
export const getStudentProgress = (studentId: string) =>
  request<T.StudentProgress>(ROUTES.progress(studentId), undefined, () => {
    demoStudent(studentId);
    return structuredClone(demoProgress.get(studentId) ?? emptyProgress(studentId));
  });

// ---------- dashboard (no dashboard endpoint in contract: composed from listStudents + getStudentProgress) ----------
export interface DashboardData {
  students: T.Student[]; total: number; totalSessions: number; avgProgress: number | null; notStarted: number;
}
export async function getDashboardData(): Promise<DashboardData> {
  const list = await listStudents();
  const results = await Promise.allSettled(list.items.map((s) => getStudentProgress(s.id)));
  const progress = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const withSessions = progress.filter((p) => p.sessions_completed > 0);
  return {
    students: list.items, total: list.total,
    totalSessions: progress.reduce((n, p) => n + p.sessions_completed, 0),
    avgProgress: withSessions.length ? Math.round(withSessions.reduce((n, p) => n + p.overall_progress, 0) / withSessions.length) : null,
    notStarted: list.items.length - withSessions.length,
  };
}

/** Resolve a backend-relative asset path (e.g. sample_url). Null in demo mode where no file exists. */
export const resolveAssetUrl = (url: string | null) => (!url || usingDemo ? null : url.startsWith("http") ? url : BASE + url);
