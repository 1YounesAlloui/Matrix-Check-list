"""
Progress service — pure Python, no ORM calls.

compute_plan_progress(tasks, completed_task_ids) → dict
  tasks: list of Task-like objects with .id and .weight
  completed_task_ids: set of task ids that are done on a given day
  Returns: {total_weight, done_weight, percentage, is_complete}
           where is_complete respects the plan's completion_threshold.
"""
from __future__ import annotations


def compute_plan_progress(
    tasks: list,
    completed_task_ids: set,
    threshold: int = 100,
) -> dict:
    """
    Compute weighted completion for a plan on a single day.

    Parameters
    ----------
    tasks : list
        Plan task objects; must have .id and .weight attributes.
    completed_task_ids : set
        IDs of tasks that have a CompletionLog on this day.
    threshold : int
        Plan.completion_threshold (1-100). Day is "complete" when
        percentage >= threshold.
    """
    if not tasks:
        return {
            "total_weight": 0,
            "done_weight": 0,
            "percentage": 0,
            "is_complete": False,
        }

    total_weight = sum(t.weight for t in tasks)
    done_weight = sum(t.weight for t in tasks if t.id in completed_task_ids)

    percentage = round((done_weight / total_weight) * 100) if total_weight > 0 else 0
    is_complete = percentage >= threshold

    return {
        "total_weight": total_weight,
        "done_weight": done_weight,
        "percentage": percentage,
        "is_complete": is_complete,
    }


def compute_overall_progress(plan_progresses: list[dict]) -> dict:
    """
    Aggregate progress dicts from compute_plan_progress across multiple plans.
    Returns {total_tasks, completed_tasks, percentage, is_complete}.
    """
    total = sum(p["total_weight"] for p in plan_progresses)
    done = sum(p["done_weight"] for p in plan_progresses)
    pct = round((done / total) * 100) if total > 0 else 0
    # Overall day is complete when every scheduled plan is complete
    is_complete = all(p["is_complete"] for p in plan_progresses) if plan_progresses else False
    return {
        "total_tasks": total,
        "completed_tasks": done,
        "percentage": pct,
        "is_complete": is_complete,
    }
