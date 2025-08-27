from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from uploads.views import DocumentViewSet
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r"uploads", DocumentViewSet, basename="uploads")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/", include("profiles.urls")), 
    path("api/", include("assistants.urls")),
    path("api/", include("jobs.urls")),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
