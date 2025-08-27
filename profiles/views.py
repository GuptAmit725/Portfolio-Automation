from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from uploads.models import Document, DocumentType
from pypdf import PdfReader
from pathlib import Path
import io, os, json, re

from openai import OpenAI
import google.generativeai as genai
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage


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
    
# --- add: robust JSON extraction & repair ---

_VALID_ESC = r'\\|/|"|b|f|n|r|t|u'  # valid JSON escapes

def _extract_json_block(text: str) -> str:
    """Return the most likely JSON object/array from an LLM reply."""
    m = re.search(r"```json\s*(\{.*?\}|\[.*?\])\s*```", text, re.S | re.I)
    if m:
        return m.group(1)
    m = re.search(r"(\{.*\}|\[.*\])", text, re.S)
    return m.group(1) if m else text

def _escape_bad_backslashes(s: str) -> str:
    r"""Replace any backslash not followed by a valid JSON escape with a double backslash.

    Example:  C:\Users\me   ->   C:\\Users\\me
    Leaves valid escapes intact: \n, \t, \u1234, \\, \", \/
    """
    return re.sub(rf"\\(?!({_VALID_ESC}))", r"\\\\", s)

def safe_json_loads(raw: str):
    try:
        return json.loads(raw)  # already valid JSON?
    except json.JSONDecodeError:
        candidate = _extract_json_block(raw)
        candidate = _escape_bad_backslashes(candidate)
        return json.loads(candidate, strict=False)


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
    
    openai_key = getattr(settings, "OPEN_API_KEY", "") or os.getenv("OPEN_API_KEY", "")
    client = OpenAI(
        api_key= ''
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
    # resp = client.responses.create(
    #     model="gpt-5-mini",
    #     input=[
    #         {"role": "system", "content": system},
    #         {"role": "user", "content": user},
    #     ],
    #     )

    # Use Chat Completions JSON mode (widely supported)
    try:
        resp = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        )
    except Exception as e:
        print(f"[OpenAI Fallback] {e}. Using Gemini instead.")
        pass
        # --- Gemini fallback ---
        gem_key = ""#getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        if not gem_key:
            return Response({"detail": "Both OpenAI and Gemini unavailable (no GEMINI_API_KEY)."}, status=502)
        genai.configure(api_key=gem_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content([system, user])
        # resp = gem_resp.text

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

    try:
        payload = safe_json_loads(raw_text)
    except Exception:
        m = re.search(r"\{.*\}\s*$", raw_text, re.S)
        if not m:
            return Response(
                {"detail": "Model did not return JSON", "raw": raw_text[:2000]},
                status=502,
            )
        payload = safe_json_loads(m.group(0))

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

