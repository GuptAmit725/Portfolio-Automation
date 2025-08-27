# assistants/cv.py
from pathlib import Path
from typing import Optional
from django.conf import settings
from uploads.models import Document, DocumentType

from pypdf import PdfReader
from docx import Document as DocxDocument


def _read_pdf(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        return ""


def _read_docx(path: Path) -> str:
    try:
        doc = DocxDocument(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception:
        return ""


def _read_plain(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def extract_text_from_file(file_url: str) -> str:
    # Accepts '/media/...' or 'http://127.0.0.1:8000/media/...'
    media_prefix = "/media/"
    rel = file_url.split(media_prefix, 1)[1] if media_prefix in file_url else file_url.lstrip("/")
    path = Path(settings.MEDIA_ROOT) / rel
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return _read_pdf(path)
    if suffix == ".docx":
        return _read_docx(path)
    return _read_plain(path)


def get_latest_cv_text() -> Optional[str]:
    doc = (
        Document.objects
        .filter(doc_type=DocumentType.CV)
        .order_by("-uploaded_at")
        .first()
    )
    if not doc:
        return None
    text = extract_text_from_file(str(doc.file.url)) or ""
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return text or None
