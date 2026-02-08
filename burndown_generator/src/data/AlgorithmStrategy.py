"""
Strategy pattern for different burndown calculation algorithms.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from models.Issue import Issue
from config.configuration import Configuration

class BurndownAlgorithm(ABC):
    """
    Abstract base class for burndown calculation algorithms.
    """
    @abstractmethod
    def calculate_burndown(self, story_data, date_range, sprint_name):
        """
        Calculate burndown data for the given stories, date range, and sprint.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            date_range (list): List of dates to calculate burndown for
            sprint_name (str): Name of the sprint to filter by
            
        Returns:
            list: List of burndown data points
        """
        pass
        
    def _is_closed_as_of(self, task, date):
        """
        Check if a task was closed as of a certain date and not reopened.
        
        Args:
            task (dict): Task data
            date (datetime): Date to check
            
        Returns:
            bool: True if the task was closed as of the date, False otherwise
        """
        closed = task.closed if hasattr(task, "closed") else False
        closed_at = task.closed_at if hasattr(task, "closed_at") else None

        if not task or not closed or not closed_at:
            return False
            
        # Create proper date objects and normalize both to midnight UTC
        if isinstance(closed_at, datetime):
            closed_date = closed_at
        else:
            closed_date = datetime.fromisoformat(str(closed_at).replace("Z", "+00:00"))
        closed_date = closed_date.replace(hour=0, minute=0, second=0, microsecond=0)
            
        # Make sure we're comparing dates at the same time (midnight)
        compare_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
            
        if closed_date > compare_date:
            return False
            
        # Check if it was reopened after being closed
        if self._was_reopened_after(task, compare_date):
            return False
            
        return True
        
    def _was_reopened_after(self, task, date):
        """
        Check if a task was reopened after a certain date.
        
        Args:
            task (dict): Task data
            date (datetime): Date to check
            
        Returns:
            bool: True if the task was reopened after the date, False otherwise
        """
        timeline_items = None
        if hasattr(task, "timeline_items"):
            timeline_items = task.timeline_items

        if not task or not timeline_items or not timeline_items.get("nodes"):
            return False
            
        last_event = None
            
        # Normalize the comparison date to midnight
        compare_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
            
        # Loop through timeline events to find the last event before the given date
        for event in timeline_items["nodes"]:
            if not event or not event.get("createdAt"):
                continue
                
            event_date = datetime.fromisoformat(event["createdAt"].replace("Z", "+00:00"))
            event_date = event_date.replace(hour=0, minute=0, second=0, microsecond=0)
                
            if event_date <= compare_date:
                last_event = event
                
        # If the last event is a reopened event, the task was reopened
        return last_event and last_event.get("__typename") == "ReopenedEvent"


class StoryPercentageAlgorithm(BurndownAlgorithm):
    """
    Algorithm 1: Stories with percentage-based completion.
    
    This algorithm calculates burndown based on:
    - Total story points from all stories
    - Percentage completion based on sub-tasks completion status
    """
    def calculate_burndown(self, story_data, date_range, sprint_name):
        """
        Calculate burndown using the story percentage algorithm.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            date_range (list): List of dates to calculate burndown for
            sprint_name (str): Name of the sprint to filter by
            
        Returns:
            list: List of burndown data points
        """
        try:
            # Calculate total story points
            total_points = 0
            story_points = {}
            
            # Process each story
            for story_id, story_content in story_data.items():
                if not story_content:
                    continue
                    
                # Get story info
                story_info = story_content.get("__story_data")
                if not story_info:
                    continue
                    
                # Skip if not in the selected sprint
                if story_info.sprint != sprint_name:
                    continue
                    
                # Build task list for this story
                tasks = {}
                for task_id, task in story_content.items():
                    if task_id != "__story_data" and task:
                        tasks[task_id] = task

                # Determine story estimation
                task_total_points = sum((t.estimation or 0) for t in tasks.values())
                story_estimation = story_info.estimation
                if story_estimation is None:
                    story_estimation = task_total_points

                # Skip stories with no estimation and no task points
                if story_estimation is None or story_estimation == 0:
                    continue

                # Add to total points
                total_points += story_estimation
                
                story_points[story_id] = {
                    "id": story_id,
                    "title": story_info.title,
                    "estimation": story_estimation,
                    "subTasks": (story_info.sub_issues_summary.get("total", 0) or len(tasks)),
                    "completedTasks": story_info.sub_issues_summary.get("completed", 0),
                    "taskTotalPoints": task_total_points,
                    "tasks": tasks,
                    "storyInfo": story_info
                }
            
            # If no points, default to 100 to show something
            if total_points == 0:
                total_points = 100
                
            # Calculate burndown for each date
            burndown_data = []
            
            for date in date_range:
                remaining_points = total_points
                completed_stories_info = []
                
                # Process each story
                for story_id, story in story_points.items():
                    # Calculate completed tasks as of this date
                    completed_count = 0
                    completed_points = 0
                    
                    for task_id, task in story["tasks"].items():
                        if self._is_closed_as_of(task, date):
                            completed_count += 1
                            completed_points += (task.estimation or 0)
                            
                    # Calculate percentage completed
                    percent_complete = 0
                    if story["taskTotalPoints"] > 0:
                        percent_complete = (completed_points / story["taskTotalPoints"]) * 100
                    elif story["subTasks"] > 0:
                        percent_complete = (completed_count / story["subTasks"]) * 100
                    else:
                        # No subtasks: use story closed state
                        story_closed = False
                        story_info_obj = story.get("storyInfo")
                        if hasattr(story_info_obj, "closed"):
                            story_closed = story_info_obj.closed
                        percent_complete = 100 if story_closed else 0
                        
                    # Calculate points burned
                    points_burned = story["estimation"] * (percent_complete / 100)
                    remaining_points -= points_burned
                    
                    # Record story information
                    completed_stories_info.append({
                        "id": story["id"],
                        "title": story["title"],
                        "percentComplete": percent_complete,
                        "burnedPoints": points_burned,
                        "estimation": story["estimation"],
                        "completedTasks": completed_count,
                        "totalTasks": story["subTasks"]
                    })
                
                burndown_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "remainingPoints": max(0, remaining_points),
                    "totalPoints": total_points,
                    "completedStoriesInfo": completed_stories_info
                })
                
            return burndown_data
            
        except Exception as e:
            print(f"Error in StoryPercentageAlgorithm: {e}")
            return []
            

class TaskBasedAlgorithm(BurndownAlgorithm):
    """
    Algorithm 2: Task-based burndown.
    
    This algorithm calculates burndown based on:
    - Tasks' individual estimations
    - If tasks don't have estimations, they inherit proportional points from their parent story
    """
    def calculate_burndown(self, story_data, date_range, sprint_name):
        """
        Calculate burndown using the task-based algorithm.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            date_range (list): List of dates to calculate burndown for
            sprint_name (str): Name of the sprint to filter by
            
        Returns:
            list: List of burndown data points
        """
        try:
            # Collect all tasks with their estimations
            tasks_info = {}
            total_points = 0
            
            # Process each story
            for story_id, story_content in story_data.items():
                if not story_content:
                    continue
                
                # Skip if no story data
                if not story_content.get("__story_data"):
                    continue
                    
                story_info = story_content["__story_data"]
                
                # Skip if not in the selected sprint
                if story_info.sprint != sprint_name:
                    continue
                    
                story_estimation = story_info.estimation or 0
                
                # Get all tasks for this story
                tasks = {}
                for task_id, task in story_content.items():
                    if task_id != "__story_data" and task:
                        tasks[task_id] = task
                        
                task_count = len(tasks)
                
                # Calculate points per task
                points_per_task = story_estimation / task_count if task_count > 0 else 0
                
                # Process each task
                for task_id, task in tasks.items():
                    task_estimation = task.estimation or points_per_task
                    
                    # Store task info with Issue object preserved
                    tasks_info[task_id] = {
                        "task": task,
                        "id": task_id,
                        "title": task.title,
                        "parentId": story_id,
                        "parentTitle": story_info.title,
                        "estimation": task_estimation
                    }
                    
                    total_points += task_estimation
                    
            # If no points, default to 100 to show something
            if total_points == 0:
                total_points = 100
                
            # Calculate burndown for each date
            burndown_data = []
            
            for date in date_range:
                remaining_points = 0
                open_tasks_info = []
                
                # Process each task
                for task_id, task_info in tasks_info.items():
                    task_obj = task_info["task"]

                    # Parse createdAt to datetime
                    if isinstance(task_obj.created_at, datetime):
                        task_created_at = task_obj.created_at
                    else:
                        task_created_at = datetime.fromisoformat(str(task_obj.created_at).replace("Z", "+00:00")) if task_obj.created_at else datetime.now()
                    task_created = task_created_at <= date
                    
                    # Check if the task is open on this date (considering reopened status)
                    task_open = not self._is_closed_as_of(task_obj, date)
                    
                    # If task is created and still open on this date, add its points
                    if task_created and task_open:
                        remaining_points += task_info["estimation"]
                        open_tasks_info.append({
                            "id": task_info["id"],
                            "title": task_info["title"],
                            "parentId": task_info["parentId"],
                            "parentTitle": task_info["parentTitle"],
                            "estimation": task_info["estimation"]
                        })
                        
                burndown_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "remainingPoints": remaining_points,
                    "totalPoints": total_points,
                    "openTasksInfo": open_tasks_info
                })
                
            return burndown_data
            
        except Exception as e:
            print(f"Error in TaskBasedAlgorithm: {e}")
            return []


class PipelineBasedAlgorithm(BurndownAlgorithm):
    """
    Algorithm 3: Pipeline-based burndown.

    Uses task estimations and pipeline status weights to compute remaining points.
    Closed tasks are treated as 100% complete as of their closed date.
    """
    def calculate_burndown(self, story_data, date_range, sprint_name):
        try:
            tasks_info = {}
            total_points = 0

            # Collect tasks in the sprint
            sprint_start_date = None
            for story_id, story_content in story_data.items():
                if not story_content:
                    continue

                if not story_content.get("__story_data"):
                    continue

                story_info = story_content["__story_data"]

                # Skip if not in sprint
                if story_info.sprint != sprint_name:
                    continue

                if story_info.sprint_start_date and not sprint_start_date:
                    try:
                        sprint_start_date = datetime.fromisoformat(str(story_info.sprint_start_date))
                        sprint_start_date = sprint_start_date.replace(hour=0, minute=0, second=0, microsecond=0)
                    except (ValueError, TypeError):
                        sprint_start_date = None

                # Collect tasks for this story
                tasks = {}
                for task_id, task in story_content.items():
                    if task_id != "__story_data" and task:
                        tasks[task_id] = task

                # If no tasks, treat story as task
                if not tasks:
                    tasks = {story_id: story_info}

                for task_id, task in tasks.items():
                    task_estimation = task.estimation or 0
                    if task_estimation == 0:
                        continue

                    tasks_info[task_id] = {
                        "task": task,
                        "estimation": task_estimation,
                        "status": (task.status or "").strip().lower()
                    }

                    total_points += task_estimation

            if total_points == 0:
                total_points = 100

            burndown_data = []

            for date in date_range:
                remaining_points = 0
                open_tasks_info = []

                for task_id, task_info in tasks_info.items():
                    task = task_info["task"]

                    # Determine completion weight
                    if self._is_closed_as_of(task, date):
                        weight = 1.0
                    else:
                        weight = Configuration.get_pipeline_weight(task_info["status"])

                    burned = task_info["estimation"] * weight
                    remaining = task_info["estimation"] - burned
                    remaining_points += max(0, remaining)

                    if remaining > 0:
                        open_tasks_info.append({
                            "id": task_id,
                            "title": task.title,
                            "estimation": task_info["estimation"],
                            "status": task_info["status"]
                        })

                burndown_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "remainingPoints": remaining_points,
                    "totalPoints": total_points,
                    "openTasksInfo": open_tasks_info
                })

            return burndown_data
        except Exception as e:
            print(f"Error in PipelineBasedAlgorithm: {e}")
            return []
