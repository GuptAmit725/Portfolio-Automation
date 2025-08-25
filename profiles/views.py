from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from uploads.models import Document, DocumentType
from pypdf import PdfReader
from pathlib import Path
import io, os, json, re

from openai import OpenAI

def extract_text_from_pdf(file_field) -> str:
    # file_field is a Django FileField
    with file_field.open("rb") as f:
        reader = PdfReader(io.BytesIO(f.read()))
        chunks = []
        for page in reader.pages:
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                pass
        return "\n".join(chunks).strip()

@api_view(["POST"])
def generate_profile(request):
    """
    Uses the user's latest CV to produce:
    - structured JSON (name, title, summary, skills, experience, education, links)
    - an HTML snippet for a dark, purple-accent portfolio section (mobile-friendly)
    """
    import re
    # 1) get latest CV (for now: the most recent Document with type CV)
    cv = Document.objects.filter(doc_type=DocumentType.CV).order_by("-uploaded_at").first()
    if not cv:
        return Response({"detail": "No CV uploaded yet."}, status=status.HTTP_400_BAD_REQUEST)

    # 2) extract basic text (PDF only for now; extend to DOCX later)
    ext = Path(cv.file.name).suffix.lower()
    if ext != ".pdf":
        return Response({"detail": "For this step, upload a PDF CV."}, status=status.HTTP_400_BAD_REQUEST)
    cv_text = extract_text_from_pdf(cv.file)
    if not cv_text:
        return Response({"detail": "Could not extract text from the PDF."}, status=status.HTTP_400_BAD_REQUEST)

    # 3) call OpenAI Responses API to get structured profile + HTML (dark mode, white+purple)
    api_key = getattr(settings, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return Response({"detail": "OPENAI_API_KEY not set."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
        # === DEBUG + SANITIZE API KEY ===
    raw = getattr(settings, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
    # strip whitespace and any invisible characters that sometimes get pasted
    key = re.sub(r"[\s\u200b\u200c\u200d\uFEFF]+", "", (raw or "").strip())

    # TEMP: print a masked preview to the Django console (safe)
    print(f"[OpenAI] Using key: {key[:10]}…{key[-6:]} (len={len(key)})")

    if not key or not key.startswith("sk-"):
        return Response({"detail": "OPENAI_API_KEY not loaded or malformed. Check .env and restart server."}, status=500)

    client = OpenAI(
        api_key="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"
    )

    system = (
    "You are a portfolio builder. Parse the user's CV text and return a single JSON object with exactly "
    "two keys: 'profile' and 'html'.\n"
    "profile must be: {name, title, summary, skills: string[], experience: [{company, role, start, end, bullets: string[]}], "
    "education: [{school, degree, start, end}], links: {linkedin?, github?, website?}}\n"
    "html must be a responsive DARK MODE section using inline CSS only. Colors: background #0f172a, "
    "panels #1e293b, text #f1f5f9, accents #8b5cf6/#7c3aed."
    )

    user = f"Here is the user's CV text:\n\n{cv_text[:30000]}"

    # Use Chat Completions JSON mode (widely supported)
    resp = client.responses.create(
    model="gpt-4o-mini",
    input=[
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ],
)

    # ---- helper to extract text from Responses API ----
    def response_to_text(r):
        # Try convenience attribute first
        txt = getattr(r, "output_text", None)
        if txt:
            return txt

        # Fallback: walk the output blocks
        parts = []
        for blk in getattr(r, "output", []) or []:
            for c in getattr(blk, "content", []) or []:
                t = getattr(c, "text", None)
                if hasattr(t, "value") and t.value:
                    parts.append(t.value)
                elif isinstance(t, str):
                    parts.append(t)
        return "".join(parts).strip()

    raw_text = response_to_text(resp)

    # strip accidental code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("` \n")
        if raw_text.lower().startswith("json"):
            raw_text = raw_text[4:].lstrip()

    import json, re
    try:
        payload = json.loads(raw_text)
    except Exception:
        m = re.search(r"\{.*\}\s*$", raw_text, re.S)
        if not m:
            return Response(
                {"detail": "Model did not return JSON", "raw": raw_text[:2000]},
                status=502,
            )
        payload = json.loads(m.group(0))

    if not isinstance(payload, dict) or "profile" not in payload or "html" not in payload:
        return Response({"detail": "Malformed JSON from model", "raw": raw_text[:2000]}, status=502)
    
    # 4) find latest profile image (if any) and add its absolute URL to the profile.photo field
    photo_url = None
    img_doc = (Document.objects
            .filter(doc_type=DocumentType.PROFILE_IMAGE)
            .order_by("-uploaded_at")
            .first())
    if not img_doc:
        # fallback to any image the user uploaded
        img_doc = (Document.objects
                .filter(file__iendswith=(".png", ".jpg", ".jpeg"))
                .order_by("-uploaded_at")
                .first())

    if img_doc and hasattr(img_doc.file, "url"):
        # absolute URL so the frontend <img src> works
        photo_url = request.build_absolute_uri(img_doc.file.url)

    # payload is the dict you parsed from the model's JSON output
    profile_dict = payload.get("profile", {})
    if photo_url:
        profile_dict["photo"] = photo_url
        payload["profile"] = profile_dict

    return Response(payload, status=200)

