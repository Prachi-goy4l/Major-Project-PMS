
// Get dashboard elements
const totalProjects = document.getElementById("totalProjects");
const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const totalMembers = document.getElementById("totalMembers");

const todoTasks = document.getElementById("todoTasks");
const progressTasks = document.getElementById("progressTasks");
const doneTasks = document.getElementById("doneTasks");

const recentProjects = document.getElementById("recentProjects");

// Dashboard data
let projects = [];
let tasks = [];
let teamMembers = [];


// Load data from JSON Server
async function refreshDashboard() {

    try {

        const projectsResponse = await fetch(
            "http://localhost:3000/projects"
        );

        const tasksResponse = await fetch(
            "http://localhost:3000/tasks"
        );

        const teamMembersResponse = await fetch(
            "http://localhost:3000/teamMembers"
        );


        // Check server responses
        if (
            !projectsResponse.ok ||
            !tasksResponse.ok ||
            !teamMembersResponse.ok
        ) {
            throw new Error("Unable to load dashboard data");
        }


        // Convert response to JSON
        projects = await projectsResponse.json();

        tasks = await tasksResponse.json();

        teamMembers = await teamMembersResponse.json();


        // Update dashboard
        updateStatistics();

        displayRecentProjects();


    } catch (error) {

        console.error("Dashboard error:", error);

        alert(
            "Unable to load dashboard data. " +
            "Please make sure JSON Server is running."
        );
    }
}


// Update dashboard statistics
function updateStatistics() {

    // Total projects
    if (totalProjects) {

        totalProjects.textContent =
            projects.length;
    }


    // Total tasks
    if (totalTasks) {

        totalTasks.textContent =
            tasks.length;
    }


    // Total team members
    if (totalMembers) {

        totalMembers.textContent =
            teamMembers.length;
    }


    // Count completed tasks
    const completed =
        tasks.filter(function(task) {

            return task.status === "Completed";

        }).length;


    if (completedTasks) {

        completedTasks.textContent =
            completed;
    }


    // Count To Do tasks
    const todo =
        tasks.filter(function(task) {

            return task.status === "To Do" ||
                   task.status === "Pending";

        }).length;


    if (todoTasks) {

        todoTasks.textContent =
            todo;
    }


    // Count In Progress tasks
    const inProgress =
        tasks.filter(function(task) {

            return task.status === "In Progress";

        }).length;


    if (progressTasks) {

        progressTasks.textContent =
            inProgress;
    }


    // Display completed task count
    if (doneTasks) {

        doneTasks.textContent =
            completed;
    }
}


// Display recent projects
function displayRecentProjects() {

    if (!recentProjects) {
        return;
    }


    recentProjects.innerHTML = "";


    // Show message when there are no projects
    if (projects.length === 0) {

        recentProjects.innerHTML = `
            <p class="empty-message">
                No projects available.
            </p>
        `;

        return;
    }


    // Get latest five projects
    const latestProjects =
        projects.slice(-5).reverse();


    latestProjects.forEach(function(project) {

        const projectItem =
            document.createElement("div");


        projectItem.classList.add(
            "project-item"
        );


        projectItem.innerHTML = `
            <div>
                <span class="project-name">
                    ${project.projectName}
                </span>
            </div>

            <span class="project-status">
                ${project.status || "Not Started"}
            </span>
        `;


        recentProjects.appendChild(
            projectItem
        );

    });
}


// Load dashboard
document.addEventListener(
    "DOMContentLoaded",
    function() {

        refreshDashboard();

    }
);