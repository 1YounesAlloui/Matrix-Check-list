"""Django integration tests: toggle, calendar, matrix, permissions."""
from datetime import date, timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from matrix.models import Plan, Task, CompletionLog, SkipDay


def _plan(owner, name="Test Plan", stype="daily", scfg=None, start=None):
    return Plan.objects.create(
        owner=owner,
        name=name,
        schedule_type=stype,
        schedule_config=scfg or {},
        start_date=start or (date.today() - timedelta(days=30)),
        color="#3A7BFF",
    )


def _task(plan, title="Task 1", weight=1):
    return Task.objects.create(plan=plan, title=title, weight=weight)


class AuthSetupMixin:
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="alice", password="password123")
        self.other = User.objects.create_user(username="bob", password="password123")

        resp = self.client.post("/api/auth/login/", {"username": "alice", "password": "password123"})
        self.token = resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")


class ToggleTests(AuthSetupMixin, TestCase):
    def test_toggle_creates_log(self):
        plan = _plan(self.user)
        task = _task(plan)
        today = date.today().isoformat()

        resp = self.client.post("/api/completions/toggle/", {"task": task.id, "date": today})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["completed"])
        self.assertEqual(CompletionLog.objects.count(), 1)

    def test_toggle_deletes_log(self):
        plan = _plan(self.user)
        task = _task(plan)
        today = date.today()
        CompletionLog.objects.create(task=task, plan=plan, user=self.user, date=today)

        resp = self.client.post("/api/completions/toggle/", {"task": task.id, "date": today.isoformat()})
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["completed"])
        self.assertEqual(CompletionLog.objects.count(), 0)

    def test_toggle_future_date_rejected(self):
        plan = _plan(self.user)
        task = _task(plan)
        future = (date.today() + timedelta(days=1)).isoformat()
        resp = self.client.post("/api/completions/toggle/", {"task": task.id, "date": future})
        self.assertEqual(resp.status_code, 400)

    def test_toggle_other_users_task_rejected(self):
        plan = _plan(self.other)
        task = _task(plan)
        today = date.today().isoformat()
        resp = self.client.post("/api/completions/toggle/", {"task": task.id, "date": today})
        self.assertEqual(resp.status_code, 400)


class PermissionTests(AuthSetupMixin, TestCase):
    def test_cannot_view_other_users_plan(self):
        plan = _plan(self.other)
        resp = self.client.get(f"/api/plans/{plan.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_cannot_view_other_users_tasks(self):
        plan = _plan(self.other)
        task = _task(plan)
        resp = self.client.get(f"/api/tasks/{task.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_plan_list_only_shows_own(self):
        _plan(self.user, "My Plan")
        _plan(self.other, "Other Plan")
        resp = self.client.get("/api/plans/")
        self.assertEqual(resp.status_code, 200)
        names = [p["name"] for p in resp.data]
        self.assertIn("My Plan", names)
        self.assertNotIn("Other Plan", names)


class CalendarTests(AuthSetupMixin, TestCase):
    def test_calendar_returns_days(self):
        today = date.today()
        start = today - timedelta(days=6)
        plan = _plan(self.user, start=start)
        _task(plan)
        resp = self.client.get(f"/api/calendar/?start={start.isoformat()}&end={today.isoformat()}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 7)

    def test_calendar_skipped_days_flagged(self):
        today = date.today()
        plan = _plan(self.user)
        SkipDay.objects.create(plan=plan, user=self.user, date=today)
        resp = self.client.get(f"/api/calendar/?start={today.isoformat()}&end={today.isoformat()}")
        self.assertEqual(resp.status_code, 200)
        # The day should be flagged as skipped
        day = resp.data[0]
        self.assertTrue(day["is_skipped"])

    def test_calendar_completion_percentage(self):
        today = date.today()
        plan = _plan(self.user)
        task = _task(plan, weight=1)
        CompletionLog.objects.create(task=task, plan=plan, user=self.user, date=today)
        resp = self.client.get(f"/api/calendar/?start={today.isoformat()}&end={today.isoformat()}")
        self.assertEqual(resp.data[0]["percentage"], 100)


class MatrixTests(AuthSetupMixin, TestCase):
    def test_matrix_returns_grid(self):
        today = date.today()
        start = today - timedelta(days=6)
        plan = _plan(self.user, start=start)
        _task(plan, "Push-ups")
        resp = self.client.get(f"/api/matrix/?start={start.isoformat()}&end={today.isoformat()}")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("columns", resp.data)
        self.assertIn("rows", resp.data)
        self.assertEqual(len(resp.data["columns"]), 7)
        self.assertEqual(len(resp.data["rows"]), 1)

    def test_matrix_done_cell(self):
        today = date.today()
        plan = _plan(self.user, start=today - timedelta(days=1))
        task = _task(plan)
        CompletionLog.objects.create(task=task, plan=plan, user=self.user, date=today)
        resp = self.client.get(
            f"/api/matrix/?start={(today - timedelta(days=1)).isoformat()}&end={today.isoformat()}"
        )
        cells = resp.data["rows"][0]["tasks"][0]["cells"]
        self.assertEqual(cells[today.isoformat()], "done")

    def test_matrix_only_own_plans(self):
        other_plan = _plan(self.other)
        _task(other_plan)
        today = date.today()
        resp = self.client.get(f"/api/matrix/?start={today.isoformat()}&end={today.isoformat()}")
        row_plan_ids = [r["plan_id"] for r in resp.data["rows"]]
        self.assertNotIn(other_plan.id, row_plan_ids)


class ThresholdTests(AuthSetupMixin, TestCase):
    def test_threshold_80_percent(self):
        """Plan with 80% threshold should be complete when 4/5 tasks done."""
        from matrix.services.progress import compute_plan_progress
        from unittest.mock import MagicMock

        tasks = [MagicMock(id=i, weight=1) for i in range(5)]
        done = {0, 1, 2, 3}  # 4 out of 5
        result = compute_plan_progress(tasks, done, threshold=80)
        self.assertEqual(result["percentage"], 80)
        self.assertTrue(result["is_complete"])

    def test_threshold_100_percent(self):
        from matrix.services.progress import compute_plan_progress
        from unittest.mock import MagicMock

        tasks = [MagicMock(id=i, weight=1) for i in range(5)]
        done = {0, 1, 2, 3}  # 4 out of 5
        result = compute_plan_progress(tasks, done, threshold=100)
        self.assertFalse(result["is_complete"])
