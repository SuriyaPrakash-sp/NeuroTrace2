"""Upload validation (PNG/JPG/JPEG, size cap) and storage."""
import logging
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.errors import APIError

logger = logging.getLogger("neurotrace")

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/pjpeg", "application/octet-stream", ""}
TYPE_MESSAGE = "The uploaded file must be a PNG, JPG, or JPEG image."


def sniff_image_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    return None


def read_and_validate_upload(upload: UploadFile) -> tuple[bytes, str]:
    """Return (bytes, 'png'|'jpeg') or raise a contract-shaped APIError."""
    settings = get_settings()
    max_bytes = settings.max_upload_bytes
    max_mb = max_bytes / (1024 * 1024)

    filename = upload.filename or ""
    ext = Path(filename).suffix.lower()
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if ext not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_CONTENT_TYPES:
        raise APIError(
            400, "VALIDATION_ERROR", TYPE_MESSAGE,
            {"filename": filename or None, "content_type": content_type or None,
             "allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = upload.file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise APIError(
                413, "UPLOAD_ERROR",
                f"The uploaded file is too large. The maximum size is {max_mb:g} MB.",
                {"max_bytes": max_bytes},
            )
        chunks.append(chunk)
    data = b"".join(chunks)

    if not data:
        raise APIError(400, "UPLOAD_ERROR", "The uploaded file is empty. Please choose a PNG, JPG, or JPEG image.")
    kind = sniff_image_type(data)
    if kind is None:
        raise APIError(
            400, "VALIDATION_ERROR",
            f"{TYPE_MESSAGE} The file contents do not look like a PNG or JPEG image.",
            {"filename": filename},
        )
    return data, kind


def save_sample(data: bytes, kind: str, assessment_id: str) -> str:
    """Write the image to UPLOAD_DIR and return its public relative URL (/uploads/<name>)."""
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    name = f"{assessment_id}.{'png' if kind == 'png' else 'jpg'}"
    try:
        (settings.upload_dir / name).write_bytes(data)
    except OSError as exc:
        logger.exception("Could not write upload")
        raise APIError(500, "UPLOAD_ERROR", "The uploaded file could not be saved on the server.") from exc
    return f"/uploads/{name}"
