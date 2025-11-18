from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views import RegisterView, ProfileView, StripeCheckoutView, StripeConfirmView, SeedImportView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", ProfileView.as_view(), name="profile"),
    path("api/credits/checkout/", StripeCheckoutView.as_view(), name="stripe_checkout"),
    path("api/credits/confirm/", StripeConfirmView.as_view(), name="stripe_confirm"),
    path("api/import/seed/", SeedImportView.as_view(), name="import_seed"),
    path("api/", include("api.urls")),
]
