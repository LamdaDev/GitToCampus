"""
Processes issue data for burndown chart generation.
"""
import datetime
import json
from data.IssueMapper import IssueMapper
from data.AlgorithmStrategy import StoryPercentageAlgorithm, TaskBasedAlgorithm, PipelineBasedAlgorithm
from config.configuration import Configuration
from utils.DateUtils import DateUtils

class DataProcessor:
    """
    Process issue data for burndown chart generation.
    """
    def __init__(self):
        """
        Initialize the data processor.
        """
        self.story_percentage_algorithm = StoryPercentageAlgorithm()
        self.task_based_algorithm = TaskBasedAlgorithm()
        self.pipeline_based_algorithm = PipelineBasedAlgorithm()
        
    def process_project_data(self, project_data):
        """
        Process raw project data into usable formats.
        
        Args:
            project_data (dict): Raw project data from API
            
        Returns:
            tuple: (Issues dict, Stories-to-tasks dict)
        """
        try:
            return IssueMapper.map_raw_data_to_models(project_data)
        except Exception as e:
            print(f"Error in process_project_data: {e}")
            # Return empty dictionaries as fallback
            return {}, {}
        
    def get_available_sprints(self, story_data):
        """
        Get a list of all available sprints/iterations in the data.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            
        Returns:
            list: List of sprint/iteration names
        """
        try:
            # Get the configured iteration field name
            iteration_tag_name = getattr(Configuration, "ITERATION_FIELD_NAME", "Sprint")
            print(f"Looking for iteration tag name: {iteration_tag_name}")
            
            # Set to store unique iteration values
            iterations = set()
            iteration_tag_found = False
            
            # Check stories and tasks for iteration field
            for story_id, story in story_data.items():
                if not story:
                    continue
                    
                # Get the story info
                story_info = story.get("__story_data")
                if not story_info:
                    continue

                iteration_value = story_info.sprint
                field_found = iteration_value is not None
                
                # Add iteration value to set if it's valid (handle various types)
                if iteration_value is not None:
                    # Convert to string if not already
                    if isinstance(iteration_value, str):
                        iterations.add(iteration_value)
                        iteration_tag_found = True
                    elif isinstance(iteration_value, (int, float)):
                        # Convert numbers to strings
                        iterations.add(str(iteration_value))
                        iteration_tag_found = True
                    elif isinstance(iteration_value, dict) and 'title' in iteration_value:
                        # Handle nested dict with title
                        iterations.add(iteration_value['title'])
                        iteration_tag_found = True
                    else:
                        # Try to convert to string as a last resort
                        try:
                            iterations.add(str(iteration_value))
                            iteration_tag_found = True
                        except:
                            pass
                
                # Print debugging info for the first few items
                if len(iterations) <= 3 and field_found:
                    print(f"Found iteration value: {iteration_value} (type: {type(iteration_value).__name__})")

                # Also collect iteration from tasks under each story
                for task_id, task in story.items():
                    if task_id == "__story_data" or not task:
                        continue
                    task_sprint = getattr(task, "sprint", None)
                    if task_sprint is not None:
                        iterations.add(task_sprint)
                        iteration_tag_found = True
                    
            # If still no iterations found, return a default
            if not iterations:
                print("No iteration values found, using default")
                default_sprint = getattr(Configuration, "DEFAULT_SPRINT", "N/A")
                iterations.add(default_sprint)
                
            # Convert to sorted list, filtering out None values and empty strings
            iteration_list = [s for s in iterations if s is not None and s != ""]
            
            # Print all found iterations for debugging
            print(f"Found {len(iteration_list)} iteration values: {iteration_list}")
            
            # Sort iterations with special handling for Sprint/Iteration numbers
            try:
                # Try to sort by numeric part if the format is like "Sprint X" or "Iteration Y"
                def extract_number(s):
                    # Extract numeric part from strings like "Sprint 5" or "Iteration 3"
                    if not isinstance(s, str):
                        return s
                    
                    parts = s.split()
                    for part in parts:
                        try:
                            return int(part)
                        except ValueError:
                            pass
                    return s
                
                # Sort numerically if possible, otherwise lexicographically
                sorted_iterations = sorted(iteration_list, key=extract_number)
                return sorted_iterations
            except Exception as e:
                print(f"Error sorting iterations: {e}")
                # Fall back to simple sort
                return sorted(iteration_list)
        except Exception as e:
            print(f"Error in get_available_sprints: {e}")
            # Return default sprint as fallback
            default_sprint = getattr(Configuration, "DEFAULT_SPRINT", "N/A")
            return [default_sprint]
        
    def calculate_burndown(self, story_data, algorithm_type, start_date, end_date, sprint_name):
        """
        Calculate burndown data based on algorithm.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            algorithm_type (int): 1 for story percentage, 2 for task-based
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            sprint_name (str): Name of the sprint to filter by
            
        Returns:
            list: List of burndown data points
        """
        try:
            # Generate array of dates between start and end (at midnight)
            try:
                date_range = DateUtils.get_date_range(start_date, end_date)
            except Exception:
                default_start, default_end = DateUtils.get_default_date_range()
                date_range = DateUtils.get_date_range(default_start, default_end)
                
            # Use the appropriate algorithm
            if algorithm_type == 1:
                return self.story_percentage_algorithm.calculate_burndown(
                    story_data, date_range, sprint_name
                )
            if algorithm_type == 2:
                return self.task_based_algorithm.calculate_burndown(
                    story_data, date_range, sprint_name
                )
            return self.pipeline_based_algorithm.calculate_burndown(
                story_data, date_range, sprint_name
            )
                
        except Exception as e:
            print(f"Error in calculate_burndown: {e}")
            return []