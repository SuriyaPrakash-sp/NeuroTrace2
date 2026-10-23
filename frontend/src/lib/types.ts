// Types mirror shared/api-contract.md v1.0 exactly. Do not rename fields.

export interface Student {
  id: string;
  name: string;
  age: number;
  grade: string;
  avatar_url?: string | null;
  primary_goals?: string[];
  notes?: string;
  created_at: string;
}
export interface CreateStudentInput { name: string; age: number; grade: string; primary_goals?: string[]; notes?: string }
export interface StudentListResponse { items: Student[]; total: number }

export type MetricKey = "letter_formation" | "baseline_alignment" | "word_spacing" | "letter_size_consistency" | "stroke_control";
export type MetricLabel = "Excellent" | "Good" | "Developing" | "Needs attention";
export interface AssessmentMetric { score: number; label: MetricLabel; description: string }
export interface AssessmentResponse {
  assessment_id: string;
  student_id: string;
  status: "processing" | "completed" | "failed";
  sample_url: string | null;
  overall_score: number;
  analysis_confidence: number | null;
  metrics: Record<MetricKey, AssessmentMetric>;
  observations: string[];
  warnings: string[];
  created_at: string;
}

export type ExerciseType = "tracing" | "letter_formation" | "spacing" | "copying" | "ar_exercise";
export interface TherapyExercise {
  id: string; name: string; type: ExerciseType | string; duration_minutes: number; difficulty: string;
  instructions: string; target_character: string; repetitions: number;
}
export interface TherapyWeek { week: number; goal: string; exercises: TherapyExercise[] }
export interface GenerateTherapyPlanInput { student_id: string; assessment_id: string; duration_weeks: number; therapist_notes?: string }
export interface TherapyPlan {
  plan_id: string; student_id: string; assessment_id: string; title: string; summary: string;
  primary_focus: string[]; weeks: TherapyWeek[]; therapist_review_required: boolean; status: string; created_at: string;
}

// Section 11: callback shape exposed by the camera exercise component.
export type ExerciseResult = {
  score: number; accuracy: number; completion_time_seconds: number; path_coverage: number;
  smoothness: number; deviations: number; target_character: string;
};
export type ExerciseCompleteHandler = (result: ExerciseResult) => void;
export type SubmitExerciseSessionInput = ExerciseResult & { student_id: string; exercise_id: string };
export interface ExerciseSessionResponse extends SubmitExerciseSessionInput {
  session_id: string; performance_label: string; feedback: string[]; created_at: string;
}

export interface ProgressMetricPoint {
  date: string;
  baseline_alignment: number | null; letter_formation: number | null; word_spacing: number | null;
  letter_size_consistency: number | null; stroke_control: number | null; exercise_score: number | null;
}
export interface RecentSession {
  session_id: string; exercise_id: string; target_character: string; score: number; performance_label: string; created_at: string;
}
export interface StudentProgress {
  student_id: string; overall_progress: number; sessions_completed: number;
  metrics: ProgressMetricPoint[]; recent_sessions: RecentSession[];
}
export interface HealthResponse { status: string; service: string; version: string }
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }
