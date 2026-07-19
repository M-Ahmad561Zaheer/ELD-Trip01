from typing import Any


class HOSEngineError(Exception):
    """Raised when a compliant HOS schedule cannot be generated."""


class HOSEngine:
    """
    Generate a simplified FMCSA-compliant trip schedule.

    Rules implemented:
    - 11-hour daily driving limit
    - 14-hour duty window
    - 30-minute break after 8 cumulative driving hours
    - 10-hour rest between driving shifts
    - 70-hour / 8-day cycle
    - 34-hour cycle restart when required
    - Pickup and dropoff consume 1 on-duty hour each
    - Fuel stops occur every 1,000 miles
    """

    DAILY_DRIVING_LIMIT = 11.0
    DUTY_WINDOW_LIMIT = 14.0
    BREAK_AFTER_DRIVING = 8.0
    BREAK_DURATION = 0.5
    REQUIRED_REST_DURATION = 10.0

    CYCLE_LIMIT = 70.0
    CYCLE_RESTART_DURATION = 34.0

    PICKUP_DURATION = 1.0
    DROPOFF_DURATION = 1.0
    FUEL_STOP_DURATION = 0.5
    FUEL_INTERVAL_MILES = 1000.0

    EPSILON = 0.0001

    def __init__(self, current_cycle_used: float) -> None:
        if current_cycle_used < 0 or current_cycle_used > self.CYCLE_LIMIT:
            raise HOSEngineError(
                "Current cycle used must be between 0 and 70 hours."
            )

        self.elapsed_hours = 0.0
        self.shift_elapsed_hours = 0.0
        self.daily_driving_hours = 0.0
        self.driving_since_break_hours = 0.0
        self.cycle_used_hours = float(current_cycle_used)

        self.current_mile = 0.0
        self.events: list[dict[str, Any]] = []

    def generate_schedule(
        self,
        route: dict[str, Any],
    ) -> dict[str, Any]:
        distance_miles = float(route.get("distance_miles", 0))
        duration_hours = float(route.get("duration_hours", 0))
        legs = route.get("legs", [])

        if distance_miles <= 0:
            raise HOSEngineError(
                "Route distance must be greater than zero."
            )

        if duration_hours <= 0:
            raise HOSEngineError(
                "Route duration must be greater than zero."
            )

        pickup_mile = self._get_pickup_mile(
            legs=legs,
            total_distance=distance_miles,
        )

        milestones = self._build_milestones(
            total_distance=distance_miles,
            pickup_mile=pickup_mile,
        )

        average_hours_per_mile = duration_hours / distance_miles
        previous_mile = 0.0

        for milestone in milestones:
            milestone_mile = milestone["mile"]

            segment_distance = milestone_mile - previous_mile
            segment_duration = segment_distance * average_hours_per_mile

            if segment_duration > self.EPSILON:
                self._add_driving(
                    duration=segment_duration,
                    target_mile=milestone_mile,
                    total_segment_distance=segment_distance,
                )

            for action in milestone["actions"]:
                if action == "pickup":
                    self._add_on_duty_activity(
                        event_type="pickup",
                        duration=self.PICKUP_DURATION,
                        description="Loading and pickup operations",
                    )

                elif action == "fuel":
                    self._add_on_duty_activity(
                        event_type="fuel",
                        duration=self.FUEL_STOP_DURATION,
                        description="Fuel stop",
                    )

                elif action == "dropoff":
                    self._add_on_duty_activity(
                        event_type="dropoff",
                        duration=self.DROPOFF_DURATION,
                        description="Unloading and dropoff operations",
                    )

            previous_mile = milestone_mile

        return {
            "summary": self._build_summary(
                route_distance=distance_miles,
                route_driving_hours=duration_hours,
            ),
            "events": self.events,
        }

    def _add_driving(
        self,
        duration: float,
        target_mile: float,
        total_segment_distance: float,
    ) -> None:
        remaining_duration = duration
        segment_start_mile = self.current_mile
        completed_segment_hours = 0.0

        while remaining_duration > self.EPSILON:
            self._prepare_for_driving()

            available_driving = min(
                self.DAILY_DRIVING_LIMIT - self.daily_driving_hours,
                self.DUTY_WINDOW_LIMIT - self.shift_elapsed_hours,
                self.BREAK_AFTER_DRIVING
                - self.driving_since_break_hours,
                self.CYCLE_LIMIT - self.cycle_used_hours,
            )

            if available_driving <= self.EPSILON:
                self._prepare_for_driving()
                continue

            drive_duration = min(
                remaining_duration,
                available_driving,
            )

            proportion = drive_duration / duration
            drive_distance = total_segment_distance * proportion

            completed_segment_hours += drive_duration

            if completed_segment_hours >= duration - self.EPSILON:
                end_mile = target_mile
            else:
                end_mile = min(
                    target_mile,
                    self.current_mile + drive_distance,
                )

            self._append_event(
                event_type="driving",
                duty_status="driving",
                duration=drive_duration,
                description=(
                    f"Drive from mile {self.current_mile:.2f} "
                    f"to mile {end_mile:.2f}"
                ),
                start_mile=self.current_mile,
                end_mile=end_mile,
            )

            self.elapsed_hours += drive_duration
            self.shift_elapsed_hours += drive_duration
            self.daily_driving_hours += drive_duration
            self.driving_since_break_hours += drive_duration
            self.cycle_used_hours += drive_duration
            self.current_mile = end_mile

            remaining_duration -= drive_duration

        self.current_mile = max(
            self.current_mile,
            segment_start_mile + total_segment_distance,
        )

    def _prepare_for_driving(self) -> None:
        cycle_remaining = self.CYCLE_LIMIT - self.cycle_used_hours
        driving_remaining = (
            self.DAILY_DRIVING_LIMIT - self.daily_driving_hours
        )
        duty_remaining = (
            self.DUTY_WINDOW_LIMIT - self.shift_elapsed_hours
        )
        break_remaining = (
            self.BREAK_AFTER_DRIVING
            - self.driving_since_break_hours
        )

        if cycle_remaining <= self.EPSILON:
            self._add_cycle_restart()
            return

        if (
            driving_remaining <= self.EPSILON
            or duty_remaining <= self.EPSILON
        ):
            self._add_required_rest()
            return

        if break_remaining <= self.EPSILON:
            if duty_remaining <= self.BREAK_DURATION + self.EPSILON:
                self._add_required_rest()
            else:
                self._add_break()

    def _add_on_duty_activity(
        self,
        event_type: str,
        duration: float,
        description: str,
    ) -> None:
        self._prepare_for_on_duty(duration)

        self._append_event(
            event_type=event_type,
            duty_status="on_duty_not_driving",
            duration=duration,
            description=description,
            start_mile=self.current_mile,
            end_mile=self.current_mile,
        )

        self.elapsed_hours += duration
        self.shift_elapsed_hours += duration
        self.cycle_used_hours += duration

    def _prepare_for_on_duty(self, duration: float) -> None:
        cycle_remaining = self.CYCLE_LIMIT - self.cycle_used_hours
        duty_remaining = (
            self.DUTY_WINDOW_LIMIT - self.shift_elapsed_hours
        )

        if cycle_remaining + self.EPSILON < duration:
            self._add_cycle_restart()

        duty_remaining = (
            self.DUTY_WINDOW_LIMIT - self.shift_elapsed_hours
        )

        if duty_remaining + self.EPSILON < duration:
            self._add_required_rest()

    def _add_break(self) -> None:
        self._append_event(
            event_type="break",
            duty_status="off_duty",
            duration=self.BREAK_DURATION,
            description="Required 30-minute break",
            start_mile=self.current_mile,
            end_mile=self.current_mile,
        )

        self.elapsed_hours += self.BREAK_DURATION
        self.shift_elapsed_hours += self.BREAK_DURATION
        self.driving_since_break_hours = 0.0

    def _add_required_rest(self) -> None:
        self._append_event(
            event_type="rest",
            duty_status="off_duty",
            duration=self.REQUIRED_REST_DURATION,
            description="Required 10-hour rest period",
            start_mile=self.current_mile,
            end_mile=self.current_mile,
        )

        self.elapsed_hours += self.REQUIRED_REST_DURATION
        self.shift_elapsed_hours = 0.0
        self.daily_driving_hours = 0.0
        self.driving_since_break_hours = 0.0

    def _add_cycle_restart(self) -> None:
        self._append_event(
            event_type="cycle_restart",
            duty_status="off_duty",
            duration=self.CYCLE_RESTART_DURATION,
            description="34-hour cycle restart",
            start_mile=self.current_mile,
            end_mile=self.current_mile,
        )

        self.elapsed_hours += self.CYCLE_RESTART_DURATION
        self.shift_elapsed_hours = 0.0
        self.daily_driving_hours = 0.0
        self.driving_since_break_hours = 0.0
        self.cycle_used_hours = 0.0

    def _append_event(
        self,
        event_type: str,
        duty_status: str,
        duration: float,
        description: str,
        start_mile: float,
        end_mile: float,
    ) -> None:
        start_hour = self.elapsed_hours
        end_hour = start_hour + duration

        self.events.append(
            {
                "sequence": len(self.events) + 1,
                "day_number": int(start_hour // 24) + 1,
                "event_type": event_type,
                "duty_status": duty_status,
                "description": description,
                "start_hour": round(start_hour, 2),
                "end_hour": round(end_hour, 2),
                "duration_hours": round(duration, 2),
                "start_mile": round(start_mile, 2),
                "end_mile": round(end_mile, 2),
                "cycle_used_after_event": round(
                    self._project_cycle_after_event(
                        duty_status=duty_status,
                        duration=duration,
                        event_type=event_type,
                    ),
                    2,
                ),
            }
        )

    def _project_cycle_after_event(
        self,
        duty_status: str,
        duration: float,
        event_type: str,
    ) -> float:
        if event_type == "cycle_restart":
            return 0.0

        if duty_status in {
            "driving",
            "on_duty_not_driving",
        }:
            return min(
                self.CYCLE_LIMIT,
                self.cycle_used_hours + duration,
            )

        return self.cycle_used_hours

    def _build_milestones(
        self,
        total_distance: float,
        pickup_mile: float,
    ) -> list[dict[str, Any]]:
        milestone_actions: dict[float, list[str]] = {}

        def add_action(mile: float, action: str) -> None:
            rounded_mile = round(mile, 4)

            if rounded_mile not in milestone_actions:
                milestone_actions[rounded_mile] = []

            milestone_actions[rounded_mile].append(action)

        if 0 < pickup_mile < total_distance:
            add_action(pickup_mile, "pickup")

        fuel_mile = self.FUEL_INTERVAL_MILES

        while fuel_mile < total_distance:
            add_action(fuel_mile, "fuel")
            fuel_mile += self.FUEL_INTERVAL_MILES

        add_action(total_distance, "dropoff")

        return [
            {
                "mile": mile,
                "actions": actions,
            }
            for mile, actions in sorted(milestone_actions.items())
        ]

    @staticmethod
    def _get_pickup_mile(
        legs: list[dict[str, Any]],
        total_distance: float,
    ) -> float:
        if legs:
            first_leg_distance = float(
                legs[0].get("distance_miles", 0)
            )

            if first_leg_distance > 0:
                return min(
                    first_leg_distance,
                    total_distance,
                )

        return total_distance / 2

    def _build_summary(
        self,
        route_distance: float,
        route_driving_hours: float,
    ) -> dict[str, Any]:
        return {
            "route_distance_miles": round(route_distance, 2),
            "route_driving_hours": round(route_driving_hours, 2),
            "total_trip_elapsed_hours": round(
                self.elapsed_hours,
                2,
            ),
            "final_cycle_used_hours": round(
                self.cycle_used_hours,
                2,
            ),
            "total_events": len(self.events),
            "driving_events": self._count_events("driving"),
            "breaks": self._count_events("break"),
            "rest_periods": self._count_events("rest"),
            "cycle_restarts": self._count_events(
                "cycle_restart"
            ),
            "fuel_stops": self._count_events("fuel"),
            "pickup_stops": self._count_events("pickup"),
            "dropoff_stops": self._count_events("dropoff"),
        }

    def _count_events(self, event_type: str) -> int:
        return sum(
            1
            for event in self.events
            if event["event_type"] == event_type
        )