from django.contrib.auth import get_user_model
from rest_framework import serializers
codex/summarize-project-features-and-implementations

from .models import CreditTransaction, Lead, SavedFilter, SavedList

from .models import Lead, SavedList, SavedFilter, CreditTransaction
main

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "credits"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "industry",
            "location",
            "email",
            "phone",
            "website",
            "source",
            "email_unlocked",
            "phone_unlocked",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "email_unlocked", "phone_unlocked"]


class SavedListSerializer(serializers.ModelSerializer):
    """
    Serializer for saved lists that constrains lead selection to the
    authenticated user's dataset. Using PrimaryKeyRelatedField keeps the
    payload compact while preventing cross-user access.
    """

    leads = serializers.PrimaryKeyRelatedField(queryset=Lead.objects.none(), many=True)

    class Meta:
        model = SavedList
        fields = ["id", "name", "leads", "created_at"]
        read_only_fields = ["id", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            # Limit selectable leads to those owned by the requester so a user
            # cannot attach another user's lead IDs.
            self.fields["leads"].queryset = Lead.objects.filter(owner=request.user)


class SavedFilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedFilter
        fields = ["id", "name", "criteria", "created_at"]
        read_only_fields = ["id", "created_at"]


class CreditTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditTransaction
        fields = ["id", "amount", "description", "created_at"]
        read_only_fields = ["id", "created_at"]
