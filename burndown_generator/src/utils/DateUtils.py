"""
Date utilities for burndown chart calculations.
"""
import datetime
from models.DayOfWeek import DayOfWeek

class DateUtils:
    """
    Utilities for date manipulations.
    """
    @staticmethod
    def normalize_datetime(dt):
        """
        Normalize a datetime to midnight.
        
        Args:
            dt (datetime): Datetime to normalize
            
        Returns:
            datetime: Normalized datetime
        """
        if not dt:
            return None
            
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
    @staticmethod
    def parse_iso_datetime(datetime_str):
        """
        Parse an ISO format datetime string to a datetime object.
        
        Args:
            datetime_str (str): ISO format datetime string
            
        Returns:
            datetime: Parsed datetime object
        """
        try:
            return datetime.datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
            
    @staticmethod
    def get_date_range(start_date, end_date):
        """
        Generate a list of dates between start and end.
        
        Args:
            start_date (str or datetime): Start date
            end_date (str or datetime): End date
            
        Returns:
            list: List of datetime objects
        """
        # Convert string dates to datetime objects if needed
        if isinstance(start_date, str):
            start = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        else:
            start = start_date
            
        if isinstance(end_date, str):
            end = datetime.datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end = end_date
            
        # Normalize to midnight
        start = DateUtils.normalize_datetime(start)
        end = DateUtils.normalize_datetime(end)
        
        # Generate the date range
        date_range = []
        current_date = start
        
        while current_date <= end:
            # Create a new date object to avoid reference issues
            date_range.append(datetime.datetime(
                current_date.year,
                current_date.month,
                current_date.day
            ))
            current_date += datetime.timedelta(days=1)
            
        return date_range
        
    @staticmethod
    def get_working_date_range(start_date, end_date):
        """
        Generate a list of working dates (excluding weekends) between start and end.
        
        Args:
            start_date (str or datetime): Start date
            end_date (str or datetime): End date
            
        Returns:
            list: List of datetime objects (working days only)
        """
        date_range = DateUtils.get_date_range(start_date, end_date)
        return [dt for dt in date_range if not DayOfWeek.is_weekend(dt)]
        
    @staticmethod
    def get_default_date_range():
        """
        Get a default date range (last 30 days).
        
        Returns:
            tuple: (start_date, end_date) as strings in YYYY-MM-DD format
        """
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=30)
        
        return (
            start_date.strftime("%Y-%m-%d"),
            end_date.strftime("%Y-%m-%d")
        )
