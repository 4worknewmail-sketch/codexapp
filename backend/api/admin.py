from django.contrib import admin

from .models import User, Lead, SavedList, SavedFilter, CreditTransaction


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "credits", "is_staff", "is_active")
    search_fields = ("email",)
    ordering = ("email",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "industry", "location", "email_unlocked", "phone_unlocked")
    search_fields = ("name", "email", "owner__email")
    list_filter = ("industry", "location")


@admin.register(SavedList)
class SavedListAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__email")


@admin.register(SavedFilter)
class SavedFilterAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__email")


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ("owner", "amount", "description", "created_at")
    search_fields = ("owner__email", "description")
