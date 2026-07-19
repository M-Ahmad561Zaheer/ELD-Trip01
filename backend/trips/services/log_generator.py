from collections import defaultdict
from typing import Any


class ELDLogGenerator:
    """
    Convert trip schedule events into 24-hour daily ELD logs.

    Duty statuses:
    - off_duty
    - sleeper_berth
    - driving
    - on_duty_not_driving
    """

    DUTY_STATUSES = (
        "off_duty",
        "sleeper_berth",
        "driving",
        "on_duty_not_driving",
    )

    def generate_logs(
        self,
        events: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not events:
            return []

        total_elapsed_hours = max(
            float(event["end_hour"])
            for event in events
        )

        total_days = max(
            1,
            int((total_elapsed_hours + 23.9999) // 24),
        )

        logs = []

        for day_number in range(1, total_days + 1):
            day_start = (day_number - 1) * 24
            day_end = day_start + 24

            segments = self._build_day_segments(
                events=events,
                day_start=day_start,
                day_end=day_end,
            )

            totals = self._calculate_totals(segments)
            remarks = self._build_remarks(segments)

            logs.append(
                {
                    "day_number": day_number,
                    "start_elapsed_hour": round(day_start, 2),
                    "end_elapsed_hour": round(day_end, 2),
                    "segments": segments,
                    "totals": totals,
                    "remarks": remarks,
                }
            )

        return logs

    def _build_day_segments(
        self,
        events: list[dict[str, Any]],
        day_start: float,
        day_end: float,
    ) -> list[dict[str, Any]]:
        segments = []

        for event in events:
            event_start = float(event["start_hour"])
            event_end = float(event["end_hour"])

            overlap_start = max(event_start, day_start)
            overlap_end = min(event_end, day_end)

            if overlap_start >= overlap_end:
                continue

            relative_start = overlap_start - day_start
            relative_end = overlap_end - day_start

            segments.append(
                {
                    "sequence": event["sequence"],
                    "event_type": event["event_type"],
                    "duty_status": event["duty_status"],
                    "description": event["description"],
                    "start_hour": round(relative_start, 2),
                    "end_hour": round(relative_end, 2),
                    "duration_hours": round(
                        relative_end - relative_start,
                        2,
                    ),
                    "mile_marker": event.get(
                        "location",
                        {},
                    ).get(
                        "mile_marker",
                        event.get("end_mile", 0),
                    ),
                    "location": event.get("location"),
                }
            )

        return self._fill_unlogged_periods(segments)

    def _fill_unlogged_periods(
        self,
        segments: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not segments:
            return [
                {
                    "sequence": 0,
                    "event_type": "off_duty",
                    "duty_status": "off_duty",
                    "description": "Off duty",
                    "start_hour": 0,
                    "end_hour": 24,
                    "duration_hours": 24,
                    "mile_marker": 0,
                    "location": None,
                }
            ]

        sorted_segments = sorted(
            segments,
            key=lambda segment: segment["start_hour"],
        )

        completed_segments = []
        cursor = 0.0

        for segment in sorted_segments:
            if segment["start_hour"] > cursor:
                completed_segments.append(
                    self._create_off_duty_segment(
                        start_hour=cursor,
                        end_hour=segment["start_hour"],
                    )
                )

            completed_segments.append(segment)
            cursor = max(cursor, segment["end_hour"])

        if cursor < 24:
            completed_segments.append(
                self._create_off_duty_segment(
                    start_hour=cursor,
                    end_hour=24,
                )
            )

        return completed_segments

    @staticmethod
    def _create_off_duty_segment(
        start_hour: float,
        end_hour: float,
    ) -> dict[str, Any]:
        return {
            "sequence": 0,
            "event_type": "off_duty",
            "duty_status": "off_duty",
            "description": "Off duty",
            "start_hour": round(start_hour, 2),
            "end_hour": round(end_hour, 2),
            "duration_hours": round(
                end_hour - start_hour,
                2,
            ),
            "mile_marker": 0,
            "location": None,
        }

    def _calculate_totals(
        self,
        segments: list[dict[str, Any]],
    ) -> dict[str, float]:
        totals = defaultdict(float)

        for segment in segments:
            totals[segment["duty_status"]] += float(
                segment["duration_hours"]
            )

        return {
            status: round(totals[status], 2)
            for status in self.DUTY_STATUSES
        }

    @staticmethod
    def _build_remarks(
        segments: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        remarks = []

        for segment in segments:
            if segment["event_type"] == "off_duty":
                continue

            remarks.append(
                {
                    "time": ELDLogGenerator._format_hour(
                        segment["start_hour"]
                    ),
                    "event_type": segment["event_type"],
                    "description": segment["description"],
                    "mile_marker": round(
                        float(segment["mile_marker"]),
                        2,
                    ),
                    "location": segment["location"],
                }
            )

        return remarks

    @staticmethod
    def _format_hour(hour_value: float) -> str:
        total_minutes = round(hour_value * 60)
        hours = (total_minutes // 60) % 24
        minutes = total_minutes % 60

        return f"{hours:02d}:{minutes:02d}"