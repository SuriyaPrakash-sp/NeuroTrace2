export { fmtDate } from "./useApi";
export { clamp, calculateScore, performanceLabel } from "./scoring";
export { METRIC_NAMES, METRIC_ORDER, toneForPerformance } from "./labels";

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
