"""Render synthetic 'handwriting-like' sample images (used by the seed and by tests)."""
import random

from PIL import Image, ImageDraw, ImageFont


def _font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # very old Pillow
        return ImageFont.load_default()


def render_text_sample(
    lines: list[str],
    *,
    size: int = 56,
    baseline_jitter: float = 0.0,
    size_jitter: float = 0.0,
    space_jitter: float = 0.0,
    seed: int = 0,
    width: int = 1400,
    ruled: bool = True,
) -> Image.Image:
    """Dark ink on light paper. Jitter values are fractions of `size`."""
    rng = random.Random(seed)
    line_h = int(size * 2.4)
    img = Image.new("RGB", (width, line_h * len(lines) + int(size)), (250, 248, 242))
    d = ImageDraw.Draw(img)
    for i, text in enumerate(lines):
        base_y = int(size * 1.9) + i * line_h
        if ruled:
            d.line([(40, base_y + 6), (width - 40, base_y + 6)], fill=(190, 205, 230), width=2)
        x = 60.0
        for ch in text:
            if ch == " ":
                x += size * 0.45 * (1 + rng.uniform(-space_jitter, space_jitter))
                continue
            font = _font(max(12, int(size * (1 + rng.uniform(-size_jitter, size_jitter)))))
            dy = rng.uniform(-baseline_jitter, baseline_jitter) * size
            d.text((x, base_y + dy), ch, font=font, fill=(35, 40, 60), anchor="ls")
            x += font.getlength(ch) + size * 0.08
    return img
