from enum import Enum, auto
from datetime import datetime, timedelta

class DayOfWeek(Enum):
    """
    Enum representing days of the week.
    """
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6
    
    @staticmethod
    def from_datetime(dt):
        """
        Get the day of week enum from a datetime object.
        
        Args:
            dt (datetime): The datetime object
            
        Returns:
            DayOfWeek: The corresponding day of week
        """
        # weekday() returns 0 for Monday, 1 for Tuesday, etc.
        return DayOfWeek(dt.weekday())
        
    @staticmethod
    def is_weekend(dt):
        """
        Check if the given datetime is on a weekend.
        
        Args:
            dt (datetime): The datetime object
            
        Returns:
            bool: True if the day is a weekend, False otherwise
        """
        day = DayOfWeek.from_datetime(dt)
        return day in [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY]
        
    @staticmethod
    def next_working_day(dt):
        """
        Get the next working day (skip weekends).
        
        Args:
            dt (datetime): The datetime object
            
        Returns:
            datetime: The next working day
        """
        next_day = dt + timedelta(days=1)
        while DayOfWeek.is_weekend(next_day):
            next_day += timedelta(days=1)
        return next_day
        
    @staticmethod
    def previous_working_day(dt):
        """
        Get the previous working day (skip weekends).
        
        Args:
            dt (datetime): The datetime object
            
        Returns:
            datetime: The previous working day
        """
        prev_day = dt - timedelta(days=1)
        while DayOfWeek.is_weekend(prev_day):
            prev_day -= timedelta(days=1)
        return prev_day
        
    @staticmethod
    def get_working_days_between(start_date, end_date):
        """
        Count the number of working days between two dates.
        
        Args:
            start_date (datetime): The start date
            end_date (datetime): The end date
            
        Returns:
            int: Number of working days
        """
        if start_date > end_date:
            return 0
            
        # Normalize to date objects if they are datetime
        if hasattr(start_date, 'date'):
            start_date = start_date.date()
        if hasattr(end_date, 'date'):
            end_date = end_date.date()
            
        count = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Convert to datetime for weekday calculation
            dt = datetime.combine(current_date, datetime.min.time())
            if not DayOfWeek.is_weekend(dt):
                count += 1
            current_date += timedelta(days=1)
            
        return count
