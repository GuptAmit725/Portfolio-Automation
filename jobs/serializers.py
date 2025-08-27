from rest_framework import serializers
from .models import JobQuery, JobPosting

class JobPostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPosting
        fields = ["job_id", "title", "company", "location", "url", "via", "created_at"]

class JobQuerySerializer(serializers.ModelSerializer):
    jobs = JobPostingSerializer(many=True, read_only=True)

    class Meta:
        model = JobQuery
        fields = ["role", "location", "created_at", "jobs"]
