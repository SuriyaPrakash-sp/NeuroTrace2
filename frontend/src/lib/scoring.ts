// Exercise score contract: 0.45*path_coverage + 0.35*proximity + 0.20*smoothness.
export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const calculateScore = (path_coverage: number, proximity: number, smoothness: number) =>
  clamp(0.45 * clamp(path_coverage) + 0.35 * clamp(proximity) + 0.2 * clamp(smoothness));

export const performanceLabel = (score: number) =>
  score >= 85 ? "Excellent control" : score >= 70 ? "Good progress" : score >= 50 ? "Developing" : "Keep practicing";

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function pointToSegmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function calculateTraceMetrics(userPath: Point[], targetPath: Point[]) {
  if (userPath.length < 2 || targetPath.length < 2) {
    return { path_coverage: 0, proximity: 0, smoothness: 0, deviations: 0 };
  }

  const tolerance = 0.075;
  let covered = 0;
  let totalDistance = 0;
  let deviations = 0;

  for (let i = 0; i < targetPath.length - 1; i += 1) {
    const segmentStart = targetPath[i];
    const segmentEnd = targetPath[i + 1];
    const visited = userPath.some((point) => pointToSegmentDistance(point, segmentStart, segmentEnd) <= tolerance);
    if (visited) covered += 1;
  }

  for (const point of userPath) {
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < targetPath.length - 1; i += 1) {
      nearest = Math.min(nearest, pointToSegmentDistance(point, targetPath[i], targetPath[i + 1]));
    }
    totalDistance += nearest;
    if (nearest > tolerance) deviations += 1;
  }

  let directionChanges = 0;
  let samples = 0;
  let previousAngle: number | null = null;
  for (let i = 2; i < userPath.length; i += 1) {
    const first = userPath[i - 1];
    const second = userPath[i];
    const previous = userPath[i - 2];
    const angle = Math.atan2(second.y - first.y, second.x - first.x);
    const previousSegmentAngle = Math.atan2(first.y - previous.y, first.x - previous.x);
    if (previousAngle !== null && Math.abs(angle - previousAngle) > Math.PI / 2) directionChanges += 1;
    previousAngle = previousSegmentAngle;
    samples += 1;
  }

  const path_coverage = clamp((covered / Math.max(1, targetPath.length - 1)) * 100);
  const averageDistance = totalDistance / userPath.length;
  const proximity = clamp((1 - Math.min(1, averageDistance / 0.18)) * 100);
  const smoothness = clamp((1 - Math.min(1, directionChanges / Math.max(1, samples * 0.35))) * 100);
  return { path_coverage, proximity, smoothness, deviations };
}
