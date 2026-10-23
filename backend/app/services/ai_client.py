"""Thin, provider-agnostic JSON-completion client. Any failure raises AIUnavailable;
callers must catch it and use their deterministic fallback."""
import base64
import json
import logging
import re

import httpx

from app.config import get_settings

logger = logging.getLogger("neurotrace")


class AIUnavailable(Exception):
    """The AI service is disabled, misconfigured, unreachable, or returned unusable output."""


def parse_json_object(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise AIUnavailable("AI response did not contain a JSON object")
    try:
        parsed = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as exc:
        raise AIUnavailable(f"AI response was not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise AIUnavailable("AI response JSON was not an object")
    return parsed


def complete_json(
    system: str,
    user_text: str,
    *,
    image_b64: str | None = None,
    image_media_type: str = "image/jpeg",
    max_tokens: int = 2000,
) -> dict:
    s = get_settings()
    if not s.ai_configured:
        raise AIUnavailable("AI is not configured")
    try:
        with httpx.Client(timeout=s.ai_timeout) as client:
            if s.ai_provider == "anthropic":
                content: list[dict] = []
                if image_b64:
                    content.append({"type": "image", "source": {
                        "type": "base64", "media_type": image_media_type, "data": image_b64}})
                content.append({"type": "text", "text": user_text})
                resp = client.post(
                    (s.ai_base_url or "https://api.anthropic.com").rstrip("/") + "/v1/messages",
                    headers={"x-api-key": s.ai_api_key, "anthropic-version": "2023-06-01",
                             "content-type": "application/json"},
                    json={"model": s.ai_model, "max_tokens": max_tokens, "system": system,
                          "messages": [{"role": "user", "content": content}]},
                )
                resp.raise_for_status()
                text = "".join(b.get("text", "") for b in resp.json().get("content", []) if b.get("type") == "text")
            elif s.ai_provider == "openai":
                parts: list[dict] = [{"type": "text", "text": user_text}]
                if image_b64:
                    parts.append({"type": "image_url",
                                  "image_url": {"url": f"data:{image_media_type};base64,{image_b64}"}})
                resp = client.post(
                    (s.ai_base_url or "https://api.openai.com").rstrip("/") + "/v1/chat/completions",
                    headers={"Authorization": f"Bearer {s.ai_api_key}"},
                    json={"model": s.ai_model, "max_tokens": max_tokens,
                          "response_format": {"type": "json_object"},
                          "messages": [{"role": "system", "content": system},
                                       {"role": "user", "content": parts}]},
                )
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"]
            else:
                raise AIUnavailable(f"Unsupported AI_PROVIDER '{s.ai_provider}'")
    except AIUnavailable:
        raise
    except Exception as exc:  # noqa: BLE001 - network, HTTP status, shape errors...
        raise AIUnavailable(f"AI request failed: {type(exc).__name__}: {exc}") from exc
    return parse_json_object(text)


def image_to_b64_jpeg(data: bytes, max_side: int = 1600) -> tuple[str, str]:
    """Downscale/re-encode so the AI payload stays small. Returns (base64, media_type)."""
    import io

    from PIL import Image, ImageOps

    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"
