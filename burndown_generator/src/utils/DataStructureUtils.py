"""
Utilities for data structure manipulations.
"""

class DataStructureUtils:
    """
    Utilities for working with data structures.
    """
    @staticmethod
    def restructure_data(story_data):
        """
        Restructure data to ensure stories and tasks are in the expected format.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            
        Returns:
            dict: Restructured data with stories and tasks
        """
        if not isinstance(story_data, dict):
            return {}

        # If data already follows the story/task shape, return as-is
        if story_data and all(
            isinstance(value, dict) and "__story_data" in value
            for value in story_data.values()
        ):
            return story_data

        restructured_data = {}

        for story_id, story in story_data.items():
            # Preserve any existing task mapping if present
            if isinstance(story, dict) and "__story_data" in story:
                restructured_data[story_id] = story
            else:
                restructured_data[story_id] = {
                    "__story_data": story
                }

        return restructured_data
        
    @staticmethod
    def safely_get_nested_value(data_dict, *keys, default=None):
        """
        Safely get a nested value from a dictionary.
        
        Args:
            data_dict (dict): Dictionary to get the value from
            *keys: Keys to access the nested value
            default: Default value to return if the key path doesn't exist
            
        Returns:
            any: The value at the key path, or the default value
        """
        current = data_dict
        for key in keys:
            if not isinstance(current, dict) or key not in current:
                return default
            current = current[key]
        return current
        
    @staticmethod
    def extract_labels(labels_dict):
        """
        Extract label names from a labels dictionary.
        
        Args:
            labels_dict (dict): Dictionary containing label nodes
            
        Returns:
            list: List of label names
        """
        labels = []
        if isinstance(labels_dict, dict) and "nodes" in labels_dict:
            for label in labels_dict["nodes"]:
                if isinstance(label, dict) and "name" in label:
                    labels.append(label["name"])
        elif isinstance(labels_dict, list):
            for label in labels_dict:
                if isinstance(label, dict) and "name" in label:
                    labels.append(label["name"])
                elif isinstance(label, str):
                    labels.append(label)
        return labels
        
    @staticmethod
    def filter_issues_by_sprint(issues, sprint_name):
        """
        Filter issues by sprint name.
        
        Args:
            issues (dict): Dictionary of issues
            sprint_name (str): Sprint name to filter by
            
        Returns:
            dict: Filtered dictionary of issues
        """
        if not isinstance(issues, dict):
            return {}

        filtered = {}
        for issue_id, issue in issues.items():
            # Support Issue objects or dicts
            issue_sprint = None
            if hasattr(issue, "sprint"):
                issue_sprint = issue.sprint
            elif isinstance(issue, dict):
                issue_sprint = issue.get("Sprint") or issue.get("sprint")

            if issue_sprint == sprint_name:
                filtered[issue_id] = issue

        return filtered
        
    @staticmethod
    def count_issues_by_type(issues):
        """
        Count issues by type.
        
        Args:
            issues (dict): Dictionary of issues
            
        Returns:
            dict: Dictionary with counts by type
        """
        counts = {}
        if not isinstance(issues, dict):
            return counts

        for issue in issues.values():
            issue_type_name = None

            if hasattr(issue, "issue_type"):
                if isinstance(issue.issue_type, dict):
                    issue_type_name = issue.issue_type.get("name")
                elif isinstance(issue.issue_type, str):
                    issue_type_name = issue.issue_type
            elif isinstance(issue, dict):
                issue_type = issue.get("issueType") or issue.get("issue_type")
                if isinstance(issue_type, dict):
                    issue_type_name = issue_type.get("name")
                elif isinstance(issue_type, str):
                    issue_type_name = issue_type

            if issue_type_name:
                counts[issue_type_name] = counts.get(issue_type_name, 0) + 1

        return counts
