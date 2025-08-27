import re
import time
import html
import requests
from bs4 import BeautifulSoup

SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

def guess_role_and_location(cv_text: str) -> tuple[str, str]:
    """
    Super-simple heuristics:
      - role: pick the most recent title-like line from 'Experience' or headline
      - location: pick a city/country line or "Location:" line; fallback 'India'
    """
    lines = [l.strip() for l in cv_text.splitlines() if l.strip()]
    blob = " ".join(lines)
    # Role guess (prefer headline-like or recent exp)
    title_keywords = [
        r"(senior|lead|principal)?\s*(software|data|ml|ai|devops|full[-\s]?stack|frontend|backend|mobile|cloud)\s*(engineer|developer|scientist|manager|architect)",
        r"(product|project)\s*manager",
        r"(business|data)\s*analyst",
    ]
    role = None
    for pat in title_keywords:
        m = re.search(pat, blob, flags=re.I)
        if m:
            role = m.group(0)
            break
    if not role:
        # fallback to the first line with “Engineer/Developer/Manager/Analyst”
        for l in lines[:40]:
            if re.search(r"engineer|developer|manager|analyst|scientist", l, re.I):
                role = l
                break
    role = (role or "software engineer").strip().lower()

    # Location guess
    # Look for lines with "Location" or common city names; customize as needed
    loc = None
    for l in lines[:80]:
        if re.search(r"location\s*[:\-]", l, re.I):
            loc = re.sub(r"(?i)location\s*[:\-]\s*", "", l).strip()
            break
    if not loc:
        cities = r"(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Kolkata|Noida|Gurgaon|Ahmedabad|Remote|India)"
        m = re.search(cities, blob, flags=re.I)
        if m:
            loc = m.group(0)
    loc = (loc or "India").replace("Bangalore", "Bengaluru")
    return (role.title(), loc)

def search_linkedin(role: str, location: str, cookie_li_at: str | None = None, limit: int = 10):
    """
    Fetch LinkedIn search results HTML and parse job cards.
    If cookie is provided, we send it; otherwise guest endpoint is fine for basic search.
    """
    params = {
        "keywords": role,
        "location": location,
        "start": 0,
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if cookie_li_at:
        headers["Cookie"] = f"li_at={cookie_li_at}"

    # LinkedIn throttles; a single page is usually fine
    resp = requests.get(SEARCH_URL, params=params, headers=headers, timeout=20)
    resp.raise_for_status()
    html_text = resp.text

    soup = BeautifulSoup(html_text, "lxml")

    results = []
    seen_ids = set()

    # Cards look like: li.jobs-search-results__list-item with nested elements
    for li in soup.select("li"):
        title_el = li.select_one("h3")
        comp_el = li.select_one("h4")
        link_el = li.select_one("a[href*='/jobs/view/']")
        loc_el = li.select_one(".job-search-card__location, .base-search-card__metadata span")

        if not link_el:
            continue

        url = link_el.get("href")
        if not url:
            continue
        url = html.unescape(url)
        # normalize url
        if url.startswith("/"):
            url = "https://www.linkedin.com" + url

        # job id from /jobs/view/<id>/
        m = re.search(r"/jobs/view/(\d+)", url)
        job_id = m.group(1) if m else url

        if job_id in seen_ids:
            continue
        seen_ids.add(job_id)

        title = (title_el.get_text(strip=True) if title_el else "").strip() or "Untitled"
        company = (comp_el.get_text(strip=True) if comp_el else "").strip()
        job_loc = (loc_el.get_text(strip=True) if loc_el else location).strip()

        results.append({
            "job_id": job_id,
            "title": title,
            "company": company,
            "location": job_loc,
            "url": url,
            "via": "linkedin",
        })
        if len(results) >= limit:
            break

    return results
