document.addEventListener("DOMContentLoaded", async function () {
    const user = PMS.requireUser();
    if (!user) {
        return;
    }

    try {
        const refreshedUser = await PMS.refreshCurrentUser();
        if (refreshedUser) {
            Object.assign(user, refreshedUser);
        }

        const [allProjects, allTasks, allMembers] = await Promise.all([
            PMS.fetchCollection("projects"),
            PMS.fetchCollection("tasks"),
            PMS.fetchCollection("teamMembers")
        ]);
        const projects = PMS.accessibleProjects(allProjects, user);
        const projectIds = new Set(projects.map((project) => String(project.id)));
        const tasks = allTasks.filter((task) => projectIds.has(String(task.projectId)));
        const members = allMembers.filter((member) =>
            Array.isArray(member.projectIds) &&
            member.projectIds.some((id) => projectIds.has(String(id)))
        );
        const completed = tasks.filter((task) => task.status === "Completed").length;
        const todo = tasks.filter((task) => task.status === "To Do" || task.status === "Pending").length;
        const inProgress = tasks.filter((task) => task.status === "In Progress").length;

        document.getElementById("userName").textContent = user.name || "User";
        document.querySelector(".dashboard-heading h2").textContent =
            PMS.isManager(user) ? "Overall Dashboard" : "My Dashboard";
        document.querySelector(".dashboard-box p").textContent =
            PMS.isManager(user)
                ? "Overview across all projects."
                : "Overview across projects assigned to you.";
        document.getElementById("totalProjects").textContent = String(projects.length);
        document.getElementById("totalTasks").textContent = String(tasks.length);
        document.getElementById("completedTasks").textContent = String(completed);
        document.getElementById("totalMembers").textContent =
            String(new Set(members.map((member) => String(member.id))).size);
        document.getElementById("todoTasks").textContent = String(todo);
        document.getElementById("progressTasks").textContent = String(inProgress);
        document.getElementById("doneTasks").textContent = String(completed);

        const recentProjects = document.getElementById("recentProjects");
        recentProjects.replaceChildren();
        const latestProjects = [...projects].slice(-5).reverse();
        if (latestProjects.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-message";
            emptyMessage.textContent = "No assigned projects available.";
            recentProjects.appendChild(emptyMessage);
        } else {
            latestProjects.forEach((project) => {
                const item = document.createElement("a");
                item.className = "project-item";
                item.href = PMS.urlForPage("project-dashboard.html", project.id);
                const name = document.createElement("span");
                name.className = "project-name";
                name.textContent = project.projectName || "Untitled project";
                const status = document.createElement("span");
                status.className = "project-status";
                status.textContent = project.status || "Not Started";
                item.append(name, status);
                recentProjects.appendChild(item);
            });
        }

    } catch (error) {
        console.error("Dashboard error:", error);
        window.alert("Unable to load dashboard data. Please make sure JSON Server is running.");
    }
});
