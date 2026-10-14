document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://localhost:3000/projects";
    const modal = document.getElementById("projectModal");
    const openBtn = document.getElementById("openProjectModal");
    const closeBtn = document.getElementById("closeProjectModal");
    const projectForm = document.getElementById("projectForm");
    const projectGrid = document.getElementById("projectGrid");
    const projectSearch = document.getElementById("projectSearch");
    const projectCount = document.getElementById("allProjectCount");
    const modalTitle = document.getElementById("projectModalTitle");
    const submitLabel = projectForm.querySelector(".submit-project-btn span");
    const filters = Array.from(document.querySelectorAll(".project-filter"));

    let projects = [];
    let activeStatus = "all";
    let editProjectId = null;

    function formatDate(value) {
        if (!value) {
            return "Not set";
        }

        const parts = value.split("-").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return value;
        }

        return new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(parts[0], parts[1] - 1, parts[2]));
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function createMetaItem(icon, label, value) {
        const item = createElement("div", "project-meta-item");
        const iconElement = createElement("i", `fa-regular ${icon}`);
        iconElement.setAttribute("aria-hidden", "true");

        const copy = createElement("div", "project-meta-copy");
        copy.append(
            createElement("strong", "", label),
            createElement("span", "", value)
        );
        item.append(iconElement, copy);
        return item;
    }

    function createActionButton(icon, label, extraClass, handler) {
        const button = createElement(
            "button",
            `project-action-btn${extraClass ? ` ${extraClass}` : ""}`
        );
        button.type = "button";
        button.setAttribute("aria-label", label);
        button.title = label;

        const iconElement = createElement("i", `fa-solid ${icon}`);
        iconElement.setAttribute("aria-hidden", "true");
        button.appendChild(iconElement);
        button.addEventListener("click", handler);
        return button;
    }

    function openModal(project) {
        projectForm.reset();
        editProjectId = project ? project.id : null;

        if (project) {
            document.getElementById("projectName").value = project.projectName || "";
            document.getElementById("members").value = project.members || "";
            document.getElementById("description").value = project.description || "";
            document.getElementById("startDate").value = project.startDate || "";
            document.getElementById("deadline").value = project.deadline || "";
            document.getElementById("status").value = project.status || "";
            modalTitle.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i> Edit Project';
            submitLabel.textContent = "Save Changes";
        } else {
            modalTitle.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add New Project';
            submitLabel.textContent = "Add Project";
        }

        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        document.getElementById("projectName").focus();
    }

    function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = "";
        projectForm.reset();
        editProjectId = null;
        modalTitle.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add New Project';
        submitLabel.textContent = "Add Project";
    }

    function createProjectCard(project) {
        const card = createElement("article", "project-card");
        const top = createElement("div", "project-card-top");
        const status = createElement("span", "project-status", project.status || "Not Started");
        const statusClasses = {
            "In Progress": "in-progress",
            "Not Started": "not-started",
            "Completed": "completed"
        };
        status.classList.add(statusClasses[project.status] || "not-started");
        top.appendChild(status);

        const actions = createElement("div", "project-card-actions");
        actions.append(
            createActionButton("fa-pen", `Edit ${project.projectName}`, "", function () {
                openModal(project);
            }),
            createActionButton("fa-trash", `Delete ${project.projectName}`, "delete", async function () {
                await deleteProject(project);
            })
        );
        top.appendChild(actions);

        const titleRow = createElement("div", "project-card-title-row");
        const projectIcon = createElement("span", "project-card-icon");
        const icon = createElement("i", "fa-solid fa-folder-open");
        icon.setAttribute("aria-hidden", "true");
        projectIcon.appendChild(icon);
        titleRow.append(projectIcon, createElement("h2", "project-card-title", project.projectName || "Untitled project"));

        const description = createElement(
            "p",
            "project-card-description",
            project.description || "No description provided."
        );
        const divider = createElement("hr", "project-card-divider");
        const footer = createElement("div", "project-card-footer");
        footer.append(
            createMetaItem("fa-calendar", "Timeline", `${formatDate(project.startDate)} – ${formatDate(project.deadline)}`),
            createMetaItem("fa-users", "Team", project.members ? project.members : "Not assigned")
        );

        card.append(top, titleRow, description, divider, footer);
        return card;
    }

    function renderProjects() {
        const searchTerm = projectSearch.value.trim().toLocaleLowerCase();
        const visibleProjects = projects.filter(function (project) {
            const matchesStatus = activeStatus === "all" || project.status === activeStatus;
            const searchableText = [
                project.projectName,
                project.description,
                project.members,
                project.status,
                project.startDate,
                project.deadline
            ].filter(Boolean).join(" ").toLocaleLowerCase();

            return matchesStatus && searchableText.includes(searchTerm);
        });

        projectCount.textContent = String(projects.length);
        projectGrid.replaceChildren();

        if (visibleProjects.length === 0) {
            const empty = createElement("div", "project-empty-state");
            const icon = createElement("i", `fa-regular ${projects.length ? "fa-folder-open" : "fa-folder-open"}`);
            icon.setAttribute("aria-hidden", "true");
            const title = projects.length ? "No matching projects" : "No projects yet";
            const message = projects.length
                ? "Try another search or choose a different status filter."
                : "Add a project to start organizing your team's work.";
            empty.append(icon, createElement("strong", "", title), createElement("p", "", message));
            projectGrid.appendChild(empty);
            return;
        }

        visibleProjects.forEach(function (project) {
            projectGrid.appendChild(createProjectCard(project));
        });
    }

    async function deleteProject(project) {
        if (!window.confirm(`Delete "${project.projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${project.id}`, { method: "DELETE" });
            if (!response.ok) {
                throw new Error(`Unable to delete project (${response.status})`);
            }

            projects = projects.filter(function (item) {
                return item.id !== project.id;
            });
            renderProjects();
        } catch (error) {
            console.error("Unable to delete project:", error);
            window.alert("Unable to delete project. Please try again.");
        }
    }

    async function loadProjects() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Unable to load projects (${response.status})`);
            }

            const records = await response.json();
            if (!Array.isArray(records)) {
                throw new Error("The projects response was not a list.");
            }

            projects = records;
            renderProjects();
        } catch (error) {
            console.error("Unable to load projects:", error);
            projectGrid.replaceChildren();
            const empty = createElement("div", "project-empty-state");
            const icon = createElement("i", "fa-solid fa-triangle-exclamation");
            icon.setAttribute("aria-hidden", "true");
            const message = createElement("p", "", "Check that JSON Server is running, then try again.");
            const retry = createElement("button", "add-project-btn", "Try again");
            retry.type = "button";
            retry.addEventListener("click", loadProjects);
            empty.append(icon, createElement("strong", "", "Projects couldn't be loaded"), message, retry);
            projectGrid.appendChild(empty);
        }
    }

    openBtn.addEventListener("click", function () {
        openModal(null);
    });

    closeBtn.addEventListener("click", closeModal);

    window.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    window.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.style.display === "flex") {
            closeModal();
        }
    });

    filters.forEach(function (filter) {
        filter.addEventListener("click", function () {
            activeStatus = filter.dataset.status;
            filters.forEach(function (button) {
                const isActive = button === filter;
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });
            renderProjects();
        });
    });

    projectSearch.addEventListener("input", renderProjects);

    projectForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const project = {
            projectName: document.getElementById("projectName").value.trim(),
            members: document.getElementById("members").value.trim(),
            description: document.getElementById("description").value.trim(),
            startDate: document.getElementById("startDate").value,
            deadline: document.getElementById("deadline").value,
            status: document.getElementById("status").value
        };

        if (project.deadline < project.startDate) {
            window.alert("Deadline cannot be before the start date.");
            return;
        }

        const submitButton = projectForm.querySelector(".submit-project-btn");
        submitButton.disabled = true;

        try {
            const isEditing = editProjectId !== null;
            const response = await fetch(
                isEditing ? `${API_URL}/${editProjectId}` : API_URL,
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(project)
                }
            );

            if (!response.ok) {
                throw new Error(`Unable to ${isEditing ? "update" : "add"} project (${response.status})`);
            }

            if (isEditing) {
                projects = projects.map(function (item) {
                    return item.id === editProjectId ? { ...item, ...project } : item;
                });
            } else {
                const newProject = await response.json();
                projects.push(newProject);
            }

            closeModal();
            renderProjects();
        } catch (error) {
            console.error("Unable to save project:", error);
            window.alert("Unable to save project. Please make sure JSON Server is running.");
        } finally {
            submitButton.disabled = false;
        }
    });

    loadProjects();
});
