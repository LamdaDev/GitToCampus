"""
Maps raw GitHub API data to domain models.
"""
from models.Issue import Issue
from models.SubIssue import SubIssue
from config.configuration import Configuration

class IssueMapper:
    """
    Maps raw data from GitHub API to domain model objects.
    """
    @staticmethod
    def map_raw_data_to_models(project_data):
        """
        Map raw project data to domain model objects.
        
        Args:
            project_data (dict): Raw project data from GitHub API
            
        Returns:
            tuple: (dict of issues, dict of story_to_tasks)
        """
        # Extract nodes from project data
        nodes = IssueMapper._extract_nodes(project_data)
            
        # Create Issue objects from the nodes
        issues = {}
        for item in nodes:
            content = item.get("content")
            if not content:
                continue
                
            field_values = item.get("fieldValues", {}).get("nodes", [])
            
            # Create Issue object
            issue = IssueMapper._create_issue_from_content(content)
            
            # Update issue with field values
            issue.update_from_field_values(field_values)
            
            # Optional label/issue-type filtering
            if not IssueMapper._passes_label_filters(issue.labels):
                continue
            if not IssueMapper._passes_issue_type_filters(issue.issue_type):
                continue

            # Add to issues dict
            issues[issue.id] = issue
            
        # Map parent-child relationships
        story_to_tasks = IssueMapper._map_stories_to_tasks(issues)
        
        return issues, story_to_tasks
        
    @staticmethod
    def _create_issue_from_content(content):
        """
        Create an Issue object from content data.
        
        Args:
            content (dict): Content data from API
            
        Returns:
            Issue: Created Issue object
        """
        # Safely extract data, ensuring proper types
        issue_id = content.get("id", "")
        title = content.get("title", "")
        state = content.get("state", "")
        created_at = content.get("createdAt", "")
        closed_at = content.get("closedAt")
        closed = content.get("closed", False)
        if not closed and (state == "CLOSED" or closed_at):
            closed = True
        issue_type = content.get("issueType", {})
        parent = content.get("parent")
        labels = content.get("labels", {})
        assignees = content.get("assignees", {})
        timeline_items = content.get("timelineItems", {})
        sub_issues = content.get("subIssues", {})
        
        # Handle sub_issues_summary with extra care as it might contain numeric strings
        sub_issues_summary = {}
        if content.get("subIssuesSummary") is not None:
            raw_summary = content.get("subIssuesSummary", {})
            sub_issues_summary = {
                "completed": IssueMapper._safe_int_conversion(raw_summary.get("completed", 0)),
                "percentCompleted": IssueMapper._safe_float_conversion(raw_summary.get("percentCompleted", 0)),
                "total": IssueMapper._safe_int_conversion(raw_summary.get("total", 0))
            }
        
        return Issue(
            issue_id=issue_id,
            title=title,
            state=state,
            created_at=created_at,
            closed_at=closed_at,
            closed=closed,
            issue_type=issue_type,
            parent=parent,
            labels=labels,
            assignees=assignees,
            timeline_items=timeline_items,
            sub_issues=sub_issues,
            sub_issues_summary=sub_issues_summary
        )

    @staticmethod
    def _extract_nodes(project_data):
        """
        Extract item nodes from project data supporting multiple root shapes.
        """
        if not project_data or not isinstance(project_data, dict):
            return []

        # Shape 1: direct projectV2 root
        try:
            if "projectV2" in project_data:
                return project_data["projectV2"]["items"]["nodes"]
        except (KeyError, TypeError):
            pass

        # Shape 2: user/org root
        root_key = Configuration.OWNER_TYPE.lower()
        try:
            if root_key in project_data:
                return project_data[root_key]["projectV2"]["items"]["nodes"]
        except (KeyError, TypeError):
            pass

        # Fallback: try common keys
        for fallback_key in ("organization", "user"):
            try:
                if fallback_key in project_data:
                    return project_data[fallback_key]["projectV2"]["items"]["nodes"]
            except (KeyError, TypeError):
                continue

        return []

    @staticmethod
    def _passes_label_filters(labels):
        """
        Apply include-only label filters from Configuration.
        """
        normalized = {label.lower() for label in labels or []}

        if Configuration.LABEL_FILTER_ENABLED and Configuration.LABEL_INCLUDE_LIST:
            return bool(normalized.intersection(Configuration.LABEL_INCLUDE_LIST))

        return True

    @staticmethod
    def _passes_issue_type_filters(issue_type):
        """
        Apply include-only issue type filters from Configuration.
        """
        issue_type_name = ""
        if isinstance(issue_type, dict):
            issue_type_name = issue_type.get("name", "")
        elif isinstance(issue_type, str):
            issue_type_name = issue_type

        normalized = issue_type_name.strip().lower()

        if Configuration.ISSUE_TYPE_FILTER_ENABLED and Configuration.ISSUE_TYPES_INCLUDE_LIST:
            return normalized in Configuration.ISSUE_TYPES_INCLUDE_LIST

        return True
        
    @staticmethod
    def _map_stories_to_tasks(issues):
        """
        Map stories to their tasks.
        
        Args:
            issues (dict): Dictionary of Issue objects
            
        Returns:
            dict: Dictionary mapping story IDs to their tasks
        """
        story_to_tasks = {}
        
        # First, identify all stories
        for issue_id, issue in issues.items():
            if issue.is_story():
                story_to_tasks[issue_id] = {}
                story_to_tasks[issue_id]["__story_data"] = issue
                
        # Then map tasks to their parent stories
        mapped_task_ids = set()
        for issue_id, issue in issues.items():
            if issue.is_task() and issue.parent and "id" in issue.parent:
                parent_id = issue.parent["id"]
                if parent_id in story_to_tasks:
                    story_to_tasks[parent_id][issue_id] = issue
                    mapped_task_ids.add(issue_id)
                    
                    # Create SubIssue object and add to parent Issue
                    if parent_id in issues:
                        parent_issue = issues[parent_id]
                        sub_issue = SubIssue(
                            issue_id=issue.id,
                            title=issue.title,
                            state=issue.state,
                            created_at=issue.created_at,
                            closed_at=issue.closed_at,
                            closed=issue.closed,
                            estimation=issue.estimation,
                            parent_id=parent_id
                        )
                        parent_issue.add_sub_issue(sub_issue)

        # Add orphan tasks as pseudo-stories (task-only workflows)
        for issue_id, issue in issues.items():
            if issue.is_task() and issue_id not in mapped_task_ids:
                if issue_id not in story_to_tasks:
                    story_to_tasks[issue_id] = {"__story_data": issue}
                # Include the task itself as a child task to enable algorithms
                story_to_tasks[issue_id][issue_id] = issue
                    
        return story_to_tasks
    
    @staticmethod
    def _safe_int_conversion(value, default=0):
        """
        Safely convert a value to an integer.
        
        Args:
            value: Value to convert
            default (int): Default value if conversion fails
            
        Returns:
            int: Converted integer or default
        """
        try:
            return int(float(value)) if value is not None else default
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_float_conversion(value, default=0.0):
        """
        Safely convert a value to a float.
        
        Args:
            value: Value to convert
            default (float): Default value if conversion fails
            
        Returns:
            float: Converted float or default
        """
        try:
            return float(value) if value is not None else default
        except (ValueError, TypeError):
            return default