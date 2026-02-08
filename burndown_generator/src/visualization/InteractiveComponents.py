"""
Interactive components for burndown chart visualization.
"""
import json

class InteractiveComponents:
    """
    Manages interactive components for the burndown chart.
    """
    @staticmethod
    def get_chart_script(story_data, start_date, end_date, sprint_name, algorithm_type=1):
        """
        Get the JavaScript code for the interactive chart.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            sprint_name (str): Name of the sprint to filter by
            algorithm_type (int, optional): 1 for story percentage, 2 for task-based
            
        Returns:
            str: JavaScript code for the interactive chart
        """
        # This would include the main chart JavaScript code
        # For now, we're handling this in the HTMLGenerator class
        return ""
        
    @staticmethod
    def get_table_script():
        """
        Get the JavaScript code for the interactive table.
        
        Returns:
            str: JavaScript code for the interactive table
        """
        # This would include the table JavaScript code
        # For now, we're handling this in the HTMLGenerator class
        return ""
        
    @staticmethod
    def generate_sprint_options(available_sprints, selected_sprint):
        """
        Generate HTML options for sprint dropdown.
        
        Args:
            available_sprints (list): List of available sprint names
            selected_sprint (str): Name of the sprint to select
            
        Returns:
            str: HTML options for sprint dropdown
        """
        sprint_options_html = ""
        for sprint in available_sprints:
            selected = "selected" if sprint == selected_sprint else ""
            sprint_options_html += f'<option value="{sprint}" {selected}>{sprint}</option>\n'
        return sprint_options_html
        
    @staticmethod
    def generate_algorithm_options(selected_algorithm=1):
        """
        Generate HTML options for algorithm selection.
        
        Args:
            selected_algorithm (int, optional): Selected algorithm (1 or 2)
            
        Returns:
            str: HTML for algorithm selection
        """
        return f"""
        <div class="algorithm-controls">
            <label>
                <input type="radio" name="algorithm" value="1" {"checked" if selected_algorithm == 1 else ""}>
                Algorithm 1: Story-based with percentage completion
            </label>
            <label>
                <input type="radio" name="algorithm" value="2" {"checked" if selected_algorithm == 2 else ""}>
                Algorithm 2: Task-based burndown
            </label>
            <label>
                <input type="radio" name="algorithm" value="3" {"checked" if selected_algorithm == 3 else ""}>
                Algorithm 3: Pipeline-based completion
            </label>
        </div>
        """
        
    @staticmethod
    def generate_date_controls(start_date, end_date):
        """
        Generate HTML for date controls.
        
        Args:
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            
        Returns:
            str: HTML for date controls
        """
        return f"""
        <div class="date-controls">
            <label>
                Start Date:
                <input type="date" id="startDate" value="{start_date}">
            </label>
            <label>
                End Date:
                <input type="date" id="endDate" value="{end_date}">
            </label>
        </div>
        """
