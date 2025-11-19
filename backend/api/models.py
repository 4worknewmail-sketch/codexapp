from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    User manager that treats the email address as the primary identifier.
    This keeps account creation aligned with the SimpleJWT-based auth flow
    used by the frontend.
    """

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    credits = models.PositiveIntegerField(default=25)
    objects = UserManager()

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
