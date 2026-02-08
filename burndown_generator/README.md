
# Burndown Generator

This tool builds an **interactive sprint burndown chart** from a GitHub Project (v2). It fetches your project items via GitHub’s GraphQL API, maps sprint/estimation/status fields, runs one of three algorithms, and outputs a self‑contained HTML report with charts and drill‑down tables.

## What you get
- **Interactive HTML report** (`sprint_burndown.html`) with:
	- Sprint selector
	- Date range picker
	- Algorithm selector
	- Clickable data points that reveal stories/tasks for that day

## How it works (high level)
1. **Fetches Project v2 items** (issues/draft issues) and their field values.
2. **Maps fields** to sprint, estimation, and status based on your configuration.
3. **Builds story/task structure** and applies optional label/type filters.
4. **Computes burndown data** using one of the algorithms below.
5. **Renders HTML** with Plotly + Tabulator for charts and tables.

## Algorithms
- **Algorithm 1 (Story Percentage):**
	- Uses story estimation or sums task estimations when story points are on tasks.
	- Calculates progress by completed task points (falls back to task count).

- **Algorithm 2 (Task‑Based):**
	- Ignores stories and burns down based on task estimations.
	- Tasks without estimates inherit a share of the parent story’s points.

- **Algorithm 3 (Pipeline‑Based):**
	- Uses your pipeline status weights (e.g., Backlog=0.0, In Progress=0.33, Done=1.0).
	- Remaining points shrink as tasks move through the pipeline and close.

## Setup (first time)
1. **Create a token** with `repo` scope (classic) or `read:project` (fine‑grained).
2. Copy the sample env file:
	 - `.env.example` → `.env`
3. Fill in:
	 - `GITHUB_API_TOKEN`
	 - `GITHUB_PROJECT_OWNER`
	 - `GITHUB_OWNER_TYPE` (`user` or `organization`)
	 - `GITHUB_PROJECT_NUMBER`
	 - `GITHUB_REPOSITORY`
	 - Field names that match your Project v2 fields:
		 - `GITHUB_FIELD_ITERATION` (e.g., “Sprint #”)
		 - `GITHUB_FIELD_ESTIMATE` (e.g., “Story Points”)
		 - `GITHUB_FIELD_STATUS` (e.g., “Status”)
4. (Optional) Set `GITHUB_STATUS_PIPELINE` to match your board columns.

## Run
From the `burndown_generator` folder:
- `python3 src/main.py`

The script:
- Pulls the latest Project v2 data
- Generates `sprint_burndown.html`
- Opens the HTML file in your default browser

## Troubleshooting
- **Only “N/A” in sprint list:** verify your iteration field name matches your Project field.
- **No burndown movement:** ensure task `Story Points` exist or provide story estimations.
- **GraphQL errors:** check token permissions and the field names in `.env`.
