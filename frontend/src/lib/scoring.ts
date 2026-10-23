// Contract 7.2: score = 0.45*path_coverage + 0.35*proximity_score + 0.20*smoothness_score
export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export const calculateScore = (path_coverage: number, proximity: number, smoothness: number) =>
  clamp(0.45 * clamp(path_coverage) + 0.35 * clamp(proximity) + 0.2 * clamp(smoothness));
export const performanceLabel = (score: number) =>
  score >= 85 ? "Excellent control" : score >= 70 ? "Good progress" : score >= 50 ? "Developing" : "Keep practicing";
