from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id","doc_type","title","file","original_name","size_bytes","uploaded_at"]
        read_only_fields = ["id","original_name","size_bytes","uploaded_at"]

    def create(self, validated_data):
        # original_name & size are derived from the uploaded file
        request = self.context.get("request")
        upload = request.FILES.get("file") if request else None
        instance = Document(**validated_data)
        if upload:
            instance.original_name = upload.name
            instance.size_bytes = upload.size
        instance.save()
        return instance
