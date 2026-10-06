// DOM ELEMENTS
const teamForm = document.getElementById("teamForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const roleInput = document.getElementById("role");
const departmentInput =document.getElementById("department");
const projectNameInput =document.getElementById("projectName");
const projectsList =document.getElementById("projectsList");
const projectDetails =document.getElementById("projectDetails");
const projectList =document.getElementById("projectList");
const memberFormBox =document.getElementById("memberFormBox");
const addTeamMemberBtn =document.getElementById("addTeamMemberBtn");
const closeFormBtn =document.getElementById("closeFormBtn");
const cancelBtn =document.getElementById("cancelBtn");
const searchInput =document.getElementById("searchInput");

// JSON SERVER URLS
const PROJECTS_API =
    "http://localhost:3000/projects";

const TEAM_MEMBERS_API =
    "http://localhost:3000/teamMembers";

// TEAM DATA
let teamMembers = [];
let editMemberId = null;
let projects = [];
let selectedProjectId = null;

// OPEN ADD FORM
addTeamMemberBtn.addEventListener(
    "click",
    function () {
        memberFormBox.classList.add("show");
        teamForm.reset();
        editMemberId = null;
        changeButtonToAdd();
        nameInput.focus();
    }
);

// CLOSE FORM
closeFormBtn.addEventListener(
    "click",
    function () {
        closeForm();
    }
);

cancelBtn.addEventListener(
    "click",
    function () {
        closeForm();
    }
);

function closeForm() {
    memberFormBox.classList.remove("show");
    teamForm.reset();
    editMemberId = null;
    changeButtonToAdd();
}

// LOAD PROJECTS AND TEAM MEMBERS
async function loadTeamMembers() {
    try {
        // LOAD PROJECTS
        const projectsResponse =
            await fetch(PROJECTS_API);

        if (!projectsResponse.ok) {
            throw new Error(
                "Unable to load projects"
            );
        }

        projects =
            await projectsResponse.json();
        // LOAD TEAM MEMBERS
        const membersResponse =
            await fetch(TEAM_MEMBERS_API);

        if (!membersResponse.ok) {
            throw new Error(
                "Unable to load team members"
            );
        }

        teamMembers =
            await membersResponse.json();
        console.log("Projects:", projects);
        console.log("Team Members:", teamMembers);

        // SELECT FIRST PROJECT
        if (
            selectedProjectId === null &&
            projects.length > 0
        ) {
            selectedProjectId =
                projects[0].id;

        }

        // DISPLAY

        displayProjects();

        populateProjectList();

        displayTeamMembers();

    }

    catch (error) {

        console.error(
            "Error loading data:",
            error
        );

        projectsList.innerHTML = `

            <div class="no-members">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Unable to load projects or team members.
                </p>

            </div>

        `;
    }
}


// =====================================================
// GET PROJECT NAME
// =====================================================

function getProjectName(project) {

    return (
        project.name ||
        project.projectName ||
        ""
    );

}


// =====================================================
// GET MEMBER PROJECT NAME
// =====================================================

function getMemberProjectName(member) {

    return (
        member.project ||
        member.projectName ||
        ""
    );

}


// =====================================================
// GET MEMBERS FOR PROJECT
// =====================================================

function getMembersForProject(project) {

    const projectName =
        getProjectName(project)
            .trim()
            .toLowerCase();

    return teamMembers.filter(
        function (member) {

            const memberProjectName =
                getMemberProjectName(member)
                    .trim()
                    .toLowerCase();

            // Support both formats:
            // projectId
            // project

            const projectIdMatch =
                member.projectId !== undefined &&
                String(member.projectId) ===
                String(project.id);

            const projectNameMatch =
                memberProjectName ===
                projectName;

            return (
                projectIdMatch ||
                projectNameMatch
            );

        }
    );

}


// =====================================================
// DISPLAY PROJECTS
// =====================================================

function displayProjects() {

    projectsList.innerHTML = "";

    projects.forEach(
        function (project) {

            const projectName =
                getProjectName(project) ||
                "Unnamed Project";

            const description =
                project.description ||
                "Project description";

            const status =
                project.status ||
                "Not Started";


            // -----------------------------------------
            // COUNT MEMBERS
            // -----------------------------------------

            const members =
                getMembersForProject(project);


            const card =
                document.createElement("div");

            card.className =
                "project-card";


            if (
                String(selectedProjectId) ===
                String(project.id)
            ) {

                card.classList.add("active");

            }

            card.innerHTML = `

                <div class="project-icon">

                    <i class="fa-solid fa-folder"></i>

                </div>


                <div class="project-info">

                    <h3>
                        ${escapeHtml(projectName)}
                    </h3>

                    <p>
                        ${escapeHtml(description)}
                    </p>


                    <div class="project-meta">

                        <span>

                            <i class="fa-solid fa-users"></i>

                            ${members.length} members

                        </span>


                        <span>

                            <i class="fa-regular fa-calendar"></i>

                            ${
                                project.date ||
                                project.startDate ||
                                "Sep 20, 2026"
                            }

                        </span>

                    </div>

                </div>


                <span class="project-status">

                    ${escapeHtml(status)}

                </span>


                <i class="fa-solid fa-chevron-right project-arrow"></i>

            `;


            card.addEventListener(
                "click",
                function () {

                    selectedProjectId =
                        project.id;

                    displayProjects();

                    displayTeamMembers();

                }
            );


            projectsList.appendChild(card);

        }
    );

}


// =====================================================
// PROJECT NAMES FOR FORM
// =====================================================

function populateProjectList() {

    projectList.innerHTML = "";

    projects.forEach(
        function (project) {

            const projectName =
                getProjectName(project);

            if (!projectName) {

                return;

            }


            const option =
                document.createElement("option");

            option.value =
                projectName;

            projectList.appendChild(option);

        }
    );

}


// =====================================================
// DISPLAY SELECTED PROJECT MEMBERS
// =====================================================

function displayTeamMembers() {

    const project =
        projects.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(selectedProjectId)
                );

            }
        );


    if (!project) {

        projectDetails.innerHTML = `

            <div class="no-project">

                <i class="fa-solid fa-folder-open"></i>

                <h3>
                    Select a Project
                </h3>

                <p>
                    Select a project to view its team members.
                </p>

            </div>

        `;

        return;

    }


    const projectName =
        getProjectName(project) ||
        "Unnamed Project";


    const description =
        project.description ||
        "Project description";


    // ---------------------------------------------
    // GET MEMBERS
    // ---------------------------------------------

    const members =
        getMembersForProject(project);


    projectDetails.innerHTML = `

        <div class="project-header">

            <div class="project-header-icon">

                <i class="fa-solid fa-folder"></i>

            </div>


            <div>

                <h2>
                    ${escapeHtml(projectName)}
                </h2>

                <p>
                    ${escapeHtml(description)}
                </p>

            </div>

        </div>


        <h3 class="member-title">

            Project Team Members (${members.length})

        </h3>


        <div id="membersContainer"></div>

    `;


    const membersContainer =
        document.getElementById(
            "membersContainer"
        );


    // ---------------------------------------------
    // NO MEMBERS
    // ---------------------------------------------

    if (members.length === 0) {

        membersContainer.innerHTML = `

            <div class="no-members">

                <i class="fa-solid fa-users"></i>

                <p>
                    No team members assigned to this project.
                </p>

            </div>

        `;

        return;

    }


    // ---------------------------------------------
    // DISPLAY MEMBERS
    // ---------------------------------------------

    members.forEach(
        function (member) {

            const card =
                document.createElement("div");

            card.className =
                "member-card";


            const firstLetter =
                member.name
                    ? member.name
                        .charAt(0)
                        .toUpperCase()
                    : "?";


            card.innerHTML = `

                <div class="member-avatar">

                    ${escapeHtml(firstLetter)}

                </div>


                <div class="member-info">

                    <h3>

                        ${escapeHtml(
                            member.name || ""
                        )}

                    </h3>


                    <p>

                        ${escapeHtml(
                            member.role || ""
                        )}

                    </p>


                    <p class="member-email">

                        ${escapeHtml(
                            member.email || ""
                        )}

                    </p>

                </div>


                <span class="member-role">

                    ${escapeHtml(
                        member.role || ""
                    )}

                </span>


                <div class="member-actions">

                    <button
                        type="button"
                        class="edit-member-btn"
                        title="Edit Member">

                        <i class="fa-solid fa-pen"></i>

                    </button>


                    <button
                        type="button"
                        class="delete-member-btn"
                        title="Remove Member">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `;


            // -----------------------------------------
            // EDIT
            // -----------------------------------------

            const editButton =
                card.querySelector(
                    ".edit-member-btn"
                );


            editButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    editMember(member.id);

                }
            );


            // -----------------------------------------
            // DELETE
            // -----------------------------------------

            const deleteButton =
                card.querySelector(
                    ".delete-member-btn"
                );


            deleteButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    deleteMember(member.id);

                }
            );


            membersContainer.appendChild(card);

        }
    );

}


// =====================================================
// ADD / UPDATE MEMBER
// =====================================================

teamForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            nameInput.value.trim();

        const email =
            emailInput.value.trim();

        const role =
            roleInput.value.trim();

        const department =
            departmentInput.value.trim();

        const projectName =
            projectNameInput.value.trim();


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (
            name === "" ||
            email === "" ||
            role === "" ||
            department === "" ||
            projectName === ""
        ) {

            alert(
                "Please fill in all fields."
            );

            return;

        }


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailPattern.test(email)) {

            alert(
                "Please enter a valid email address."
            );

            return;

        }


        // ---------------------------------------------
        // FIND PROJECT
        // ---------------------------------------------

        const project =
            projects.find(
                function (item) {

                    const currentName =
                        getProjectName(item);

                    return (
                        currentName.toLowerCase() ===
                        projectName.toLowerCase()
                    );

                }
            );


        if (!project) {

            alert(
                "Project not found. Please enter an existing project name."
            );

            return;

        }


        // =================================================
        // UPDATE EXISTING MEMBER
        // =================================================

        if (editMemberId !== null) {

            const existingMember =
                teamMembers.find(
                    function (member) {

                        return (
                            String(member.id) ===
                            String(editMemberId)
                        );

                    }
                );


            if (!existingMember) {

                alert(
                    "Team member not found."
                );

                return;

            }


            const updatedMember = {

                ...existingMember,

                name: name,

                email: email,

                department: department,

                role: role,

                project:
                    getProjectName(project),

                projectId:
                    project.id,

                projectName:
                    getProjectName(project)

            };


            try {

                const response =
                    await fetch(
                        `${TEAM_MEMBERS_API}/${editMemberId}`,
                        {

                            method: "PUT",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    updatedMember
                                )

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Update failed"
                    );

                }


                alert(
                    "Team member updated successfully."
                );


                selectedProjectId =
                    project.id;


                closeForm();


                await loadTeamMembers();

            }

            catch (error) {

                console.error(error);

                alert(
                    "Unable to update team member."
                );

            }


            return;

        }


        // =================================================
        // CHECK DUPLICATE EMAIL
        // =================================================

        const duplicateEmail =
            teamMembers.some(
                function (member) {

                    return (
                        member.email &&
                        member.email.toLowerCase() ===
                        email.toLowerCase()
                    );

                }
            );


        if (duplicateEmail) {

            alert(
                "A team member with this email already exists."
            );

            return;

        }


        // =================================================
        // NEW MEMBER
        // =================================================

        const member = {

            name: name,

            email: email,

            role: role,

            department: department,

            project:
                getProjectName(project),

            projectId:
                project.id,

            projectName:
                getProjectName(project)

        };


        try {

            const response =
                await fetch(
                    TEAM_MEMBERS_API,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(member)

                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to save member"
                );

            }


            alert(
                `${name} added to ${projectName}.`
            );


            selectedProjectId =
                project.id;


            closeForm();


            await loadTeamMembers();

        }

        catch (error) {

            console.error(error);

            alert(
                "Unable to save team member. Please make sure JSON Server is running."
            );

        }

    }
);


// =====================================================
// EDIT MEMBER
// =====================================================

function editMember(memberId) {

    const member =
        teamMembers.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(memberId)
                );

            }
        );


    if (!member) {

        return;

    }


    nameInput.value =
        member.name || "";


    emailInput.value =
        member.email || "";


    departmentInput.value =
        member.department || "";


    roleInput.value =
        member.role || "";


    projectNameInput.value =
        getMemberProjectName(member);


    editMemberId =
        member.id;


    selectedProjectId =
        member.projectId ||
        findProjectIdByName(
            getMemberProjectName(member)
        );


    memberFormBox.classList.add(
        "show"
    );


    teamForm.querySelector(
        "button[type='submit']"
    ).innerHTML = `

        <i class="fa-solid fa-pen"></i>

        Update Member

    `;


    memberFormBox.scrollIntoView({
        behavior: "smooth"
    });

}


// =====================================================
// FIND PROJECT ID BY NAME
// =====================================================

function findProjectIdByName(projectName) {

    const project =
        projects.find(
            function (item) {

                return (
                    getProjectName(item)
                        .toLowerCase() ===
                    projectName
                        .toLowerCase()
                );

            }
        );


    return project
        ? project.id
        : null;

}


// =====================================================
// DELETE MEMBER
// =====================================================

async function deleteMember(memberId) {

    const member =
        teamMembers.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(memberId)
                );

            }
        );


    if (!member) {

        return;

    }


    const confirmDelete =
        confirm(
            `Are you sure you want to remove ${member.name} from this project?`
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const response =
            await fetch(
                `${TEAM_MEMBERS_API}/${memberId}`,
                {

                    method: "DELETE"

                }
            );


        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );

        }


        alert(
            `${member.name} has been removed from the project.`
        );


        if (
            String(editMemberId) ===
            String(memberId)
        ) {

            closeForm();

        }


        await loadTeamMembers();

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to remove team member. Please make sure JSON Server is running."
        );

    }

}


// =====================================================
// CHANGE BUTTON TO ADD
// =====================================================

function changeButtonToAdd() {

    const button =
        teamForm.querySelector(
            "button[type='submit']"
        );


    button.innerHTML = `

        <i class="fa-solid fa-user-plus"></i>

        Add Member

    `;

}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            searchInput.value
                .toLowerCase()
                .trim();


        const cards =
            document.querySelectorAll(
                ".project-card"
            );


        cards.forEach(
            function (card) {

                const text =
                    card.innerText
                        .toLowerCase();


                if (
                    text.includes(search)
                ) {

                    card.style.display =
                        "flex";

                }

                else {

                    card.style.display =
                        "none";

                }

            }
        );

    }
);


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadTeamMembers();

    }
);