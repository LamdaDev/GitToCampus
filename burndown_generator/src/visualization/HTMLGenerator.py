"""
Generates HTML for the burndown chart.
"""
import json
import datetime
import os
from pathlib import Path
from config.configuration import Configuration

class HTMLGenerator:
    """
    Generates HTML for the burndown chart.
    """
    def __init__(self):
        """
        Initialize the HTML generator.
        """
        pass
        
    def generate_html(self, story_data, available_sprints, sprint_name, output_path="sprint_burndown.html"):
        """
        Generate a fully interactive HTML with controls for the burndown chart.
        
        Args:
            story_data (dict): Dictionary mapping story IDs to their data
            available_sprints (list): List of available sprint names
            sprint_name (str): Name of the sprint to initially select
            output_path (str): Path to save the HTML output
            
        Returns:
            str: Path to the generated HTML file
        """
        # Get current date for limiting future selection
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        
        # Default dates - one month ago to today
        month_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
        start_date = month_ago
        end_date = today
        
        # Set default sprint if not provided
        if not sprint_name and available_sprints:
            sprint_name = available_sprints[0]
            
        # Generate sprint options HTML
        sprint_options_html = self._generate_sprint_options(available_sprints, sprint_name)
        
        # Get HTML template
        html_content = self._get_html_template()
        
        # Serialize story data to JSON-friendly shape expected by the JS
        serialized_story_data = self._serialize_story_data(story_data)

        # Replace placeholders in the HTML
        html_content = html_content.replace('START_DATE_PLACEHOLDER', start_date)
        html_content = html_content.replace('END_DATE_PLACEHOLDER', end_date)
        html_content = html_content.replace('SPRINT_OPTIONS_PLACEHOLDER', sprint_options_html)
        html_content = html_content.replace('PROJECT_DATA_PLACEHOLDER', json.dumps(serialized_story_data))
        html_content = html_content.replace('PIPELINE_PLACEHOLDER', json.dumps(self._get_pipeline_config()))
        
        # Save the HTML file with UTF-8 encoding
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        print(f"Interactive burndown chart saved to: {output_path}")
        return output_path
        
    def _generate_sprint_options(self, available_sprints, selected_sprint):
        """
        Generate HTML options for sprint dropdown.
        
        Args:
            available_sprints (list): List of available sprint names
            selected_sprint (str): Name of the sprint to select
            
        Returns:
            str: HTML options for sprint dropdown
        """
        sprint_options_html = ""
        for sprint in available_sprints:
            selected = "selected" if sprint == selected_sprint else ""
            sprint_options_html += f'<option value="{sprint}" {selected}>{sprint}</option>\n'
        return sprint_options_html
        
    def _get_html_template(self):
        """
        Get the HTML template for the burndown chart.
        
        Returns:
            str: HTML template
        """
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sprint Burndown Chart</title>
    <!-- Include Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-2.24.1.min.js"></script>
    <!-- Include Tabulator library for tables -->
    <script src="https://cdn.jsdelivr.net/npm/tabulator-tables@5.5.0/dist/js/tabulator.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@5.5.0/dist/css/tabulator.min.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-top: 0;
        }
        .controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        .date-controls {
            display: flex;
            gap: 15px;
        }
        .date-controls label {
            display: flex;
            flex-direction: column;
            font-weight: 500;
        }
        .date-controls input {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .sprint-controls {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .sprint-controls label {
            font-weight: 500;
        }
        .sprint-controls select {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
            min-width: 150px;
        }
        .algorithm-controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .algorithm-controls label {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #45a049;
        }
        .chart-container {
            height: 500px;
            margin-bottom: 20px;
        }
        .table-container {
            margin-top: 30px;
            height: 600px;
            display: flex;
            flex-direction: column;
            background-color: #ffffff;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding-bottom: 10px;
            position: relative;
            resize: vertical;  /* Add this to make it vertically resizable */
            overflow: auto;    /* Add this to handle overflow content */
            min-height: 200px; /* Add minimum height */
        }
        /* Add a visual indicator for the resize handle */
        .table-container::after {
            content: "...";  /* Using simple dots instead of the special character */
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 16px;
            color: #999;
            cursor: ns-resize;
        }
        .info-panel {
            margin-top: 20px;
            padding: 15px;
            background-color: #e8f4fd;
            border-radius: 5px;
            border-left: 5px solid #2196F3;
        }
        .legend {
            margin-top: 10px;
            display: flex;
            gap: 20px;
            justify-content: center;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .legend-color {
            width: 20px;
            height: 10px;
            display: inline-block;
        }
        .tabulator {
            margin-top: 15px;
            flex-grow: 1;
            border: none !important;
        }
        .tabulator-footer {
            background-color: #f5f5f5 !important;
            border-top: 1px solid #ddd !important;
            border-radius: 0 0 5px 5px !important;
        }
        .tabulator-paginator {
            padding: 10px;
        }
        .tabulator-page {
            margin: 0 2px !important;
            padding: 5px 10px !important;
            border: 1px solid #ddd !important;
            border-radius: 3px !important;
            background-color: #fff !important;
            cursor: pointer !important;
        }
        .tabulator-page.active {
            background-color: #4CAF50 !important;
            color: white !important;
            border-color: #4CAF50 !important;
        }
        .tabulator-page:hover:not(.active) {
            background-color: #eee !important;
        }
        .tabulator-row {
            border-bottom: 1px solid #f0f0f0 !important;
        }
        .tabulator-row:hover {
            background-color: #f0f8ff !important;
        }
        .tabulator-header {
            background-color: #f9f9f9 !important;
            border-bottom: 2px solid #ddd !important;
        }
        .tabulator-col {
            padding: 8px !important;
        }
        #tableTitle {
            padding: 15px;
            margin: 0;
            background-color: #f5f5f5;
            border-bottom: 1px solid #ddd;
            border-radius: 5px 5px 0 0;
        }
        .debug-panel {
            margin-top: 20px;
            padding: 10px;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            display: none;
        }
        .data-summary {
            margin-top: 10px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
            font-size: 14px;
        }
        .error {
            color: #f44336;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sprint Burndown Chart</h1>

        <div class="data-summary">
            <p>Summary: <span id="data-summary-text">Loading data...</span></p>
        </div>

        <div class="controls">
            <div class="sprint-controls">
                <label for="sprintSelector">Sprint:</label>
                <select id="sprintSelector">
                    SPRINT_OPTIONS_PLACEHOLDER
                </select>
            </div>

            <div class="date-controls">
                <label>
                    Start Date:
                    <input type="date" id="startDate" value="START_DATE_PLACEHOLDER">
                </label>
                <label>
                    End Date:
                    <input type="date" id="endDate" value="END_DATE_PLACEHOLDER">
                </label>
            </div>

            <div class="algorithm-controls">
                <label>
                    <input type="radio" name="algorithm" value="1" checked>
                    Algorithm 1: Story-based with percentage completion
                </label>
                <label>
                    <input type="radio" name="algorithm" value="2">
                    Algorithm 2: Task-based burndown
                </label>
                <label>
                    <input type="radio" name="algorithm" value="3">
                    Algorithm 3: Pipeline-based completion
                </label>
            </div>

            <button id="updateButton" class="button">Update Chart</button>
            <button id="debugDatesButton" class="button" style="background-color: #9C27B0; display: none;">Debug Dates</button>
        </div>

        <div id="chart" class="chart-container"></div>

        <div class="legend">
            <div class="legend-item">
                <span class="legend-color" style="background-color: #1f77b4;"></span>
                <span>Remaining Points</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #ff7f0e;"></span>
                <span>Ideal Burndown</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: red;"></span>
                <span>Today</span>
            </div>
        </div>

        <div class="info-panel">
            <h3>Chart Information</h3>
            <p>Click on any data point to see the tasks or stories for that day.</p>
            <p><strong>Algorithm 1:</strong> Uses story estimations with percentage completion based on sub-tasks. As tasks are completed, the story burns down proportionally.</p>
            <p><strong>Algorithm 2:</strong> Focuses only on task estimations. If tasks don't have direct estimations, they inherit proportional points from their parent story.</p>
            <p><strong>Algorithm 3:</strong> Uses pipeline status weights to estimate completion for each task, revealing bottlenecks in the workflow.</p>
        </div>

        <div class="table-container">
            <h3 id="tableTitle">No data selected</h3>
            <div id="table"></div>
        </div>

        <div id="debug" class="debug-panel">Debug information will appear here.</div>
        <div id="dateDebug" class="debug-panel">Date debug information will appear here.</div>
    </div>

    <script>
        // Debug function to help troubleshoot
        function debug(message) {
            const debugElement = document.getElementById('debug');
            debugElement.style.display = 'block';

            if (typeof message === 'object') {
                debugElement.textContent += JSON.stringify(message, null, 2) + '\\n';
            } else {
                debugElement.textContent += message + '\\n';
            }
        }

        // Project data from your modelcomposer.py script
        const projectData = PROJECT_DATA_PLACEHOLDER;
        const pipelineConfig = PIPELINE_PLACEHOLDER;

        // Store burndown data for reuse
        let currentBurndownData = null;

        // Function to debug date information
        function debugDates(dateRange) {
            // Only run when debug is enabled
            if (document.getElementById('debug').style.display === 'none') return;

            debug("Date Range Information:");
            dateRange.forEach((date, index) => {
                debug(`Date ${index}: ${date.toISOString()} (${date.toDateString()})`);
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            debug(`Today (normalized): ${today.toISOString()} (${today.toDateString()})`);
        }

        // Function to adjust the table height based on content amount
        function adjustTableHeight() {
            try {
                // Get table container and check if it exists
                const tableContainer = document.querySelector('.table-container');
                if (!tableContainer) {
                    return; // Exit if container not found
                }

                // IMPORTANT: Wait for table to be fully initialized
                setTimeout(() => {
                    try {
                        // Check if table exists before trying to get data
                        if (!window.burndownTable || !window.burndownTable.element) {
                            return;
                        }

                        const tableData = window.burndownTable.getData() || [];
                        const dataLength = tableData.length;

                        // Adjust container height based on data amount
                        if (dataLength < 5) {
                            tableContainer.style.height = '300px';
                        } else if (dataLength < 10) {
                            tableContainer.style.height = '400px';
                        } else {
                            tableContainer.style.height = '600px';
                        }

                        // Force table redraw to fill the space
                        window.burndownTable.redraw(true);
                    } catch (e) {
                        debug("Error in delayed table height adjustment: " + e.message);
                    }
                }, 200); // Short delay to ensure table is rendered
            } catch (error) {
                debug("Error adjusting table height: " + error.message);
            }
        }

        // Update the data summary
        function updateDataSummary() {
            const summaryElement = document.getElementById('data-summary-text');

            try {
                // Get selected sprint
                const selectedSprint = document.getElementById('sprintSelector').value;

                // Filter stories by sprint
                const filteredStories = {};
                let storyCount = 0;
                let taskCount = 0;
                let storyPointsTotal = 0;

                for (const storyId in projectData) {
                    const story = projectData[storyId];
                    if (!story) continue;

                    const storyData = story.__story_data || {};

                    // Check if story is in the selected sprint
                    if (storyData.Sprint === selectedSprint) {
                        storyCount++;

                        // Add story points
                        storyPointsTotal += storyData.Estimation || 0;

                        // Count tasks (all keys except __story_data)
                        for (const key in story) {
                            if (key !== '__story_data') {
                                taskCount++;
                            }
                        }
                    }
                }

                summaryElement.textContent = `${storyCount} stories, ${taskCount} tasks, ${storyPointsTotal} total story points in ${selectedSprint}`;
            } catch (error) {
                summaryElement.innerHTML = `<span class="error">Error: ${error.message}</span>`;
            }
        }

        // Check if a task was reopened after a certain date
        function wasReopenedAfter(task, date) {
            if (!task || !task.timelineItems || !task.timelineItems.nodes) return false;

            let lastEvent = null;

            // Normalize the comparison date to midnight
            const compareDate = new Date(date);
            compareDate.setHours(0, 0, 0, 0);

            // Loop through timeline events to find the last event before the given date
            for (const event of task.timelineItems.nodes) {
                if (!event || !event.createdAt) continue;

                const eventDate = new Date(event.createdAt);
                eventDate.setHours(0, 0, 0, 0);

                if (eventDate <= compareDate) {
                    lastEvent = event;
                }
            }

            // If the last event is a reopened event, the task was reopened
            return lastEvent && lastEvent.__typename === 'ReopenedEvent';
        }

        // Function to check if a task was closed before a certain date and not reopened
        function isClosedAsOf(task, date) {
            if (!task || !task.closed || !task.closedAt) return false;

            // Create proper date objects and normalize both to midnight UTC
            const closedDate = new Date(task.closedAt);
            closedDate.setHours(0, 0, 0, 0);

            // Make sure we're comparing dates at the same time (midnight)
            const compareDate = new Date(date);
            compareDate.setHours(0, 0, 0, 0);

            if (closedDate > compareDate) return false;

            // Check if it was reopened after being closed
            if (wasReopenedAfter(task, compareDate)) return false;

            return true;
        }

        // Function to calculate burndown data based on algorithm
        function calculateBurndown(startDate, endDate, algorithm) {
            try {
                // Get selected sprint
                const selectedSprint = document.getElementById('sprintSelector').value;

                // Convert string dates to Date objects and normalize to midnight
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);

                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0); // Change to midnight instead of 23:59:59

                // Generate array of dates between start and end (at midnight)
                const dateRange = [];
                const currentDate = new Date(start);
                while (currentDate <= end) {
                    // Create a new date object to avoid reference issues
                    dateRange.push(new Date(currentDate.getTime()));
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                // Optional: Debug the date range (uncomment if needed)
                // debugDates(dateRange);

                // Algorithm 1: Stories with percentage-based completion
                if (algorithm === 1) {
                    return calculateStoryPercentageBurndown(dateRange, selectedSprint);
                }
                // Algorithm 2: Task-based burndown
                else if (algorithm === 2) {
                    return calculateTaskBasedBurndown(dateRange, selectedSprint);
                }
                // Algorithm 3: Pipeline-based burndown
                else if (algorithm === 3) {
                    return calculatePipelineBasedBurndown(dateRange, selectedSprint);
                }
            } catch (error) {
                debug("Error in calculateBurndown: " + error.message);
                return null;
            }

            return null;
        }

        // Calculate pipeline-based burndown
        function calculatePipelineBasedBurndown(dateRange, selectedSprint) {
            try {
                const tasksInfo = {};
                let totalPoints = 0;

                // Build pipeline weight map
                const pipelineWeights = {};
                (pipelineConfig || []).forEach(([name, weight]) => {
                    pipelineWeights[String(name).toLowerCase()] = weight;
                });

                // Process each story
                for (const storyId in projectData) {
                    const storyData = projectData[storyId];
                    if (!storyData) continue;

                    if (!storyData.__story_data) continue;

                    const storyInfo = storyData.__story_data;

                    if (storyInfo.Sprint !== selectedSprint) continue;

                    const tasks = {};
                    for (const taskId in storyData) {
                        if (taskId !== "__story_data" && storyData[taskId]) {
                            tasks[taskId] = storyData[taskId];
                        }
                    }

                    const taskEntries = Object.keys(tasks).length ? tasks : { [storyId]: storyInfo };

                    for (const taskId in taskEntries) {
                        const task = taskEntries[taskId];
                        const taskEstimation = task.Estimation || 0;
                        if (taskEstimation === 0) continue;

                        tasksInfo[taskId] = {
                            task,
                            estimation: taskEstimation,
                            status: (task.Status || task.status || "").toLowerCase()
                        };

                        totalPoints += taskEstimation;
                    }
                }

                if (totalPoints === 0) totalPoints = 100;

                const burndownData = [];

                for (const date of dateRange) {
                    let remainingPoints = 0;
                    const openTasksInfo = [];

                    for (const taskId in tasksInfo) {
                        const taskInfo = tasksInfo[taskId];
                        const task = taskInfo.task;

                        let weight = 0;
                        if (isClosedAsOf(task, date)) {
                            weight = 1.0;
                        } else {
                            weight = pipelineWeights[taskInfo.status] ?? 0;
                        }

                        const burned = taskInfo.estimation * weight;
                        const remaining = taskInfo.estimation - burned;
                        remainingPoints += Math.max(0, remaining);

                        if (remaining > 0) {
                            openTasksInfo.push({
                                id: taskId,
                                title: task.title || "Unknown",
                                estimation: taskInfo.estimation,
                                status: taskInfo.status
                            });
                        }
                    }

                    burndownData.push({
                        date: date.toISOString().split('T')[0],
                        remainingPoints: remainingPoints,
                        totalPoints: totalPoints,
                        openTasksInfo: openTasksInfo
                    });
                }

                return burndownData;
            } catch (error) {
                debug("Error in calculatePipelineBasedBurndown: " + error.message);
                debug(error.stack);
                return null;
            }
        }

        // Calculate story percentage-based burndown
        function calculateStoryPercentageBurndown(dateRange, selectedSprint) {
            try {
                // Calculate total story points
                let totalPoints = 0;
                const storyPoints = {};

                // Process each story
                for (const storyId in projectData) {
                    const storyData = projectData[storyId];
                    if (!storyData) continue;

                    // Get story info
                    const storyInfo = storyData.__story_data || {};
                    if (!storyInfo || !storyInfo.Estimation) continue;

                    // Skip if not in the selected sprint
                    if (storyInfo.Sprint !== selectedSprint) continue;

                    // Add to total points
                    totalPoints += storyInfo.Estimation;

                    // Store story information
                    const tasks = {};
                    for (const taskId in storyData) {
                        if (taskId !== "__story_data" && storyData[taskId]) {
                            tasks[taskId] = storyData[taskId];
                        }
                    }

                    storyPoints[storyId] = {
                        id: storyId,
                        title: storyInfo.title || "Unknown",
                        estimation: storyInfo.Estimation,
                        subTasks: (storyInfo.subIssuesSummary ? storyInfo.subIssuesSummary.total : 0) || Object.keys(tasks).length,
                        completedTasks: storyInfo.subIssuesSummary ? storyInfo.subIssuesSummary.completed : 0,
                        tasks: tasks
                    };
                }

                // If no points, default to 100 to show something
                if (totalPoints === 0) {
                    totalPoints = 100;
                }

                // Calculate burndown for each date
                const burndownData = [];

                for (const date of dateRange) {
                    let remainingPoints = totalPoints;
                    const completedStoriesInfo = [];

                    // Process each story
                    for (const storyId in storyPoints) {
                        const story = storyPoints[storyId];

                        // Calculate completed tasks as of this date
                        let completedCount = 0;

                        for (const taskId in story.tasks) {
                            const task = story.tasks[taskId];
                            if (isClosedAsOf(task, date)) {
                                completedCount++;
                            }
                        }

                        // Calculate percentage completed
                        let percentComplete = 0;
                        if (story.subTasks > 0) {
                            percentComplete = (completedCount / story.subTasks) * 100;
                        }

                        // Calculate points burned
                        const pointsBurned = story.estimation * (percentComplete / 100);
                        remainingPoints -= pointsBurned;

                        // Record story information
                        completedStoriesInfo.push({
                            id: story.id,
                            title: story.title,
                            percentComplete: percentComplete.toFixed(1),
                            burnedPoints: pointsBurned.toFixed(1),
                            estimation: story.estimation,
                            completedTasks: completedCount,
                            totalTasks: story.subTasks
                        });
                    }

                    burndownData.push({
                        date: date.toISOString().split('T')[0],
                        remainingPoints: Math.max(0, remainingPoints),
                        totalPoints: totalPoints,
                        completedStoriesInfo: completedStoriesInfo
                    });
                }

                return burndownData;
            } catch (error) {
                debug("Error in calculateStoryPercentageBurndown: " + error.message);
                debug(error.stack);
                return null;
            }
        }

        // Calculate task-based burndown
        function calculateTaskBasedBurndown(dateRange, selectedSprint) {
            try {
                // Collect all tasks with their estimations
                const tasksInfo = {};
                let totalPoints = 0;

                // Process each story
                for (const storyId in projectData) {
                    const storyData = projectData[storyId];
                    if (!storyData) continue;

                    // Skip if no story data
                    if (!storyData.__story_data) continue;

                    const storyInfo = storyData.__story_data;

                    // Skip if not in the selected sprint
                    if (storyInfo.Sprint !== selectedSprint) continue;

                    const storyEstimation = storyInfo.Estimation || 0;

                    // Get all tasks for this story
                    const tasks = {};
                    for (const taskId in storyData) {
                        if (taskId !== "__story_data" && storyData[taskId]) {
                            tasks[taskId] = storyData[taskId];
                        }
                    }

                    const taskCount = Object.keys(tasks).length;

                    // Calculate points per task
                    const pointsPerTask = taskCount > 0 ? storyEstimation / taskCount : 0;

                    // Process each task
                    for (const taskId in tasks) {
                        const task = tasks[taskId];
                        const taskEstimation = task.Estimation || pointsPerTask;

                        // Store task info
                        tasksInfo[taskId] = {
                            id: taskId,
                            title: task.title || "Unknown",
                            parentId: storyId,
                            parentTitle: storyInfo.title || "Unknown",
                            createdAt: task.createdAt || Date.now(),
                            closedAt: task.closedAt,
                            closed: task.closed || false,
                            timelineItems: task.timelineItems || { nodes: [] },
                            estimation: taskEstimation
                        };

                        totalPoints += taskEstimation;
                    }
                }

                // If no points, default to 100 to show something
                if (totalPoints === 0) {
                    totalPoints = 100;
                }

                // Calculate burndown for each date
                const burndownData = [];

                for (const date of dateRange) {
                    let remainingPoints = 0;
                    const openTasksInfo = [];

                    // Process each task
                    for (const taskId in tasksInfo) {
                        const task = tasksInfo[taskId];
                        
                        // Convert to date objects for comparison
                        const taskCreatedDate = new Date(task.createdAt);
                        const taskCreated = taskCreatedDate <= date;

                        // Check if the task is open on this date (considering reopened status)
                        const taskOpen = !isClosedAsOf(task, date);

                        // If task is created and still open on this date, add its points
                        if (taskCreated && taskOpen) {
                            remainingPoints += task.estimation;
                            openTasksInfo.push({
                                id: task.id,
                                title: task.title,
                                parentId: task.parentId,
                                parentTitle: task.parentTitle,
                                estimation: task.estimation.toFixed(1)
                            });
                        }
                    }

                    burndownData.push({
                        date: date.toISOString().split('T')[0],
                        remainingPoints: remainingPoints,
                        totalPoints: totalPoints,
                        openTasksInfo: openTasksInfo
                    });
                }

                return burndownData;
            } catch (error) {
                debug("Error in calculateTaskBasedBurndown: " + error.message);
                debug(error.stack);
                return null;
            }
        }

        // Function to update the chart
        function updateChart() {
            try {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                const algorithm = parseInt(document.querySelector('input[name="algorithm"]:checked').value);

                // Calculate burndown data
                const burndownData = calculateBurndown(startDate, endDate, algorithm);

                if (!burndownData || burndownData.length === 0) {
                    document.getElementById('chart').innerHTML = 'No data available for the selected parameters.';
                    return;
                }

                // Store for later use
                currentBurndownData = burndownData;

                // Extract dates and remaining points
                const dates = burndownData.map(d => d.date);
                const remainingPoints = burndownData.map(d => d.remainingPoints);
                const totalPoints = burndownData[0].totalPoints;

                // Calculate ideal burndown - only fixed points at start and end
                const idealBurndown = [];
                const daysCount = burndownData.length;

                if (daysCount > 1) {
                    // Initial points
                    idealBurndown.push(totalPoints);

                    // Middle points (if there are more than 2 days)
                    for (let i = 1; i < daysCount - 1; i++) {
                        const idealRemaining = totalPoints - (i * (totalPoints / (daysCount - 1)));
                        idealBurndown.push(Math.max(0, idealRemaining));
                    }

                    // Final point is always 0
                    if (daysCount > 1) {
                        idealBurndown.push(0);
                    }
                } else {
                    // If only one day, just show the starting points
                    idealBurndown.push(totalPoints);
                }

                // Check if date range includes current day
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];

                // Create Plotly chart
                const plotData = [
                    {
                        x: dates,
                        y: remainingPoints,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Remaining Points',
                        line: {
                            color: '#1f77b4',
                            width: 3
                        },
                        marker: {
                            size: 8,
                            color: '#1f77b4'
                        }
                    },
                    {
                        x: dates,
                        y: idealBurndown,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Ideal Burndown',
                        line: {
                            color: '#ff7f0e',
                            width: 2,
                            dash: 'dash'
                        }
                    }
                ];

                // Add vertical line for today if within the date range
                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);

                // Normalize date objects for comparison
                startDateObj.setHours(0, 0, 0, 0);
                endDateObj.setHours(0, 0, 0, 0);

                if (today >= startDateObj && today <= endDateObj) {
                    plotData.push({
                        x: [todayStr, todayStr],
                        y: [0, totalPoints * 1.1], // Extend slightly above the chart
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Today',
                        line: {
                            color: 'red',
                            width: 2,
                            dash: 'solid'
                        },
                        hoverinfo: 'name'
                    });
                }

                const layout = {
                    title: 'Sprint Burndown Chart',
                    xaxis: {
                        title: 'Date',
                        tickangle: -45
                    },
                    yaxis: {
                        title: 'Story Points Remaining',
                        rangemode: 'nonnegative'
                    },
                    hovermode: 'closest',
                    legend: {
                        orientation: 'h',
                        yanchor: 'bottom',
                        y: 1.02,
                        xanchor: 'right',
                        x: 1
                    },
                    margin: { t: 50, r: 50, l: 60, b: 80 }
                };

                const config = {
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    displaylogo: false
                };

                Plotly.newPlot('chart', plotData, layout, config);

                // Add click event to show details of tasks/stories for the selected date
                document.getElementById('chart').on('plotly_click', function(data) {
                    handlePlotClick(data);
                });
            } catch (error) {
                debug("Error in updateChart: " + error.message);
                debug(error.stack);
                document.getElementById('chart').innerHTML = `<div class="error">Error rendering chart: ${error.message}</div>`;
            }
        }

        // Handle plot click event separately with better error handling
        function handlePlotClick(data) {
            try {
                if (!data || !data.points || data.points.length === 0) {
                    debug("No valid data points in click event");
                    return;
                }

                const point = data.points[0];
                const pointIndex = point.pointIndex;

                // Make sure we have the current burn down data
                if (!currentBurndownData || pointIndex >= currentBurndownData.length) {
                    debug("No valid burndown data for this point");
                    return;
                }

                const clickedDate = currentBurndownData[pointIndex].date;
                const dateData = currentBurndownData[pointIndex];
                const algorithm = parseInt(document.querySelector('input[name="algorithm"]:checked').value);

                updateTable(dateData, algorithm, clickedDate);
            } catch (error) {
                debug("Error in plot click handler: " + error.message);
                debug(error.stack);
            }
        }

        // Function to update the table with details for the selected date
        function updateTable(dateData, algorithm, clickedDate) {
            try {
                // Set table title regardless of content
                document.getElementById('tableTitle').textContent = 
                    algorithm === 1 
                    ? `Stories Status on ${clickedDate}` 
                    : `Open Tasks on ${clickedDate}`;

                let columns, data;

                // Prepare table data
                if (algorithm === 1) {
                    if (!dateData.completedStoriesInfo) {
                        // If no story info, create empty table
                        columns = [
                            {title: "Story", field: "title", width: "40%"},
                            {title: "Est.", field: "estimation", hozAlign: "right", width: "10%"},
                            {title: "% Complete", field: "percentComplete", hozAlign: "right", width: "15%"},
                            {title: "Burned", field: "burnedPoints", hozAlign: "right", width: "15%"},
                            {title: "Tasks", field: "tasksProgress", hozAlign: "center", width: "20%"}
                        ];
                        data = [];
                    } else {
                        columns = [
                            {title: "Story", field: "title", width: "40%", formatter: "textarea", formatterParams: {height: "auto"}},
                            {title: "Est.", field: "estimation", hozAlign: "right", width: "10%"},
                            {title: "% Complete", field: "percentComplete", hozAlign: "right", width: "15%"},
                            {title: "Burned", field: "burnedPoints", hozAlign: "right", width: "15%"},
                            {title: "Tasks", field: "tasksProgress", hozAlign: "center", width: "20%"}
                        ];

                        data = dateData.completedStoriesInfo.map(story => ({
                            title: story.title || "",
                            estimation: story.estimation || 0,
                            percentComplete: (story.percentComplete || "0") + "%",
                            burnedPoints: story.burnedPoints || 0,
                            tasksProgress: `${story.completedTasks || 0} / ${story.totalTasks || 0}`
                        }));
                    }
                } else {
                    if (!dateData.openTasksInfo) {
                        // If no task info, create empty table
                        columns = [
                            {title: "Task", field: "title", width: "50%"},
                            {title: "Parent Story", field: "parentTitle", width: "40%"},
                            {title: "Est.", field: "estimation", hozAlign: "right", width: "10%"}
                        ];
                        data = [];
                    } else {
                        columns = [
                            {title: "Task", field: "title", width: "50%", formatter: "textarea", formatterParams: {height: "auto"}},
                            {title: "Parent Story", field: "parentTitle", width: "40%", formatter: "textarea", formatterParams: {height: "auto"}},
                            {title: "Est.", field: "estimation", hozAlign: "right", width: "10%"}
                        ];

                        data = dateData.openTasksInfo.map(task => ({
                            title: task.title || "",
                            parentTitle: task.parentTitle || "",
                            estimation: task.estimation || 0
                        }));
                    }
                }

                // Make sure we destroy any existing table first
                if (window.burndownTable) {
                    try {
                        window.burndownTable.destroy();
                    } catch (e) {
                        // Ignore any errors in destruction
                        debug("Error destroying table: " + e.message);
                    }
                }

                // Clear the table container explicitly
                document.getElementById('table').innerHTML = '';

                // Create a new table with the data
                window.burndownTable = new Tabulator("#table", {
                    height: data.length ? "100%" : "300px", // Ensure minimum height
                    layout: "fitColumns",
                    data: data,
                    columns: columns, 
                    pagination: true,
                    paginationSize: 15,
                    paginationSizeSelector: [10, 15, 20, 50, 100],
                    paginationButtonCount: 5,
                    movableColumns: true,
                    resizableColumns: true,
                    responsiveLayout: "collapse",
                    placeholder: "No data available for this date. Click another point on the chart.",
                    virtualDomBuffer: 300,
                    layoutColumnsOnNewData: true,
                    renderComplete: function() {
                        // This ensures the table is fully rendered before adjustment
                        adjustTableHeight();
                    },
                    columnDefaults: {
                        vertAlign: "middle",
                        resizable: true,
                        headerSort: true
                    }
                });

                // We don't call adjustTableHeight() directly here anymore,
                // it's called in the renderComplete callback above
            } catch (error) {
                debug("Error in updateTable: " + error.message);
                debug(error.stack);
                document.getElementById('tableTitle').textContent = "Error loading table data";
                document.getElementById('table').innerHTML = '<div class="error">Failed to load table data. See debug panel for details.</div>';
            }
        }

        // Initialize the chart when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            try {
                // Set date values from URL parameters if provided
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('start')) {
                    document.getElementById('startDate').value = urlParams.get('start');
                }
                if (urlParams.has('end')) {
                    document.getElementById('endDate').value = urlParams.get('end');
                }
                if (urlParams.has('sprint')) {
                    const sprint = urlParams.get('sprint');
                    const sprintSelector = document.getElementById('sprintSelector');
                    // Set the selected sprint if it exists in the options
                    for (let i = 0; i < sprintSelector.options.length; i++) {
                        if (sprintSelector.options[i].value === sprint) {
                            sprintSelector.selectedIndex = i;
                            break;
                        }
                    }
                }
                if (urlParams.has('alg')) {
                    const alg = parseInt(urlParams.get('alg'));
                    if (alg === 1 || alg === 2) {
                        document.querySelector(`input[name="algorithm"][value="${alg}"]`).checked = true;
                    }
                }

                // Update data summary based on sprint selection
                updateDataSummary();

                // Check if data is available
                if (!projectData || Object.keys(projectData).length === 0) {
                    document.getElementById('chart').innerHTML = '<div class="error">No project data available. Please check the data format.</div>';
                    return;
                }

                // Enable debug mode for troubleshooting
                // Uncomment to see debug information
                // document.getElementById('debug').style.display = 'block';

                // Initialize chart
                updateChart();

                // Add event listeners
                document.getElementById('updateButton').addEventListener('click', updateChart);
                document.getElementById('sprintSelector').addEventListener('change', function() {
                    updateDataSummary();
                    updateChart();
                });
                document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
                    radio.addEventListener('change', updateChart);
                });

                // Add window resize event listener for table responsiveness
                window.addEventListener('resize', function() {
                    if (window.burndownTable) {
                        window.burndownTable.redraw();
                        // Don't call adjustTableHeight here to avoid the error
                    }
                });

                // Add date debugging button event listener (for troubleshooting)
                document.getElementById('debugDatesButton').addEventListener('click', function() {
                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;

                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);

                    const end = new Date(endDate);
                    end.setHours(0, 0, 0, 0);

                    const dateElement = document.getElementById('dateDebug');
                    dateElement.style.display = 'block';
                    dateElement.innerHTML = '';

                    dateElement.innerHTML += `<p>Start date: ${start.toISOString()} (${start.toDateString()})</p>`;
                    dateElement.innerHTML += `<p>End date: ${end.toISOString()} (${end.toDateString()})</p>`;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dateElement.innerHTML += `<p>Today: ${today.toISOString()} (${today.toDateString()})</p>`;

                    // Show date range
                    let currentDate = new Date(start);
                    let i = 0;
                    dateElement.innerHTML += '<p>Date range:</p><ul>';
                    while (currentDate <= end) {
                        dateElement.innerHTML += `<li>Date ${i}: ${new Date(currentDate).toISOString()} (${new Date(currentDate).toDateString()})</li>`;
                        currentDate.setDate(currentDate.getDate() + 1);
                        i++;
                    }
                    dateElement.innerHTML += '</ul>';
                });

                // For debugging - uncomment to show data structure
                // debug("Project Data Structure:");
                // debug(projectData);
            } catch (error) {
                debug("Error initializing chart: " + error.message);
                debug(error.stack);
                document.getElementById('chart').innerHTML = `<div class="error">Error initializing chart: ${error.message}</div>`;
            }
        });
    </script>
</body>
</html>"""

    def _get_pipeline_config(self):
        return Configuration.PIPELINE

    def _serialize_story_data(self, story_data):
        """
        Convert Issue objects to a JSON-friendly structure expected by the JS.
        """
        if not isinstance(story_data, dict):
            return {}

        serialized = {}
        for story_id, story_content in story_data.items():
            if not isinstance(story_content, dict):
                continue

            story_info = story_content.get("__story_data")
            if not story_info:
                continue

            serialized_story = {
                "__story_data": self._serialize_issue(story_info)
            }

            for task_id, task in story_content.items():
                if task_id == "__story_data" or not task:
                    continue
                serialized_story[task_id] = self._serialize_issue(task)

            serialized[story_id] = serialized_story

        return serialized

    def _serialize_issue(self, issue):
        """
        Serialize a single Issue-like object to the legacy JS shape.
        """
        def _to_iso(dt):
            if not dt:
                return None
            if isinstance(dt, datetime.datetime):
                return dt.isoformat()
            return str(dt)

        return {
            "id": getattr(issue, "id", ""),
            "title": getattr(issue, "title", ""),
            "state": str(getattr(issue, "state", "")),
            "createdAt": _to_iso(getattr(issue, "created_at", None)),
            "closedAt": _to_iso(getattr(issue, "closed_at", None)),
            "closed": getattr(issue, "closed", False),
            "issueType": getattr(issue, "issue_type", {}),
            "parent": getattr(issue, "parent", None),
            "labels": {"nodes": [{"name": l} for l in (getattr(issue, "labels", []) or [])]},
            "assignees": {"nodes": [{"login": a} for a in (getattr(issue, "assignees", []) or [])]},
            "timelineItems": getattr(issue, "timeline_items", {"nodes": []}),
            "subIssues": getattr(issue, "sub_issues", {"nodes": []}),
            "subIssuesSummary": getattr(issue, "sub_issues_summary", {}),
            # Legacy keys expected by JS
            "Sprint": getattr(issue, "sprint", None),
            "Estimation": getattr(issue, "estimation", None),
            "Status": getattr(issue, "status", None),
            "SprintStartDate": getattr(issue, "sprint_start_date", None),
            "SprintDuration": getattr(issue, "sprint_duration", None)
        }