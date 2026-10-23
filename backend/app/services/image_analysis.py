"""Deterministic, offline handwriting-sample measurements (the always-available fallback).

This is a *heuristic* analyzer: it measures simple, explainable image properties and maps them to
the five contract metrics. It never diagnoses anything and it is intentionally conservative about
confidence. Thresholds should be calibrated against therapist-rated samples before clinical use.

Never raises: any problem becomes ok=False with human-readable warnings.
"""
from __future__ import annotations

import io
import logging
import math
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

from app.utils import clamp_score

logger = logging.getLogger("neurotrace")

MAX_SIDE = 1400
LOW_CONTRAST_WARNING = "The sample has low contrast. Results should be reviewed manually by the therapist."


@dataclass
class HeuristicResult:
    ok: bool
    scores: dict[str, int] = field(default_factory=dict)
    confidence: float | None = None
    warnings: list[str] = field(default_factory=list)
    stats: dict = field(default_factory=dict)


def _fail(*warnings: str) -> HeuristicResult:
    return HeuristicResult(ok=False, warnings=list(warnings))


def analyze_image_bytes(data: bytes) -> HeuristicResult:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:  # noqa: BLE001 - corrupted/truncated/unsupported
        return _fail("The image could not be read. It may be corrupted. Please upload a new PNG or JPG.")
    try:
        return _analyze(img)
    except Exception:  # noqa: BLE001 - never let analysis crash the API
        logger.exception("Heuristic analysis failed")
        return _fail("Automatic analysis could not be completed for this image. "
                     "Please review the sample manually or upload a clearer photo or scan.")


def _word_gaps(gaps: list[float], mh: float) -> np.ndarray:
    """Pick the gaps that are *between words*. If gap sizes are clearly bimodal (tight letter gaps vs
    wide word gaps) split them at the best between-class threshold; otherwise (e.g. joined-up
    writing where every gap is a word gap) fall back to a size threshold."""
    arr = np.sort(np.array(gaps, dtype=float))
    fixed = arr[arr >= 0.4 * mh]
    if len(arr) < 8:
        return fixed
    best_thr, best_var = None, 0.0
    for i in range(2, len(arr) - 2):
        lo, hi = arr[:i], arr[i:]
        between = len(lo) * len(hi) * (hi.mean() - lo.mean()) ** 2 / len(arr) ** 2
        if between > best_var:
            best_var, best_thr = between, (arr[i - 1] + arr[i]) / 2
    if best_thr is None:
        return fixed
    lo, hi = arr[arr < best_thr], arr[arr >= best_thr]
    if len(hi) >= 4 and hi.mean() >= 1.6 * max(lo.mean(), 1.0) and hi.mean() >= 0.4 * mh:
        return hi
    return fixed


def _analyze(img: Image.Image) -> HeuristicResult:
    warnings: list[str] = []
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        canvas = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        canvas.alpha_composite(rgba)
        img = canvas.convert("RGB")
    gray = img.convert("L")
    w, h = gray.size
    if min(w, h) < 120:
        return _fail("The image is too small to analyze. Please upload a larger photo or scan.")
    scale = MAX_SIDE / max(w, h)
    if scale < 1:
        gray = gray.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)

    a = np.asarray(gray, dtype=np.float32)
    if a.mean() < 90:  # light ink on dark paper
        a = 255.0 - a
    H, W = a.shape
    lo, hi = np.percentile(a, (1, 99))
    contrast = float(hi - lo)

    # Flatten uneven lighting (photos), then threshold the "darker than local paper" signal.
    k = max(31, int(max(H, W) / 10)) | 1
    background = ndimage.uniform_filter(a, size=k, mode="nearest")
    diff = np.clip(background - a, 0, None)
    p = float(np.percentile(diff, 99.7))
    if contrast < 25 or p < 12:
        return _fail("No handwriting was detected. The sample looks blank or has very low contrast. "
                     "Please upload a clearer photo or scan.")
    if contrast < 60:
        warnings.append(LOW_CONTRAST_WARNING)
    ink = diff > max(12.0, 0.4 * p)
    if ink.mean() > 0.35:
        warnings.append("A large part of the image is dark, so the sample may be noisy. "
                        "Results should be reviewed manually by the therapist.")

    # Remove dark ruled lines / margins that span the page, then heal strokes they cut.
    rule_rows = ink.mean(axis=1) > 0.5
    rule_cols = ink.mean(axis=0) > 0.5
    if rule_rows.any() or rule_cols.any():
        ink[rule_rows, :] = False
        ink[:, rule_cols] = False
        ink = ndimage.binary_closing(ink, structure=np.ones((3, 1), dtype=bool))

    lab, n = ndimage.label(ink, structure=np.ones((3, 3), dtype=int))
    if n == 0:
        return _fail("No handwriting was detected in this image.")
    slices = ndimage.find_objects(lab)
    areas = np.bincount(lab.ravel(), minlength=n + 1)[1:].astype(float)
    y0 = np.array([s[0].start for s in slices]); y1 = np.array([s[0].stop for s in slices])
    x0 = np.array([s[1].start for s in slices]); x1 = np.array([s[1].stop for s in slices])
    ch, cw = (y1 - y0).astype(float), (x1 - x0).astype(float)

    min_area = max(6, int(0.000012 * H * W))
    keep = (areas >= min_area) & (ch * cw < 0.25 * H * W) & ~((cw > 0.6 * W) & (ch < 0.03 * H))
    kept = np.flatnonzero(keep)
    if len(kept) < 3:
        return _fail("Too little writing was detected to analyze. Please upload a sample with several words.")

    mh = float(np.median(ch[kept]))
    if mh < 6:
        return _fail("The writing is too small in this image to analyze. Please upload a closer photo.")

    cy = (y0 + y1) / 2.0
    cx = (x0 + x1) / 2.0
    letters = kept[ch[kept] >= 0.5 * mh]  # letter-like components (drops dots/commas)
    if len(letters) < 3:
        return _fail("Too little writing was detected to analyze. Please upload a sample with several words.")

    # ---- group letter-like components into text lines -----------------------------------------
    order = letters[np.argsort(cy[letters])]
    lines: list[list[int]] = []
    cur = [order[0]]; cur_sum = cy[order[0]]
    for i in order[1:]:
        if cy[i] - cur_sum / len(cur) > 0.8 * mh:
            lines.append(cur); cur = [i]; cur_sum = cy[i]
        else:
            cur.append(i); cur_sum += cy[i]
    lines.append(cur)
    lines = [sorted(L, key=lambda j: x0[j]) for L in lines]

    # ---- baseline alignment ---------------------------------------------------------------------
    baseline_scores = []
    for L in lines:
        if len(L) < 6:
            continue
        try:
            xs, bs = cx[L], y1[L].astype(float)
            mask = np.ones(len(L), dtype=bool)
            coef, mad = np.array([0.0, 0.0]), 0.0
            for _ in range(3):
                if mask.sum() < 4:
                    break
                coef = np.polyfit(xs[mask], bs[mask], 1)
                res = bs - np.polyval(coef, xs)
                mad = float(np.median(np.abs(res[mask] - np.median(res[mask]))))
                mask = np.abs(res) <= 2.5 * max(1.4826 * mad, 0.02 * mh)  # trims descenders
            drift = 1.4826 * mad / mh
            tilt = abs(math.atan(float(coef[0])))
            baseline_scores.append(100 - 300 * max(0.0, drift - 0.03) - 120 * max(0.0, tilt - 0.03))
        except Exception:  # noqa: BLE001
            continue
    if baseline_scores:
        baseline = float(np.mean(baseline_scores))
    else:
        baseline = 60.0
        warnings.append("Too few letters per line were found to measure baseline alignment reliably. "
                        "The score shown is a neutral estimate.")

    # ---- word spacing ---------------------------------------------------------------------------
    gaps: list[float] = []
    for L in lines:
        right = x1[L[0]]
        for j in L[1:]:
            g = x0[j] - right
            if g > 0:
                gaps.append(float(g))
            right = max(right, x1[j])
    word_gaps = _word_gaps(gaps, mh)
    if len(word_gaps) >= 4:
        cv = float(word_gaps.std() / word_gaps.mean())
        spacing = 100 - 130 * max(0.0, cv - 0.1)
    else:
        spacing = 65.0
        warnings.append("Few word gaps were detected, so word spacing is a neutral estimate. "
                        "Please review it manually.")

    # ---- letter size consistency ----------------------------------------------------------------
    hs = ch[letters]
    core = hs[hs <= 1.15 * np.median(hs)]  # the x-height cluster; ignores natural tall letters
    cv_core = float(core.std() / core.mean()) if len(core) > 2 else 0.0
    size = 100 - 220 * max(0.0, cv_core - 0.05)
    line_meds = [float(np.median(ch[L])) for L in lines if len(L) >= 4]
    if len(line_meds) >= 2:
        cv_lines = float(np.std(line_meds) / np.mean(line_meds))
        size -= 150 * max(0.0, cv_lines - 0.05)

    # ---- stroke control (stroke-width uniformity + blobs where the pen paused) -------------------
    lut = np.zeros(n + 1, dtype=bool); lut[kept + 1] = True
    ink_kept = lut[lab]
    dt = ndimage.distance_transform_edt(ink_kept)
    ridge = (dt == ndimage.maximum_filter(dt, size=3)) & (dt >= 1.0)
    widths = 2.0 * dt[ridge]
    if len(widths) >= 20:
        med = float(np.median(widths))
        q25, q75 = np.percentile(widths, (25, 75))
        spread = max(0.0, float(q75 - q25) - 1.0) / med  # minus 1px quantisation
        blobs = float((widths > 1.8 * med).mean())
        stroke = 100 - 120 * max(0.0, spread - 0.25) - 150 * max(0.0, blobs - 0.05)
    else:
        stroke = 70.0

    # ---- letter formation (proxy: stroke quality, size regularity, fragmentation) ----------------
    small_frac = float((areas[kept] < 0.2 * np.median(areas[kept])).mean())
    fragmentation = 100 - 150 * max(0.0, small_frac - 0.2)
    formation = 0.45 * stroke + 0.35 * size + 0.20 * fragmentation

    scores = {
        "letter_formation": clamp_score(min(98, max(15, formation))),
        "baseline_alignment": clamp_score(min(98, max(15, baseline))),
        "word_spacing": clamp_score(min(98, max(15, spacing))),
        "letter_size_consistency": clamp_score(min(98, max(15, size))),
        "stroke_control": clamp_score(min(98, max(15, stroke))),
    }

    confidence = (
        0.35
        + 0.20 * min(1.0, len(letters) / 60)
        + 0.15 * min(1.0, contrast / 120)
        + 0.10 * (1.0 if len([L for L in lines if len(L) >= 4]) >= 2 else 0.0)
        + 0.10 * (1.0 if len(word_gaps) >= 4 else 0.0)
    )
    confidence = round(min(0.8, confidence), 2)  # heuristic mode never claims high confidence
    if confidence < 0.5:
        warnings.append("Analysis confidence is low. Results should be reviewed manually by the therapist.")

    return HeuristicResult(
        ok=True, scores=scores, confidence=confidence, warnings=warnings,
        stats={"components": int(len(kept)), "lines": len(lines), "word_gaps": int(len(word_gaps)),
               "contrast": round(contrast, 1)},
    )
