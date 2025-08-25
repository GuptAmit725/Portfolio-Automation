from django.db import models
from django.utils import timezone
from pathlib import Path

class DocumentType(models.TextChoices):
    CV = "CV", "CV / Résumé"
    CERTIFICATE = "CERTIFICATE", "Certificate"
    RECOMMENDATION = "RECOMMENDATION", "Recommendation Letter"
    PROFILE_IMAGE = "PROFILE_IMAGE", "Profile Image" 
    OTHER = "OTHER", "Other"
    

def upload_to(instance, filename):
    today = timezone.now()
    return f"uploads/{today:%Y/%m/%d}/{instance.doc_type.lower()}_{filename}"

class Document(models.Model):
    doc_type = models.CharField(max_length=32, choices=DocumentType.choices, default=DocumentType.OTHER)
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to=upload_to)
    original_name = models.CharField(max_length=255)
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.original_name = Path(self.file.name).name
        self.size_bytes = self.file.size if self.file else 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.doc_type}] {self.original_name}"
