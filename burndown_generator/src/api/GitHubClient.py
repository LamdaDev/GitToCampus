"""
GitHub API client for interacting with GitHub GraphQL API.
"""
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport
from config.configuration import Configuration 

class GitHubClient:
    """
    Client for interacting with the GitHub GraphQL API.
    """
    def __init__(self):
        """
        Initialize the GitHub GraphQL client with the configured token.
        
        Raises:
            ValueError: If the GitHub token is not set
        """
        token = Configuration.GITHUB_TOKEN_API
        if not token:
            raise ValueError("GitHub token not configured")
            
        # Set up the transport with GitHub GraphQL endpoint and token
        transport = RequestsHTTPTransport(
            url=Configuration.GITHUB_GRAPHQL_API,
            # Note: calling classmethod on the class is valid python
            headers=Configuration.get_auth_headers(),
            verify=True,
            retries=3,
        )
        
        # 'fetch_schema_from_transport=True' fetches the schema on init.
        # This is great for validation but adds startup time.
        self.client = Client(transport=transport, fetch_schema_from_transport=True)
        
    def execute_query(self, query_string, variables=None):
        """
        Execute a GraphQL query.
        
        Args:
            query_string (str): GraphQL query string
            variables (dict, optional): Variables for the query
            
        Returns:
            dict: Query result
            
        Raises:
            Exception: If there's an error executing the query
        """
        query = gql(query_string)
        return self.client.execute(query, variable_values=variables)
        
    def fetch_paginated_query(self, create_query_func, process_page_func):
        """
        Fetch all pages of data using a paginated query.
        
        Args:
            create_query_func (callable): Function that takes a cursor and returns a query
            process_page_func (callable): Function that processes each page result
            
        Returns:
            list: Combined results from all pages
        """
        cursor = None
        has_next_page = True
        page_count = 0
        all_results = []
        
        print("Starting paginated query...")
        
        while has_next_page:
            page_count += 1
            print(f"Fetching page {page_count}...")
            
            # Create and execute the query with the current cursor
            # (The ProjectFetcher must handle the query string construction)
            query_string = create_query_func(cursor)
            page_result = self.execute_query(query_string)
            
            # Process the page results
            page_data = process_page_func(page_result)
            all_results.extend(page_data)
            
            # Check for next page
            page_info = self._extract_page_info(page_result)
            has_next_page = page_info.get("hasNextPage", False)
            
            # If there are more pages, update the cursor
            if has_next_page:
                cursor = page_info.get("endCursor")
                
        print(f"Fetched a total of {len(all_results)} items across {page_count} pages")
        return all_results
        
    def _extract_page_info(self, result):
        """
        Extract page info from a query result.
        
        UPDATED: Now handles both 'user' and 'organization' roots dynamically.
        """
        # 1. Determine the root key (user or organization)
        # We try to get the owner type from config, but fallback to checking keys
        root_key = Configuration.OWNER_TYPE.lower() # 'user' or 'organization'
        
        try:
            # Attempt to access via the configured owner type
            # e.g. result['user']['projectV2']...
            project_data = result.get(root_key, {})
            
            # 2. Extract Page Info
            # Note: If your query structure changes (e.g. searching 'node'), 
            # this path needs to match the query in ProjectFetcher.
            if "projectV2" in project_data:
                return project_data["projectV2"]["items"]["pageInfo"]
            
            # Fallback: Sometimes we might query 'node' directly for project ID
            return {}

        except (KeyError, TypeError) as e:
            print(f"Warning: Could not extract page info. Structure might be unexpected: {e}")
            return {}
        