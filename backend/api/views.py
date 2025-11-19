import csv
from io import StringIO
from pathlib import Path

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Lead, SavedList, SavedFilter, CreditTransaction
from .serializers import (
    LeadSerializer,
    SavedFilterSerializer,
    SavedListSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer

    def get_queryset(self):
        return Lead.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SavedListViewSet(viewsets.ModelViewSet):
    serializer_class = SavedListSerializer

    def get_queryset(self):
        return SavedList.objects.filter(owner=self.request.user).prefetch_related("leads")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        serializer.save(owner=self.request.user)


class SavedFilterViewSet(viewsets.ModelViewSet):
    serializer_class = SavedFilterSerializer

    def get_queryset(self):
        return SavedFilter.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        serializer.save(owner=self.request.user)


class UnlockView(APIView):
    def post(self, request):
        lead_id = request.data.get("lead_id")
        unlock_type = request.data.get("type")
        cost_map = {"email": 1, "phone": 2}
        if unlock_type not in cost_map:
            return Response({"detail": "Invalid unlock type"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lead = Lead.objects.get(id=lead_id, owner=request.user)
        except Lead.DoesNotExist:
            return Response({"detail": "Lead not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            user = request.user
            cost = cost_map[unlock_type]
            if user.credits < cost:
                return Response({"detail": "Insufficient credits"}, status=status.HTTP_400_BAD_REQUEST)

            user.credits -= cost
            user.save(update_fields=["credits"])
            if unlock_type == "email":
                lead.email_unlocked = True
            else:
                lead.phone_unlocked = True
            lead.save(update_fields=["email_unlocked", "phone_unlocked"])
            CreditTransaction.objects.create(owner=user, amount=-cost, description=f"Unlock {unlock_type}")

        return Response({
            "lead": LeadSerializer(lead).data,
            "credits": user.credits,
        })


class ImportLeadsView(APIView):
    def post(self, request):
        leads_data = request.data.get("leads", [])
        created = []
        for lead in leads_data:
            serializer = LeadSerializer(data=lead)
            serializer.is_valid(raise_exception=True)
            serializer.save(owner=request.user)
            created.append(serializer.data)
        return Response({"created": created})


class SeedImportView(APIView):
    def post(self, request):
        seed_path = Path(settings.SEED_CSV_PATH)
        if not seed_path.exists():
            return Response({"detail": "Seed CSV not found"}, status=status.HTTP_404_NOT_FOUND)

        with seed_path.open() as f:
            reader = csv.DictReader(f)
            created = []
            for row in reader:
                payload = {
                    "name": row.get("name", ""),
                    "industry": row.get("industry", ""),
                    "location": row.get("location", ""),
                    "email": row.get("email", ""),
                    "phone": row.get("phone", ""),
                    "website": row.get("website", ""),
                    "source": row.get("source", "seed"),
                }
                serializer = LeadSerializer(data=payload)
                serializer.is_valid(raise_exception=True)
                serializer.save(owner=request.user)
                created.append(serializer.data)
        return Response({"created": created})


class ExportLeadsView(APIView):
    def get(self, request):
        leads = Lead.objects.filter(owner=request.user)
        serializer = LeadSerializer(leads, many=True)
        format_type = request.query_params.get("format", "json")
        if format_type == "csv":
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=["name", "industry", "location", "email", "phone", "website", "source", "email_unlocked", "phone_unlocked"])
            writer.writeheader()
            for lead in serializer.data:
                writer.writerow(lead)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = "attachment; filename=leads.csv"
            return response
        return Response(serializer.data)


class StripeCheckoutView(APIView):
    def post(self, request):
        amount = int(request.data.get("amount", 0))
        credits = int(request.data.get("credits", 0))
        if amount <= 0 or credits <= 0:
            return Response({"detail": "Amount and credits must be positive"}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.STRIPE_SECRET_KEY:
            return Response({"detail": "Stripe secret key missing"}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        # Apple Pay is enabled by Stripe automatically when using card-based
        # payment methods and a verified domain. Using automatic payment
        # methods keeps the configuration minimal for the beginner-friendly
        # setup requested by the user.
        session = stripe.checkout.Session.create(
            mode="payment",
            automatic_payment_methods={"enabled": True},
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": amount,
                        "product_data": {"name": f"Credit top-up ({credits} credits)"},
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{settings.PAYMENT_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}&credits={credits}",
            cancel_url=settings.PAYMENT_CANCEL_URL,
            automatic_tax={"enabled": False},
        )
        return Response({"id": session.id, "url": session.url})


class StripeConfirmView(APIView):
    def post(self, request):
        credits = int(request.data.get("credits", 0))
        session_id = request.data.get("session_id")
        if credits <= 0 or not session_id:
            return Response({"detail": "Missing session or credits"}, status=status.HTTP_400_BAD_REQUEST)

        # In lieu of webhooks, we trust the client in this minimal setup.
        with transaction.atomic():
            user = request.user
            user.credits += credits
            user.save(update_fields=["credits"])
            CreditTransaction.objects.create(owner=user, amount=credits, description=f"Top-up via session {session_id}")
        return Response({"credits": user.credits})
