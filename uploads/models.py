# uploads/models.py
from django.db import models
from django.utils import timezone
from pathlib import Path

class DocumentType(models.TextChoices):
    CV = "CV", "CV / Résumé"
    CERTIFICATE = "CERTIFICATE", "Certificate"
    RECOMMENDATION = "RECOMMENDATION", "Recommendation Letter"
    PROFILE_IMAGE = "PROFILE_IMAGE", "Profile Image"
    PROJECT = "PROJECT", "Project"
    OTHER = "OTHER", "Other"

def upload_to(instance, filename):
    today = timezone.now()
    return f"uploads/{today:%Y/%m/%d}/{instance.doc_type.lower()}_{filename}"

class Document(models.Model):
    doc_type = models.CharField(max_length=32, choices=DocumentType.choices, default=DocumentType.OTHER)
    title = models.CharField(max_length=255, blank=True)

    # File is optional so PROJECT rows can be link-only
    file = models.FileField(upload_to=upload_to, blank=True, null=True)

    # For projects or link-only uploads
    external_url = models.URLField(blank=True)     # e.g., GitHub repo URL
    description = models.TextField(blank=True)     # e.g., project description

    original_name = models.CharField(max_length=255, blank=True, default="")
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.file:
            self.original_name = Path(self.file.name).name
            try:
                self.size_bytes = self.file.size or 0
            except Exception:
                self.size_bytes = 0
        else:
            self.original_name = self.original_name or ""
            self.size_bytes = self.size_bytes or 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.doc_type}] {self.title or self.original_name or 'Untitled'}"
