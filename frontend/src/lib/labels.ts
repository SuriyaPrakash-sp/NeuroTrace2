import type { MetricKey } from "./types";
export type Tone = "indigo" | "mint" | "amber" | "rose" | "slate";

export const METRIC_ORDER: MetricKey[] = ["letter_formation", "baseline_alignment", "word_spacing", "letter_size_consistency", "stroke_control"];
export const METRIC_NAMES: Record<MetricKey | "exercise_score", string> = {
  letter_formation: "Letter formation", baseline_alignment: "Baseline alignment", word_spacing: "Word spacing",
  letter_size_consistency: "Letter size consistency", stroke_control: "Stroke control", exercise_score: "Exercise score",
};
export const toneForMetricLabel = (l: string): Tone => (l === "Excellent" ? "mint" : l === "Good" ? "indigo" : l === "Developing" ? "amber" : "rose");
export const toneForPerformance = (l: string): Tone => (l === "Excellent control" ? "mint" : l === "Good progress" ? "indigo" : l === "Developing" ? "amber" : "rose");

export const DISCLAIMER =
  "NeuroTrace provides AI-assisted handwriting observations and therapy-support recommendations. It is not a medical diagnostic tool and does not replace professional therapist judgment.";
