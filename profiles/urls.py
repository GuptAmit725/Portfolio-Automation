from django.urls import path
from .views import generate_profile

urlpatterns = [
    path("profile/generate/", generate_profile, name="generate_profile"),
]
