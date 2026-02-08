"""
Main entry point for the burndown chart generator.
"""
import json
import os
import traceback
from api.ProjectFetcher import ProjectFetcher
from data.IssueMapper import IssueMapper
from visualization.BurndownChart import BurndownChart

def main():
    """
    Main function to run the burndown chart generator.
    """
    print("Starting burndown chart generator...")
    
    # Step 1: Fetch project data from GitHub
    try:
        print("Fetching project data from GitHub...")
        project_fetcher = ProjectFetcher()
        project_data = project_fetcher.fetch_project_data(save_to_file=True)
        print("Project data fetched successfully.")
    except Exception as e:
        print(f"Error fetching project data: {e}")
        # Try to load from existing file if available
        try:
            print("Trying to load project data from existing file...")
            candidate_paths = [
                os.path.join(os.getcwd(), 'project_data.json'),
                os.path.join(os.path.dirname(__file__), 'project_data.json'),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'project_data.json')
            ]
            project_data = None
            for path in candidate_paths:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        project_data = json.load(f)
                    print(f"Project data loaded from file: {path}")
                    break
            if project_data is None:
                raise FileNotFoundError("project_data.json not found in known locations")
        except Exception as load_error:
            print(f"Error loading project data from file: {load_error}")
            return
    
    # Step 2: Map raw data to domain models
    try:
        print("Mapping project data to domain models...")
        issues, story_to_tasks = IssueMapper.map_raw_data_to_models(project_data)
        print(f"Mapped {len(issues)} issues and {len(story_to_tasks)} stories.")
    except Exception as e:
        print(f"Error mapping project data: {e}")
        traceback.print_exc()  # Print detailed traceback
        return
    
    # Step 3: Generate burndown chart
    try:
        print("Generating burndown chart...")
        chart_generator = BurndownChart(story_to_tasks)
        output_path = chart_generator.generate_interactive_html("sprint_burndown.html")
        print(f"Burndown chart generated successfully: {output_path}")
        
        # Open the chart in the default browser if possible
        try:
            import webbrowser
            webbrowser.open(f"file://{os.path.abspath(output_path)}")
        except Exception as browser_error:
            print(f"Note: Could not open the chart in browser: {browser_error}")
    except Exception as e:
        print(f"Error generating burndown chart: {e}")
        traceback.print_exc()  # Print detailed traceback
        return
    
    print("Done!")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Unhandled exception in main: {e}")
        traceback.print_exc()