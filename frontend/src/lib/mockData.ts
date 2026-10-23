// Demo fallback data (contract section 12 seed + section examples). Used ONLY when the backend is unreachable.
import type * as T from "./types";

export const AARAV: T.Student = {
  id: "student_aarav_001", name: "Aarav Sharma", age: 9, grade: "Grade 4", avatar_url: null,
  primary_goals: ["Improve baseline alignment", "Improve letter formation", "Improve word spacing"],
  notes: "Shows inconsistent letter height and spacing.", created_at: "2026-10-24T08:00:00Z",
};
export const mockStudentsResponse: T.StudentListResponse = { items: [AARAV], total: 1 };

export const mockAssessment: T.AssessmentResponse = {
  assessment_id: "assessment_001", student_id: AARAV.id, status: "completed", sample_url: "/uploads/handwriting.png",
  overall_score: 68, analysis_confidence: 0.86,
  metrics: {
    letter_formation: { score: 64, label: "Needs attention", description: "Several letter shapes show inconsistent stroke structure." },
    baseline_alignment: { score: 58, label: "Developing", description: "Characters frequently drift above or below the writing line." },
    word_spacing: { score: 72, label: "Developing", description: "Spacing is present but inconsistent across words." },
    letter_size_consistency: { score: 70, label: "Developing", description: "Letter height varies moderately." },
    stroke_control: { score: 76, label: "Good", description: "Most strokes are continuous with a few visible hesitations." },
  },
  observations: ["Baseline alignment is the highest-priority area.", "Letter size varies across the sample.", "Word spacing should be reinforced through guided exercises."],
  warnings: [], created_at: "2026-10-24T08:10:00Z",
};

export const mockPlan: T.TherapyPlan = {
  plan_id: "plan_001", student_id: AARAV.id, assessment_id: "assessment_001",
  title: "Aarav's 4-Week Handwriting Control Plan",
  summary: "A progressive plan focused on baseline alignment, letter formation and word spacing.",
  primary_focus: ["Baseline alignment", "Letter formation", "Word spacing"],
  weeks: [
    { week: 1, goal: "Recognize and maintain the writing baseline", exercises: [
      { id: "exercise_trace_line", name: "Trace the Path", type: "tracing", duration_minutes: 5, difficulty: "Beginner",
        instructions: "Follow the highlighted path using your index finger.", target_character: "A", repetitions: 3 } ] },
    { week: 2, goal: "Improve letter formation and stroke direction", exercises: [] },
    { week: 3, goal: "Improve spacing between letters and words", exercises: [] },
    { week: 4, goal: "Combine skills in short writing tasks", exercises: [] },
  ],
  therapist_review_required: true, status: "draft", created_at: "2026-10-24T08:15:00Z",
};

export const mockSessionResponse: T.ExerciseSessionResponse = {
  session_id: "session_001", student_id: AARAV.id, exercise_id: "exercise_trace_line", target_character: "A",
  score: 84, accuracy: 88, completion_time_seconds: 21, path_coverage: 91, smoothness: 76, deviations: 3,
  performance_label: "Good progress", feedback: ["You stayed close to the target path.", "Try to slow down slightly on diagonal strokes."],
  created_at: "2026-10-24T08:20:00Z",
};

// Seed: previous exercise scores 61, 68, 76. Assessment metrics are null before the first assessment (contract: unknown => null).
const nulls = { baseline_alignment: null, letter_formation: null, word_spacing: null, letter_size_consistency: null, stroke_control: null };
export const mockProgress: T.StudentProgress = {
  student_id: AARAV.id, overall_progress: 15, sessions_completed: 3,
  metrics: [
    { date: "2026-10-17", ...nulls, exercise_score: 61 },
    { date: "2026-10-20", ...nulls, exercise_score: 68 },
    { date: "2026-10-22", ...nulls, exercise_score: 76 },
    { date: "2026-10-24", baseline_alignment: 58, letter_formation: 64, word_spacing: 72, letter_size_consistency: 70, stroke_control: 76, exercise_score: null },
  ],
  recent_sessions: [
    { session_id: "session_seed_003", exercise_id: "exercise_trace_line", target_character: "A", score: 76, performance_label: "Good progress", created_at: "2026-10-22T09:00:00Z" },
    { session_id: "session_seed_002", exercise_id: "exercise_trace_line", target_character: "A", score: 68, performance_label: "Developing", created_at: "2026-10-20T09:00:00Z" },
    { session_id: "session_seed_001", exercise_id: "exercise_trace_line", target_character: "A", score: 61, performance_label: "Developing", created_at: "2026-10-17T09:00:00Z" },
  ],
};
