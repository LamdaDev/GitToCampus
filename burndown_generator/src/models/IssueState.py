from enum import Enum, auto

class IssueState(Enum):
    """
    Enum representing the possible states of an issue.
    """
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    
    @staticmethod
    def from_string(state_str):
        """
        Convert a string to an IssueState enum value.
        
        Args:
            state_str (str): String representation of the state
            
        Returns:
            IssueState: The corresponding enum value, or OPEN if not found
        """
        try:
            return IssueState(state_str.upper())
        except (ValueError, AttributeError):
            return IssueState.OPEN
