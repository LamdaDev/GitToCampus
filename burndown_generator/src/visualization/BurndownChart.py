"""
BurndownChart class for managing burndown chart generation.
"""
import datetime
from data.DataProcessor import DataProcessor
from visualization.HTMLGenerator import HTMLGenerator

class BurndownChart:
    """
    Manages the burndown chart generation process.
    """
    def __init__(self, story_data=None, other_data=None):
        """
        Initialize the burndown chart generator.
        
        Args:
            story_data (dict, optional): Dictionary mapping story IDs to their data
            other_data (dict, optional): Dictionary of other issues
        """
        self.story_data = story_data or {}
        self.other_data = other_data or {}
        self.data_processor = DataProcessor()
        self.html_generator = HTMLGenerator()
        
    def generate_interactive_html(self, output_path="sprint_burndown.html", sprint_name=None):
        """
        Generate a fully interactive HTML with controls for the burndown chart.
        
        Args:
            output_path (str): Path to save the HTML output
            sprint_name (str, optional): Name of the sprint to initially select
            
        Returns:
            str: Path to the generated HTML file
        """
        # Get available sprints from the data
        available_sprints = self.data_processor.get_available_sprints(self.story_data)
        
        # Set default sprint if not provided
        if not sprint_name and available_sprints:
            sprint_name = available_sprints[0]
            
        # Generate the HTML file
        return self.html_generator.generate_html(
            self.story_data,
            available_sprints,
            sprint_name,
            output_path
        )
        
    def calculate_burndown(self, algorithm_type, start_date, end_date, sprint_name):
        """
        Calculate burndown data using the specified algorithm.
        
        Args:
            algorithm_type (int): 1 for story percentage, 2 for task-based
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            sprint_name (str): Name of the sprint to filter by
            
        Returns:
            list: List of burndown data points
        """
        return self.data_processor.calculate_burndown(
            self.story_data,
            algorithm_type,
            start_date,
            end_date,
            sprint_name
        )
