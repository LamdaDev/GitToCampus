import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Configuration:
    """
    Configuration module that prioritizes environment variables for reproducibility,
    falling back to 'LamdaDev/GitToCampus' defaults if env vars are missing.
    """

    # --- Authentication ---
    GITHUB_TOKEN_API = os.getenv("GITHUB_API_TOKEN", "")

    # --- Target Identification ---
    # Default: LamdaDev
    PROJECT_OWNER = os.getenv("GITHUB_PROJECT_OWNER", "LamdaDev")
    
    # Default: user (vs organization)
    OWNER_TYPE = os.getenv("GITHUB_OWNER_TYPE", "user").lower()
    
    # Default: 1
    PROJECT_NUMBER = int(os.getenv("GITHUB_PROJECT_NUMBER", "1"))
    
    # Default: GitToCampus
    REPOSITORY_NAME = os.getenv("GITHUB_REPOSITORY", "GitToCampus")

    # --- Data Mapping (The "Bridge" between Code and GitHub) ---
    # Default: Sprint #
    ITERATION_FIELD_NAME = os.getenv("GITHUB_FIELD_ITERATION", "Sprint #")
    
    # Default: Story Points
    ESTIMATE_FIELD_NAME = os.getenv("GITHUB_FIELD_ESTIMATE", "Story Points")
    
    # Default: Status
    STATUS_FIELD_NAME = os.getenv("GITHUB_FIELD_STATUS", "Status")

    # --- Algorithm Settings ---
    USE_WEIGHTED_ALGORITHM = True
    
    # --- Pipeline / Status Mapping ---
    # We try to load a custom pipeline from JSON. 
    # If that fails or is missing, we use the default board columns.
    _default_pipeline = [
        ["Backlog", 0.0],
        ["In Progress", 0.33],
        ["To be reviewed", 0.67],
        ["Done", 1.0]
    ]
    
    PIPELINE = _default_pipeline
    
    # Attempt to load custom pipeline from Env Var
    _env_pipeline = os.getenv("GITHUB_STATUS_PIPELINE")
    if _env_pipeline:
        try:
            PIPELINE = json.loads(_env_pipeline)
        except json.JSONDecodeError:
            print("Warning: Could not parse GITHUB_STATUS_PIPELINE. Using default pipeline.")

    # --- API Settings ---
    GITHUB_GRAPHQL_API = "https://api.github.com/graphql"

    @classmethod
    def get_pipeline_weight(cls, status_name):
        """
        Returns the weight (0.0 - 1.0) for a given status string.
        Case-insensitive matching.
        """
        if not status_name:
            return 0.0
            
        target = status_name.strip().lower()
        
        # We iterate over the loaded PIPELINE (which might be from env vars)
        for pipeline_status, weight in cls.PIPELINE:
            if pipeline_status.lower() == target:
                return weight
        return 0.0

    @classmethod
    def get_auth_headers(cls):
        return {
            "Authorization": f"Bearer {cls.GITHUB_TOKEN_API}",
            "Accept": "application/vnd.github.node" 
        }

# Quick Test to verify loaded config
if __name__ == "__main__":
    print(f"Loaded Config for: {Configuration.PROJECT_OWNER}")
    print(f"Targeting Field: {Configuration.ESTIMATE_FIELD_NAME}")
    print(f"Pipeline Loaded: {Configuration.PIPELINE}")
