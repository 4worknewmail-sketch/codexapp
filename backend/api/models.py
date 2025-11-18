from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    credits = models.PositiveIntegerField(default=25)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.email


class Lead(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leads")
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    website = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=50, default="import")
    email_unlocked = models.BooleanField(default=False)
    phone_unlocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"{self.name} ({self.owner.email})"


class SavedList(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_lists")
    name = models.CharField(max_length=255)
    leads = models.ManyToManyField(Lead, related_name="lists", blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return self.name


class SavedFilter(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_filters")
    name = models.CharField(max_length=255)
    criteria = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return self.name


class CreditTransaction(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="credit_transactions")
    amount = models.IntegerField()
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"{self.owner.email}: {self.amount}"
