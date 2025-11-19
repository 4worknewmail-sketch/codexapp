from rest_framework import routers
from django.urls import path, include
from .views import LeadViewSet, SavedListViewSet, SavedFilterViewSet, UnlockView, ImportLeadsView, ExportLeadsView

router = routers.DefaultRouter()
router.register(r"leads", LeadViewSet, basename="lead")
router.register(r"lists", SavedListViewSet, basename="savedlist")
router.register(r"filters", SavedFilterViewSet, basename="savedfilter")

urlpatterns = [
    path("", include(router.urls)),
    path("leads/unlock/", UnlockView.as_view(), name="unlock"),
    path("leads/import/", ImportLeadsView.as_view(), name="import"),
    path("leads/export/", ExportLeadsView.as_view(), name="export"),
]
