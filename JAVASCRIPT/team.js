const PROJECTS_API = "http://localhost:3000/projects";
const TEAM_MEMBERS_API = "http://localhost:3000/teamMembers";
const USERS_API = "http://localhost:3000/users";
const currentUser = PMS.requireUser();
const isManager = PMS.isManager(currentUser);
const workspaceProjectId = PMS.projectIdFromUrl();

// DOM ELEMENTS
const teamForm = document.getElementById("teamForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const roleInput = document.getElementById("role");
const departmentInput = document.getElementById("department");
const projectNameInput = document.getElementById("projectName");
const projectList = document.getElementById("projectList");

const projectSelect = document.getElementById("projectSelect");
const memberFormBox = document.getElementById("memberFormBox");
const addTeamMemberBtn = document.getElementById("addTeamMemberBtn");
const closeFormBtn = document.getElementById("closeFormBtn");
const cancelBtn = document.getElementById("cancelBtn");

const membersContainer = document.getElementById("membersContainer");

const selectedProjectName =
    document.getElementById("selectedProjectName");

const selectedProjectDescription =
    document.getElementById("selectedProjectDescription");

const memberCount = document.getElementById("memberCount");
const membersSubtitle = document.getElementById("membersSubtitle");
const formHeading = document.getElementById("formHeading");

// DATA
let projects = [];
let teamMembers = [];
let users = [];
let selectedProjectId = "";
let editMemberId = null;

if (!isManager) {
    addTeamMemberBtn.hidden = true;
    addTeamMemberBtn.style.display = "none";
    memberFormBox.hidden = true;
}

if (workspaceProjectId) {
    document.getElementById("teamScopeDescription").textContent =
        "Team members assigned to this project.";
    document.querySelector(".team-toolbar").hidden = true;
    document.querySelector(".team-toolbar").style.display = "none";
    document.querySelector('[for="projectName"]').parentElement.hidden = true;
    document.querySelector('[for="projectName"]').parentElement.style.display = "none";
    projectNameInput.disabled = true;
}

// INITIALIZE PAGE
document.addEventListener("DOMContentLoaded", loadTeamMembers);

// EVENT LISTENERS
// Open add-member form
addTeamMemberBtn.addEventListener("click", () => {
    if (!isManager) return;
    editMemberId = null;
    teamForm.reset();
    changeButtonToAdd();

    formHeading.textContent = "Add Team Member";

    const project = findProject(selectedProjectId);

    if (project) {
        projectNameInput.value = getProjectName(project);
    }

    memberFormBox.classList.add("show");

    nameInput.focus();

    memberFormBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
});

// Close form
closeFormBtn.addEventListener("click", closeForm);
cancelBtn.addEventListener("click", closeForm);

// Project dropdown
projectSelect.addEventListener("change", () => {
    if (workspaceProjectId) return;
    selectedProjectId = projectSelect.value;
    renderSelectedProject();
});

// Add or update member
teamForm.addEventListener("submit", saveMember);

// =====================================================
// LOAD PROJECTS AND TEAM MEMBERS
// =====================================================

async function loadTeamMembers() {
    if (!currentUser) return;
    try {
        const refreshedUser = await PMS.refreshCurrentUser();
        if (refreshedUser) {
            Object.assign(currentUser, refreshedUser);
        }
        const [projectsResponse, membersResponse] = await Promise.all([
            fetch(PROJECTS_API),
            fetch(TEAM_MEMBERS_API)
        ]);

        if (!projectsResponse.ok) {
            throw new Error(
                `Projects API error: ${projectsResponse.status}`
            );
        }

        if (!membersResponse.ok) {
            throw new Error(
                `Team Members API error: ${membersResponse.status}`
            );
        }

        const projectsData = await projectsResponse.json();
        const membersData = await membersResponse.json();
        const usersData = isManager ? await PMS.fetchCollection("users") : [];

        if (!Array.isArray(projectsData)) {
            throw new Error("Projects API did not return an array.");
        }

        if (!Array.isArray(membersData)) {
            throw new Error("Team Members API did not return an array.");
        }
        projects = PMS.accessibleProjects(projectsData, currentUser);
        teamMembers = membersData;
        users = usersData;

        if (workspaceProjectId && !projects.some(project => String(project.id) === workspaceProjectId)) {
            window.location.replace("projects.html");
            return;
        }
        if (workspaceProjectId) {
            selectedProjectId = workspaceProjectId;
            projectSelect.disabled = true;
        }

        // Keep the selected project if it still exists.
        if (
            selectedProjectId &&
            !projects.some(
                project => String(project.id) === String(selectedProjectId)
            )
        ) {
            selectedProjectId = "";
        }

        // Select the first project when none is selected.
        if (!selectedProjectId && projects.length > 0) {
            selectedProjectId = String(projects[0].id);
        }

        populateProjectOptions();
        populateProjectDatalist();

        projectSelect.value = selectedProjectId;
        if (workspaceProjectId) {
            projectSelect.disabled = true;
        }

        renderSelectedProject();

    } catch (error) {
        console.error("Team loading error:", error);

        projectSelect.innerHTML = "";
        projectSelect.add(
            new Option("Unable to load projects", "")
        );

        selectedProjectName.textContent = "Unable to load data";
        selectedProjectDescription.textContent =
            "Check JSON Server and the browser console.";

        memberCount.textContent = "0";
        membersSubtitle.textContent = "Team data could not be loaded.";

        membersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Could not load team data</h3>
                <p>
                    Make sure JSON Server is running at localhost:3000
                    and that your db.json contains projects and teamMembers.
                </p>
            </div>`;
    }
}

// =====================================================
// PROJECT HELPERS
// =====================================================

// Your db.json uses projectName.
function getProjectName(project) {
    if (!project) return "";

    return String(
        project.projectName ||
        project.name ||
        project.title ||
        ""
    ).trim();
}

// Get project name assigned to a member.
function getMemberProjectName(member) {
    return String(
        member.projectName ||
        member.project ||
        ""
    ).trim();
}

// Find project by ID.
function findProject(id) {
    return projects.find(
        project => String(project.id) === String(id)
    );
}

// =====================================================
// MATCH MEMBERS TO THE SELECTED PROJECT
// =====================================================

function getMembersForProject(project) {
    if (!project) return [];

    const projectId = String(project.id);
    return teamMembers.filter(member => {
        if (Array.isArray(member.projectIds)) {
            return member.projectIds.some(id => String(id) === projectId);
        }
        return member.projectId !== undefined &&
            member.projectId !== null &&
            String(member.projectId) === projectId;
    });
}

// =====================================================
// PROJECT DROPDOWN
// =====================================================

function populateProjectOptions() {
    projectSelect.innerHTML = "";

    if (projects.length === 0) {
        projectSelect.add(
            new Option("No projects available", "")
        );

        projectSelect.disabled = true;
        return;
    }

    projectSelect.disabled = false;

    projectSelect.add(
        new Option("Select a project...", "")
    );

    projects.forEach(project => {
        projectSelect.add(
            new Option(
                getProjectName(project) || "Unnamed Project",
                String(project.id)
            )
        );
    });

    projectSelect.value = selectedProjectId;
}

// =====================================================
// PROJECT SUGGESTIONS IN THE FORM
// =====================================================

function populateProjectDatalist() {
    projectList.innerHTML = "";

    projects.forEach(project => {
        const name = getProjectName(project);

        if (name) {
            projectList.appendChild(
                new Option(name, name)
            );
        }
    });
}

// =====================================================
// DISPLAY SELECTED PROJECT
// =====================================================

function renderSelectedProject() {
    const project = findProject(selectedProjectId);

    if (!project) {
        selectedProjectName.textContent = "Select a project";

        selectedProjectDescription.textContent =
            "Choose a project from the dropdown to view its team.";

        memberCount.textContent = "0";

        membersSubtitle.textContent =
            "Select a project to see its team members.";

        if (projects.length === 0) {
            membersContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3>No projects found</h3>
                    <p>Add a project before assigning team members.</p>
                </div>`;
        } else {
            membersContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-people-group"></i>
                    </div>
                    <h3>Choose a project</h3>
                    <p>
                        Team members assigned to your selected project
                        will appear here.
                    </p>
                </div>`;
        }

        return;
    }

    selectedProjectName.textContent =
        getProjectName(project) || "Unnamed Project";

    selectedProjectDescription.textContent =
        project.description ||
        project.details ||
        "Team members assigned to this project are listed below.";

    const projectMembers = getMembersForProject(project);

    memberCount.textContent = String(projectMembers.length);

    membersSubtitle.textContent =
        `Showing team members assigned to ${getProjectName(project)}.`;

    renderMembers();
}

// =====================================================
// DISPLAY TEAM MEMBERS
// =====================================================

function renderMembers() {
    const project = findProject(selectedProjectId);

    if (!project) return;

    const projectMembers = getMembersForProject(project);

    membersContainer.innerHTML = "";

    if (projectMembers.length === 0) {
        membersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-users"></i>
                </div>
                <h3>No team members yet</h3>
                <p>
                    There are no members assigned to this project.
                    Use "Add Team Member" to add someone.
                </p>
            </div>`;

        return;
    }

    projectMembers.forEach((member, index) => {
        const card = document.createElement("article");

        card.className = "member-card";

        const name = member.name || "Unnamed Member";
        const role = member.role || "Team Member";
        const department =
            member.department || "Department not specified";
        const email = member.email || "No email provided";

        card.innerHTML = `
            <div class="member-avatar avatar-${index % 4}">
                ${escapeHtml(getInitials(name))}
            </div>

            <div class="member-info">
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(department)}</p>
                <p class="member-email">
                    ${escapeHtml(email)}
                </p>
            </div>

            <span class="member-role">
                ${escapeHtml(role)}
            </span>

            ${isManager ? `<div class="member-actions">
                <button type="button"
                    class="edit-member-btn"
                    title="Edit member"
                    aria-label="Edit member">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button type="button"
                    class="delete-member-btn"
                    title="Remove member"
                    aria-label="Remove member">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>` : ""}`;

        if (isManager) {
            card.querySelector(".edit-member-btn").addEventListener(
                "click",
                () => editMember(member.id)
            );

            card.querySelector(".delete-member-btn").addEventListener(
                "click",
                () => deleteMember(member.id)
            );
        }

        membersContainer.appendChild(card);
    });
}

// =====================================================
// ADD OR UPDATE TEAM MEMBER
// =====================================================

async function saveMember(event) {
    event.preventDefault();
    if (!isManager) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleInput.value.trim();
    const department = departmentInput.value.trim();
    const enteredProjectName = projectNameInput.value.trim();

    if (
        !name ||
        !email ||
        !role ||
        !department ||
        !enteredProjectName
    ) {
        alert("Please fill in all fields.");
        return;
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!validEmail.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    // Only allow an existing project.
    const project = workspaceProjectId
        ? findProject(workspaceProjectId)
        : projects.find(item =>
            getProjectName(item).toLowerCase() === enteredProjectName.toLowerCase()
        );

    if (!project) {
        alert("Please select an existing project from the suggestions.");
        projectNameInput.focus();
        return;
    }

    // Prevent duplicate email addresses.
    const duplicateEmail = teamMembers.some(member =>
        String(member.id) !== String(editMemberId) &&
        String(member.email || "").toLowerCase() ===
            email.toLowerCase()
    );

    if (duplicateEmail) {
        alert("A team member with this email already exists.");
        return;
    }

    try {
        const projectName = getProjectName(project);

        const existingMember = teamMembers.find(
            member => String(member.id) === String(editMemberId)
        );
        const account = users.find(
            item => String(item.email || "").toLowerCase() === email.toLowerCase()
        );
        const memberProjectIds = new Set(
            Array.isArray(existingMember?.projectIds)
                ? existingMember.projectIds.map(String)
                : existingMember?.projectId
                    ? [String(existingMember.projectId)]
                    : []
        );
        memberProjectIds.add(String(project.id));
        const userId = existingMember?.userId || account?.id || "";
        const memberData = {
            name,
            email,
            role,
            department,
            project: projectName,
            projectName,
            projectId: String(project.id),
            projectIds: Array.from(memberProjectIds),
            ...(userId ? { userId: String(userId) } : {})
        };

        if (editMemberId !== null) {
            if (!existingMember) {
                throw new Error("Team member not found.");
            }

            const updatedMember = {
                ...existingMember,
                ...memberData
            };

            await sendMember(
                `${TEAM_MEMBERS_API}/${encodeURIComponent(editMemberId)}`,
                "PATCH",
                updatedMember
            );
        } else {
            await sendMember(
                TEAM_MEMBERS_API,
                "POST",
                memberData
            );
        }

        if (account && !Array.isArray(account.projectIds)) {
            account.projectIds = [];
        }
        if (account) {
            const projectIds = new Set(account.projectIds.map(String));
            projectIds.add(String(project.id));
            const userResponse = await fetch(
                `${USERS_API}/${encodeURIComponent(account.id)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectIds: Array.from(projectIds) })
                }
            );
            if (!userResponse.ok) {
                throw new Error(`Unable to update project access for ${account.email}`);
            }
            const assignedUserIds = new Set(
                Array.isArray(project.assignedUserIds)
                    ? project.assignedUserIds.map(String)
                    : []
            );
            assignedUserIds.add(String(account.id));
            const projectResponse = await fetch(
                `${PROJECTS_API}/${encodeURIComponent(project.id)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assignedUserIds: Array.from(assignedUserIds) })
                }
            );
            if (!projectResponse.ok) {
                throw new Error(`Unable to update project assignment for ${account.email}`);
            }
        }

        selectedProjectId = String(project.id);

        closeForm();

        await loadTeamMembers();

    } catch (error) {
        console.error("Save member error:", error);

        alert(
            "Unable to save the team member. Check JSON Server and try again."
        );
    }
}

// =====================================================
// SEND DATA TO JSON SERVER
// =====================================================

async function sendMember(url, method, data) {
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

// =====================================================
// EDIT TEAM MEMBER
// =====================================================

function editMember(memberId) {
    if (!isManager) return;
    const member = teamMembers.find(
        item => String(item.id) === String(memberId)
    );

    if (!member) return;

    nameInput.value = member.name || "";
    emailInput.value = member.email || "";
    departmentInput.value = member.department || "";
    roleInput.value = member.role || "";

    let assignedProject = null;

    if (workspaceProjectId) {
        assignedProject = findProject(workspaceProjectId);
    } else if (member.projectId !== undefined) {
        assignedProject = findProject(member.projectId);
    }

    if (!assignedProject) {
        const assignedName = getMemberProjectName(member).toLowerCase();

        assignedProject = projects.find(
            project =>
                getProjectName(project).toLowerCase() === assignedName
        );
    }

    projectNameInput.value = assignedProject
        ? getProjectName(assignedProject)
        : getMemberProjectName(member);

    editMemberId = member.id;

    formHeading.textContent = "Edit Team Member";

    changeButtonToUpdate();

    memberFormBox.classList.add("show");

    memberFormBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

// =====================================================
// DELETE TEAM MEMBER
// =====================================================

async function deleteMember(memberId) {
    if (!isManager) return;
    const member = teamMembers.find(
        item => String(item.id) === String(memberId)
    );

    if (!member) return;

    const confirmed = confirm(
        `Remove ${member.name || "this member"}? This deletes the member record.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${TEAM_MEMBERS_API}/${encodeURIComponent(memberId)}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            throw new Error(
                `Delete request failed with status ${response.status}`
            );
        }

        await loadTeamMembers();

    } catch (error) {
        console.error("Delete member error:", error);

        alert(
            "Unable to remove the member. Check that JSON Server is running."
        );
    }
}

// =====================================================
// FORM CONTROLS
// =====================================================

function closeForm() {
    memberFormBox.classList.remove("show");
    teamForm.reset();

    editMemberId = null;

    formHeading.textContent = "Add Team Member";

    changeButtonToAdd();
}

function changeButtonToAdd() {
    const submitButton =
        teamForm.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.innerHTML =
            '<i class="fa-solid fa-user-plus"></i> Add Member';
    }
}

function changeButtonToUpdate() {
    const submitButton =
        teamForm.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.innerHTML =
            '<i class="fa-solid fa-check"></i> Update Member';
    }
}

// =====================================================
// AVATAR INITIALS
// =====================================================

function getInitials(name) {
    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join("")
        .toUpperCase() || "?";
}

// =====================================================
// HTML ESCAPING
// =====================================================

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}