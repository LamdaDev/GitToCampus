from models.IssueState import IssueState
from datetime import datetime

class SubIssue:
    """
    Represents a sub-issue or task within a parent issue/story.
    """
    def __init__(self, issue_id, title, state, created_at, closed_at=None, 
                 closed=False, estimation=None, parent_id=None):
        """
        Initialize a SubIssue instance.
        
        Args:
            issue_id (str): Unique identifier for the issue
            title (str): Title of the issue
            state (str or IssueState): State of the issue (open or closed)
            created_at (str or datetime): ISO timestamp or datetime when the issue was created
            closed_at (str or datetime, optional): ISO timestamp or datetime when the issue was closed
            closed (bool, optional): Whether the issue is closed
            estimation (float, optional): Story point estimation
            parent_id (str, optional): ID of the parent issue
        """
        self.id = issue_id
        self.title = title
        self.state = state if isinstance(state, IssueState) else IssueState.from_string(state)
        self.created_at = self._parse_datetime(created_at)
        self.closed_at = self._parse_datetime(closed_at) if closed_at else None
        self.closed = closed
        self.estimation = estimation
        self.parent_id = parent_id

    def _parse_datetime(self, datetime_value):
        """
        Parse a datetime value to a datetime object.
        
        Args:
            datetime_value (str or datetime): ISO format datetime string or datetime object
            
        Returns:
            datetime: Parsed datetime object
        """
        try:
            # If it's already a datetime object, return it
            if isinstance(datetime_value, datetime):
                return datetime_value
                
            # If it's a string, parse it
            if isinstance(datetime_value, str):
                return datetime.fromisoformat(datetime_value.replace("Z", "+00:00"))
                
            # If it's None or another type, return current datetime
            return datetime.now()
        except (ValueError, AttributeError, TypeError):
            return datetime.now()
            
    def is_closed_as_of(self, date):
        """
        Check if the issue was closed as of a given date.
        
        Args:
            date (datetime or date): The date to check against
            
        Returns:
            bool: True if the issue was closed as of the given date, False otherwise
        """
        if not self.closed or not self.closed_at:
            return False
            
        # Convert to date objects if comparing with a date
        if hasattr(date, 'date') and not hasattr(self.closed_at, 'date'):
            compare_date = date.date()
            closed_date = self.closed_at.date()
        else:
            compare_date = date
            closed_date = self.closed_at
            
        return closed_date <= compare_date
        
    def __str__(self):
        return f"SubIssue(id={self.id}, title={self.title}, state={self.state}, parent={self.parent_id})"
        
    def __repr__(self):
        return self.__str__()