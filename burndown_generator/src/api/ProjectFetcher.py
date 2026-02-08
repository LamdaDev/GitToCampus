"""
Project data fetcher from GitHub API.
"""
import json
import logging
from api.GitHubClient import GitHubClient
from config.configuration import Configuration

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProjectFetcher:
    """
    Fetches project data from GitHub API.
    """
    def __init__(self):
        """
        Initialize the project fetcher.
        """
        self.github_client = GitHubClient()
        self.root_type = Configuration.OWNER_TYPE.lower() # 'user' or 'organization'
        self.owner_name = Configuration.PROJECT_OWNER
        self.project_number = Configuration.PROJECT_NUMBER

    def fetch_project_data(self, save_to_file=True):
        """
        Fetch all project data using paginated queries.
        """
        logger.info(f"Fetching data for Project #{self.project_number} owned by {self.root_type} '{self.owner_name}'...")

        # 1. Fetch data using paginated query
        all_items = self.github_client.fetch_paginated_query(
            create_query_func=self._create_paginated_query,
            process_page_func=self._extract_nodes_from_page
        )
        
        # 2. Reconstruct a clean result object
        # We use a generic structure that works for both User and Org
        complete_result = {
            "meta": {
                "owner": self.owner_name,
                "type": self.root_type,
                "project_number": self.project_number
            },
            "projectV2": {
                "items": {
                    "nodes": all_items
                }
            }
        }
        
        # 3. Save to file
        if save_to_file:
            filename = 'project_data.json'
            logger.info(f"Saving {len(all_items)} items to {filename}...")
            with open(filename, 'w') as json_file:
                json.dump(complete_result, json_file, indent=4)
                
        return complete_items_list if 'complete_items_list' in locals() else complete_result

    def _create_paginated_query(self, cursor=None):
        """
        Constructs the GraphQL query.
        Now supports both 'user' and 'organization' root nodes.
        """
        # Pagination argument
        after_arg = f', after: "{cursor}"' if cursor else ""
        
        # Dynamic Root Construction
        # We inject the specific root (user/org) and login name
        query_root = f"""
        {self.root_type}(login: "{self.owner_name}") {{
            projectV2(number: {self.project_number}) {{
        """

        # The Query Body
        return f"""
        {{
          {query_root}
              items(first: 100{after_arg}) {{
                nodes {{
                  id
                  type
                  content {{
                    ... on Issue {{
                      id
                      title
                      number
                      state
                      createdAt
                      closedAt
                      issueType {{
                        name
                      }}
                      parent {{
                        id
                      }}
                      repository {{
                        name
                      }}
                      assignees(first: 100) {{
                        nodes {{
                          login
                        }}
                      }}
                      labels(first: 100) {{
                        nodes {{
                          name
                        }}
                      }}
                      timelineItems(first: 100, itemTypes: [CLOSED_EVENT, REOPENED_EVENT]) {{
                        nodes {{
                          __typename
                          ... on ClosedEvent {{
                            createdAt
                          }}
                          ... on ReopenedEvent {{
                            createdAt
                          }}
                        }}
                      }}
                      subIssuesSummary {{
                        total
                        completed
                        percentCompleted
                      }}
                    }}
                    ... on DraftIssue {{
                      id
                      title
                      createdAt
                    }}
                  }}
                  
                  # --- CUSTOM FIELDS ---
                  # We request the field definition name for every value 
                  # so we can map "Story Points" vs "Priority" correctly.
                  fieldValues(first: 20) {{
                    nodes {{
                      # 1. Iteration (Sprint)
                      ... on ProjectV2ItemFieldIterationValue {{
                        title
                        startDate
                        duration
                        field {{ ... on ProjectV2IterationField {{ name }} ... on ProjectV2FieldCommon {{ name }} }}
                      }}
                      
                      # 2. Status (Single Select)
                      ... on ProjectV2ItemFieldSingleSelectValue {{
                        name
                        field {{ ... on ProjectV2FieldCommon {{ name }} }}
                      }}
                      
                      # 3. Number (Story Points)
                      ... on ProjectV2ItemFieldNumberValue {{
                        number
                        field {{ ... on ProjectV2FieldCommon {{ name }} }}
                      }}
                      
                      # 4. Date Fields (if used)
                      ... on ProjectV2ItemFieldDateValue {{
                        date
                        field {{ ... on ProjectV2FieldCommon {{ name }} }}
                      }}
                    }}
                  }}
                }}
                pageInfo {{
                  hasNextPage
                  endCursor
                }}
              }}
            }}
          }}
        }}
        """
        
    def _extract_nodes_from_page(self, page_result):
        """
        Extract nodes from a page result, handling the dynamic root.
        """
        try:
            # 1. Access the root (user or organization)
            root_data = page_result.get(self.root_type)
            if not root_data:
                logger.error(f"Root key '{self.root_type}' not found in response.")
                return []

            # 2. Traverse down to items
            nodes = root_data["projectV2"]["items"]["nodes"]
            return nodes

        except (KeyError, TypeError) as e:
            logger.error(f"Error parsing page result: {e}")
            return []
