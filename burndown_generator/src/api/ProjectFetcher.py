"""
Project data fetcher from GitHub API.
"""
import json
from api.GitHubClient import GitHubClient
from config.configuration import Configuration

class ProjectFetcher:
    """
    Fetches project data from GitHub API.
    """
    def __init__(self):
        """
        Initialize the project fetcher.
        """
        self.github_client = GitHubClient()
        
    def fetch_project_data(self, save_to_file=True):
        """
        Fetch all project data using paginated queries.
        
        Args:
            save_to_file (bool, optional): Whether to save the result to a file
            
        Returns:
            dict: Project data
        """
        # Fetch data using paginated query
        all_items = self.github_client.fetch_paginated_query(
            create_query_func=self._create_paginated_query,
            process_page_func=self._extract_nodes_from_page
        )
        
        # Create a complete result object with all items
        complete_result = {
            "organization": {
                "projectV2": {
                    "items": {
                        "nodes": all_items
                    }
                }
            }
        }
        
        # Save the complete result to a JSON file if requested
        if save_to_file:
            with open('result.json', 'w') as json_file:
                json.dump(complete_result, json_file, indent=4)
                
        return complete_result
        
    def _create_paginated_query(self, cursor=None):
        """
        Create a paginated query for fetching project items.
        
        Args:
            cursor (str, optional): Cursor for pagination
            
        Returns:
            str: GraphQL query string
        """
        # Add the cursor parameter to the query if provided
        after_param = f'after: "{cursor}"' if cursor else "after: null"
        
        return f"""
        {{
          organization(login: "{Configuration.ORGANIZATION_NAME}") {{
            projectV2(number: {Configuration.PROJECT_NUMBER}) {{
              items(first: 100, {after_param}) {{
                nodes {{
                  type
                  content {{
                    ... on Issue {{
                      id
                      title
                      state
                      createdAt
                      closed
                      closedAt
                      issueType {{
                        name
                      }}
                      parent {{
                        id
                        title
                      }}
                      labels(first: 10) {{
                        nodes {{
                          name
                        }}
                      }}
                      timelineItems(first: 100, itemTypes: [CLOSED_EVENT, REOPENED_EVENT]) {{
                        nodes {{
                          __typename
                          ... on ClosedEvent {{
                            createdAt
                            actor {{
                              login
                            }}
                          }}
                          ... on ReopenedEvent {{
                            createdAt
                            actor {{
                              login
                            }}
                          }}
                        }}
                      }}
                      subIssues(first: 100) {{
                        nodes {{
                          id
                          title
                        }}
                      }}
                      subIssuesSummary {{
                        completed
                        percentCompleted
                        total
                      }}
                    }}
                  }}
                  fieldValues(first: 100) {{
                    nodes {{
                      ... on ProjectV2ItemFieldIterationValue {{
                        title
                      }}
                      ... on ProjectV2ItemFieldMilestoneValue {{
                        milestone {{
                          title
                        }}
                      }}
                      ... on ProjectV2ItemFieldNumberValue {{
                        number
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
        Extract nodes from a page result.
        
        Args:
            page_result (dict): Page result
            
        Returns:
            list: Nodes from the page
        """
        try:
            return page_result["organization"]["projectV2"]["items"]["nodes"]
        except (KeyError, TypeError):
            return []
