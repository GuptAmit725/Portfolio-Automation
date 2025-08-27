from django.shortcuts import render

# Create your views here.
from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from assistants.cv import get_latest_cv_text
from .models import JobQuery, JobPosting
from .serializers import JobQuerySerializer
from .linkedin import guess_role_and_location, search_linkedin

TTL_HOURS = 24

@api_view(["POST"])
def match_jobs(request):
    """
    POST body (optional):
      {
        "cookie": "<li_at cookie value>",   # optional; improves results for some users
        "override_role": "...",            # optional manual override
        "override_location": "..."
      }
    Returns top jobs cached for 24h: { role, location, created_at, jobs: [...] }
    """
    cv_text = get_latest_cv_text()
    if not cv_text:
        return Response({"detail": "No CV found or unreadable."}, status=status.HTTP_400_BAD_REQUEST)

    role, location = guess_role_and_location(cv_text)

    # allow manual overrides in request (useful for testing)
    role = (request.data.get("override_role") or role).strip()
    location = (request.data.get("override_location") or location).strip()
    cookie = (request.data.get("cookie") or "").strip() or None

    # 1) serve from cache if a recent query exists
    cutoff = timezone.now() - timedelta(hours=TTL_HOURS)
    cached = JobQuery.objects.filter(role__iexact=role, location__iexact=location, created_at__gte=cutoff).order_by("-created_at").first()
    if cached and cached.jobs.exists():
        return Response(JobQuerySerializer(cached).data)

    # 2) fetch fresh
    try:
        results = search_linkedin(role=role, location=location, cookie_li_at=cookie, limit=10)
    except Exception as e:
        return Response({"detail": f"LinkedIn fetch failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    # 3) store
    query = JobQuery.objects.create(role=role, location=location)
    postings = []
    for r in results:
        postings.append(JobPosting(
            query=query,
            job_id=r["job_id"],
            title=r["title"],
            company=r.get("company", ""),
            location=r.get("location", location),
            url=r["url"],
            via=r.get("via", "linkedin"),
        ))
    JobPosting.objects.bulk_create(postings)

    return Response(JobQuerySerializer(query).data)
