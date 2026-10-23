import { useState } from "react";
import type { ProgressMetricPoint } from "../lib/types";
import { METRIC_NAMES } from "../lib/labels";

type Key = keyof typeof METRIC_NAMES;
const SERIES: { key: Key; color: string }[] = [
  { key: "exercise_score", color: "#10204A" },
  { key: "baseline_alignment", color: "#4B52D4" },
  { key: "letter_formation", color: "#1E9F74" },
  { key: "word_spacing", color: "#D97706" },
  { key: "letter_size_consistency", color: "#E11D48" },
  { key: "stroke_control", color: "#0284C7" },
];
const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

// Dependency-free SVG line chart. null values (unknown) are skipped, not plotted as zero.
export function ProgressChart({ points }: { points: ProgressMetricPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [off, setOff] = useState<Set<Key>>(new Set());
  const toggle = (k: Key) => setOff((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const W = 680, H = 300, P = { l: 36, r: 16, t: 16, b: 32 };
  const x = (i: number) => P.l + (points.length < 2 ? (W - P.l - P.r) / 2 : (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / 100) * (H - P.t - P.b);

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap gap-2">
        {SERIES.map((s) => (
          <button key={s.key} aria-pressed={!off.has(s.key)} onClick={() => toggle(s.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${off.has(s.key) ? "border-warm-200 bg-white text-navy-700/60" : "border-navy-900/20 bg-warm-100 text-navy-900"}`}>
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, opacity: off.has(s.key) ? 0.3 : 1 }} />{METRIC_NAMES[s.key]}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Progress indicators over time">
        {[0, 25, 50, 75, 100].map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#F0E9DB" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#2A3F7E">{t}</text></g>))}
        {points.map((p, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#2A3F7E">{fmt(p.date)}</text>)}
        {SERIES.filter((s) => !off.has(s.key)).map((s) => {
          const pts = points.map((p, i) => ({ i, v: p[s.key] })).filter((q): q is { i: number; v: number } => q.v !== null);
          return (
            <g key={s.key}>
              {pts.length > 1 && <polyline fill="none" stroke={s.color} strokeWidth={s.key === "exercise_score" ? 3.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" points={pts.map((q) => `${x(q.i)},${y(q.v)}`).join(" ")} />}
              {pts.map((q) => <circle key={q.i} cx={x(q.i)} cy={y(q.v)} r={hover === q.i ? 6 : 4} fill="#fff" stroke={s.color} strokeWidth={2.5} />)}
            </g>
          );
        })}
        {points.map((_, i) => <rect key={i} x={x(i) - 24} y={P.t} width={48} height={H - P.t - P.b} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
      </svg>
      <div className="mt-2 min-h-[1.5rem] text-sm text-navy-700" aria-live="polite">
        {hover !== null && points[hover] && SERIES.filter((s) => points[hover][s.key] !== null).map((s) => `${METRIC_NAMES[s.key]}: ${points[hover][s.key]}`).join(" · ")}
      </div>
    </div>
  );
}
