from django.db import models

# Create your models here.
from django.utils import timezone

class JobQuery(models.Model):
    role = models.CharField(max_length=120)
    location = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["role", "location", "created_at"]),
        ]

    def __str__(self):
        return f"{self.role} @ {self.location} ({self.created_at:%Y-%m-%d %H:%M})"
    
class JobPosting(models.Model):
    query = models.ForeignKey(JobQuery, related_name="jobs", on_delete=models.CASCADE)
    job_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    url = models.URLField()
    via = models.CharField(max_length=40, default="linkedin")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("query", "job_id")
        indexes = [
            models.Index(fields=["job_id"]),
        ]

    def __str__(self):
        return f"{self.title} – {self.company}"
