document.addEventListener("DOMContentLoaded", async function () {
    const user = PMS.requireUser();
    if (!user) {
        return;
    }

    const projectId = PMS.projectIdFromUrl();
    if (!projectId) {
        window.location.replace("projects.html");
        return;
    }

    try {
        const refreshedUser = await PMS.refreshCurrentUser();
        if (refreshedUser) {
            Object.assign(user, refreshedUser);
        }

        const [projects, tasks, teamMembers] = await Promise.all([
            PMS.fetchCollection("projects"),
            PMS.fetchCollection("tasks"),
            PMS.fetchCollection("teamMembers")
        ]);
        const project = projects.find((item) => String(item.id) === projectId);
        if (!PMS.canAccessProject(project, user)) {
            window.location.replace("projects.html");
            return;
        }

        const projectTasks = tasks.filter((task) => String(task.projectId) === projectId);
        const projectMembers = teamMembers.filter((member) =>
            Array.isArray(member.projectIds) && member.projectIds.map(String).includes(projectId)
        );
        const completedTasks = projectTasks.filter((task) => task.status === "Completed").length;
        const inProgressTasks = projectTasks.filter((task) => task.status === "In Progress").length;
        const progress = projectTasks.length
            ? Math.round((completedTasks / projectTasks.length) * 100)
            : 0;

        document.title = `${project.projectName || "Project"} | Workspace`;
        document.getElementById("projectName").textContent = project.projectName || "Untitled project";
        document.getElementById("projectDescription").textContent =
            project.description || "Project dashboard and activity.";
        document.getElementById("projectStatus").textContent = project.status || "Not Started";
        document.getElementById("projectTaskCount").textContent = String(projectTasks.length);
        document.getElementById("projectCompletedCount").textContent = String(completedTasks);
        document.getElementById("projectActiveCount").textContent = String(inProgressTasks);
        document.getElementById("projectMemberCount").textContent = String(projectMembers.length);
        document.getElementById("projectProgressLabel").textContent = `${progress}%`;
        document.querySelector(".workspace-progress-track").setAttribute("aria-valuenow", String(progress));
        document.getElementById("projectProgressBar").style.width = `${progress}%`;
        document.getElementById("workspaceTasksLink").href = PMS.urlForPage("tasks.html", projectId);
        document.getElementById("workspaceTeamLink").href = PMS.urlForPage("team.html", projectId);

        const recentTasks = document.getElementById("workspaceRecentTasks");
        const sortedTasks = [...projectTasks].sort((first, second) =>
            String(second.deadline || "").localeCompare(String(first.deadline || ""))
        ).slice(0, 5);
        if (sortedTasks.length === 0) {
            recentTasks.innerHTML = '<p class="workspace-empty">No tasks are assigned to this project yet.</p>';
        } else {
            recentTasks.replaceChildren(...sortedTasks.map((task) => {
                const row = document.createElement("div");
                row.className = "workspace-task-row";
                const copy = document.createElement("div");
                const name = document.createElement("strong");
                name.textContent = task.taskName || "Untitled task";
                const details = document.createElement("span");
                details.textContent = `${task.assignedTo || "Unassigned"} · ${task.deadline || "No due date"}`;
                copy.append(name, details);
                const status = document.createElement("span");
                status.className = `workspace-task-status ${task.status === "Completed" ? "is-complete" : ""}`;
                status.textContent = task.status || "Unknown";
                row.append(copy, status);
                return row;
            }));
        }

        const membersContainer = document.getElementById("workspaceMembers");
        if (projectMembers.length === 0) {
            membersContainer.innerHTML = '<p class="workspace-empty">No team members are assigned to this project yet.</p>';
        } else {
            membersContainer.replaceChildren(...projectMembers.map((member) => {
                const card = document.createElement("div");
                card.className = "workspace-member";
                const avatar = document.createElement("span");
                avatar.textContent = (member.name || "?").trim().charAt(0).toUpperCase();
                const name = document.createElement("strong");
                name.textContent = member.name || "Unnamed member";
                const role = document.createElement("small");
                role.textContent = member.role || member.department || "Team member";
                card.append(avatar, name, role);
                return card;
            }));
        }
    } catch (error) {
        console.error("Unable to load project workspace:", error);
        document.getElementById("projectName").textContent = "Project workspace unavailable";
        document.getElementById("projectDescription").textContent =
            "Check that JSON Server is running and try again.";
    }
});
