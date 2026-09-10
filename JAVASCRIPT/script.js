// Dashboard JavaScript

// Get data from local storage
let projects = JSON.parse(localStorage.getItem("projects")) || [];
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let teamMembers = JSON.parse(localStorage.getItem("teamMembers")) || [];

// Get dashboard elements
const totalProjects = document.getElementById("totalProjects");
const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const totalMembers = document.getElementById("totalMembers");

const todoTasks = document.getElementById("todoTasks");
const progressTasks = document.getElementById("progressTasks");
const doneTasks = document.getElementById("doneTasks");

const recentProjects = document.getElementById("recentProjects");

// Update dashboard statistics
function updateStatistics() {

    if (totalProjects) {
        totalProjects.textContent = projects.length;
    }

    if (totalTasks) {
        totalTasks.textContent = tasks.length;
    }

    if (totalMembers) {
        totalMembers.textContent = teamMembers.length;
    }

    // Count completed tasks
    const completed = tasks.filter(function(task) {
        return task.status === "Completed";
    }).length;

    if (completedTasks) {
        completedTasks.textContent = completed;
    }

    // Count pending tasks
    const todo = tasks.filter(function(task) {
        return task.status === "To Do" ||
               task.status === "Pending";
    }).length;

    if (todoTasks) {
        todoTasks.textContent = todo;
    }

    // Count in-progress tasks
    const inProgress = tasks.filter(function(task) {
        return task.status === "In Progress";
    }).length;

    if (progressTasks) {
        progressTasks.textContent = inProgress;
    }

    // Display completed task count
    if (doneTasks) {
        doneTasks.textContent = completed;
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
    const latestProjects = projects.slice(-5).reverse();

    latestProjects.forEach(function(project) {

        const projectItem = document.createElement("div");

        projectItem.classList.add("project-item");

        projectItem.innerHTML = `
            <div>
                <span class="project-name">
                    ${project.name}
                </span>
            </div>

            <span class="project-status">
                ${project.status || "Not Started"}
            </span>
        `;

        recentProjects.appendChild(projectItem);
    });
}

// Refresh dashboard
function refreshDashboard() {

    projects = JSON.parse(
        localStorage.getItem("projects")
    ) || [];

    tasks = JSON.parse(
        localStorage.getItem("tasks")
    ) || [];

    teamMembers = JSON.parse(
        localStorage.getItem("teamMembers")
    ) || [];

    updateStatistics();
    displayRecentProjects();
}

// Load dashboard
document.addEventListener("DOMContentLoaded", function() {
    refreshDashboard();
});

// Update dashboard when local storage changes
window.addEventListener("storage", function() {
    refreshDashboard();
});