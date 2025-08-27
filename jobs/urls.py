from django.urls import path
from .views import match_jobs

urlpatterns = [
    path("jobs/match/", match_jobs, name="jobs_match"),
]
