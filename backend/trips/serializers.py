from rest_framework import serializers


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(
        max_length=255,
        allow_blank=False,
        trim_whitespace=True,
    )
    pickup_location = serializers.CharField(
        max_length=255,
        allow_blank=False,
        trim_whitespace=True,
    )
    dropoff_location = serializers.CharField(
        max_length=255,
        allow_blank=False,
        trim_whitespace=True,
    )
    current_cycle_used = serializers.FloatField(
        min_value=0,
        max_value=70,
    )

    def validate(self, attrs):
        current_location = attrs["current_location"].lower()
        pickup_location = attrs["pickup_location"].lower()
        dropoff_location = attrs["dropoff_location"].lower()

        if current_location == pickup_location:
            raise serializers.ValidationError(
                {
                    "pickup_location": (
                        "Pickup location must be different from the current location."
                    )
                }
            )

        if pickup_location == dropoff_location:
            raise serializers.ValidationError(
                {
                    "dropoff_location": (
                        "Dropoff location must be different from the pickup location."
                    )
                }
            )

        return attrs