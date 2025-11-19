from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Lead

User = get_user_model()


class AuthTests(APITestCase):
    def test_register_sets_initial_credits_and_returns_tokens(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "new@example.com", "password": "pass1234"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["user"]["credits"], 25)
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_login_returns_tokens_for_existing_user(self):
        user = User.objects.create_user(email="login@example.com", password="pass1234")
        response = self.client.post(
            "/api/auth/login/", {"email": user.email, "password": "pass1234"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)


class AuthenticatedTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email="user@example.com", password="pass1234")
        login = self.client.post(
            "/api/auth/login/", {"email": self.user.email, "password": "pass1234"}, format="json"
        )
        self.token = login.data["access"]
        self.auth_client = APIClient()
        self.auth_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")


class LeadFlowTests(AuthenticatedTestCase):
    def test_profile_returns_authenticated_user_data(self):
        response = self.auth_client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], self.user.email)

    def test_seed_import_creates_leads(self):
        response = self.auth_client.post("/api/import/seed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data.get("created", [])), 1)

    def test_import_and_export_round_trip(self):
        leads = [
            {
                "name": "Alice",
                "industry": "Tech",
                "location": "NY",
                "email": "alice@example.com",
                "phone": "123",
                "website": "alice.io",
                "source": "import",
            }
        ]
        import_response = self.auth_client.post("/api/leads/import/", {"leads": leads}, format="json")
        self.assertEqual(import_response.status_code, status.HTTP_200_OK)
        export_response = self.auth_client.get("/api/leads/export/")
        self.assertEqual(export_response.status_code, status.HTTP_200_OK)
        exported = export_response.json()
        self.assertEqual(len(exported), 1)
        self.assertEqual(exported[0]["name"], "Alice")

    def test_unlock_deducts_credits_and_marks_lead(self):
        lead = Lead.objects.create(
            owner=self.user,
            name="Bob",
            industry="Finance",
            location="SF",
            email="bob@example.com",
            phone="555",
            website="bob.com",
        )
        self.user.credits = 3
        self.user.save(update_fields=["credits"])
        response = self.auth_client.post("/api/leads/unlock/", {"lead_id": lead.id, "type": "phone"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["lead"]["phone_unlocked"])
        self.assertEqual(body["credits"], 1)

    def test_unlock_fails_when_insufficient_credits(self):
        lead = Lead.objects.create(
            owner=self.user,
            name="Chris",
            industry="Health",
            location="LA",
            email="chris@example.com",
            phone="777",
            website="chris.com",
        )
        self.user.credits = 0
        self.user.save(update_fields=["credits"])
        response = self.auth_client.post("/api/leads/unlock/", {"lead_id": lead.id, "type": "email"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient credits", response.json().get("detail", ""))

    def test_saved_list_rejects_foreign_leads(self):
        other_user = User.objects.create_user(email="other@example.com", password="pass1234")
        other_lead = Lead.objects.create(
            owner=other_user,
            name="Dana",
            industry="Tech",
            location="NY",
            email="dana@example.com",
            phone="444",
            website="dana.com",
        )
        response = self.auth_client.post(
            "/api/lists/",
            {"name": "Invalid", "leads": [other_lead.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_export_requires_authentication(self):
        unauthenticated = APIClient()
        response = unauthenticated.get("/api/leads/export/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stripe_checkout_requires_keys(self):
        response = self.auth_client.post(
            "/api/credits/checkout/",
            {"amount": 100, "credits": 10},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Stripe secret key", response.json().get("detail", ""))
