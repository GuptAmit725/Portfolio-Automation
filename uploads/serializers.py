# uploads/serializers.py
from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "doc_type", "title",
            "file", "external_url", "description",
            "original_name", "size_bytes", "uploaded_at",
        ]

    def get_file(self, obj):
        try:
            return obj.file.url if obj.file else None
        except Exception:
            return None
