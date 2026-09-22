//    Project Management System
document.addEventListener("DOMContentLoaded", function () {

    // Get Elements added

    const modal = document.getElementById("projectModal");
    const openBtn = document.getElementById("openProjectModal");
    const closeBtn = document.getElementById("closeProjectModal");

    const projectForm = document.getElementById("projectForm");
    const projectTableBody = document.getElementById("projectTableBody");


    // Store projects

    let projects = [];

    // Store project being edited

    let editIndex = -1;


    // Load Projects from JSON Server

    async function loadProjects() {

        try {

            const response = await fetch(
                "http://localhost:3000/projects"
            );

            if (!response.ok) {
                throw new Error("Unable to load projects");
            }

            projects = await response.json();

            projectTableBody.innerHTML = "";

            projects.forEach(function (project, index) {

                createProjectRow(project, index);

            });

        } catch (error) {

            console.error(error);

            alert(
                "Unable to load projects. Please make sure JSON Server is running."
            );
        }
    }


    // Create Project Row

    function createProjectRow(project, index) {

        // Create Status Class

        let statusClass = "";

        if (project.status === "Not Started") {

            statusClass = "not-started";

        } else if (project.status === "In Progress") {

            statusClass = "in-progress";

        } else if (project.status === "Completed") {

            statusClass = "completed";

        }


        // Create New Table Row

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${project.projectName}</td>

            <td>${project.description}</td>

            <td>${project.startDate}</td>

            <td>${project.deadline}</td>

            <td>
                <span class="status ${statusClass}">
                    ${project.status}
                </span>
            </td>

            <td>${project.members || "Not Assigned"}</td>

            <td>

                <button class="edit-btn">
                    <i class="fa-solid fa-pen"></i>
                    Edit
                </button>

                <button class="delete-btn">
                    <i class="fa-solid fa-trash"></i>
                    Delete
                </button>

            </td>

        `;


        // Add row to table

        projectTableBody.appendChild(row);


        // Add Delete

        const deleteBtn =
            row.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", async function () {

            const confirmDelete =
                confirm(
                    "Are you sure you want to delete this project?"
                );

            if (!confirmDelete) {
                return;
            }


            try {

                const response = await fetch(
                    `http://localhost:3000/projects/${project.id}`,
                    {
                        method: "DELETE"
                    }
                );


                if (!response.ok) {

                    throw new Error(
                        "Unable to delete project"
                    );
                }


                // Remove row

                row.remove();


                // Update projects array

                projects =
                    projects.filter(function (item) {

                        return item.id !== project.id;

                    });


                alert("Project deleted successfully!");


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to delete project."
                );
            }

        });


        // Add Edit Function

        const editBtn =
            row.querySelector(".edit-btn");

        editBtn.addEventListener("click", function () {

            // Find project index

            editIndex = projects.findIndex(
                function (item) {

                    return item.id === project.id;

                }
            );


            // Put existing values back into form

            document.getElementById("projectName").value =
                project.projectName;

            document.getElementById("members").value =
                project.members || "";

            document.getElementById("description").value =
                project.description;

            document.getElementById("startDate").value =
                project.startDate;

            document.getElementById("deadline").value =
                project.deadline;

            document.getElementById("status").value =
                project.status;


            // Open popup

            modal.style.display = "flex";

            document.body.style.overflow = "hidden";

        });

    }


    // Open Add Project Popup

    openBtn.addEventListener("click", function () {

        // Reset edit mode

        editIndex = -1;

        projectForm.reset();

        modal.style.display = "flex";

        document.body.style.overflow = "hidden";

    });


    // Close Popup

    closeBtn.addEventListener("click", function () {

        modal.style.display = "none";

        document.body.style.overflow = "auto";

    });


    // Closing Popup When Clicking Outside

    window.addEventListener("click", function (event) {

        if (event.target === modal) {

            modal.style.display = "none";

            document.body.style.overflow = "auto";

        }

    });


    // Added New Project

    projectForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // Get form values

            const projectName =
                document.getElementById("projectName").value.trim();

            const members =
                document.getElementById("members").value.trim();

            const description =
                document.getElementById("description").value.trim();

            const startDate =
                document.getElementById("startDate").value;

            const deadline =
                document.getElementById("deadline").value;

            const status =
                document.getElementById("status").value;


            // Project Dates

            if (deadline < startDate) {

                alert(
                    "Deadline cannot be before the start date."
                );

                return;
            }


            // Create Project Object

            const project = {

                projectName: projectName,

                members: members,

                description: description,

                startDate: startDate,

                deadline: deadline,

                status: status

            };


            try {

                // UPDATE PROJECT

                if (editIndex !== -1) {

                    const projectId =
                        projects[editIndex].id;


                    const response = await fetch(
                        `http://localhost:3000/projects/${projectId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify(project)
                        }
                    );


                    if (!response.ok) {

                        throw new Error(
                            "Unable to update project"
                        );
                    }


                    // Update local array

                    projects[editIndex] = {
                        id: projectId,
                        ...project
                    };


                    alert(
                        "Project updated successfully!"
                    );


                    // Reset edit mode

                    editIndex = -1;

                }


                // ADD NEW PROJECT

                else {

                    const response = await fetch(
                        "http://localhost:3000/projects",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify(project)
                        }
                    );


                    if (!response.ok) {

                        throw new Error(
                            "Unable to add project"
                        );
                    }


                    const newProject =
                        await response.json();


                    // Add to array

                    projects.push(newProject);


                    alert(
                        "Project added successfully!"
                    );

                }


                // Refresh table

                projectTableBody.innerHTML = "";


                projects.forEach(
                    function (project, index) {

                        createProjectRow(
                            project,
                            index
                        );

                    }
                );


                // Reset Form

                projectForm.reset();


                // Close Popup

                modal.style.display = "none";

                document.body.style.overflow = "auto";


            } catch (error) {

                console.error(error);

                alert(
                    "Unable to save project. Please make sure JSON Server is running."
                );
            }

        }
    );


    // Delete Existing Projects

    document.querySelectorAll(".delete-btn").forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function () {

                    const row =
                        button.closest("tr");

                    const confirmDelete =
                        confirm(
                            "Are you sure you want to delete this project?"
                        );


                    if (!confirmDelete) {
                        return;
                    }


                    // Get project name from row

                    const projectName =
                        row.cells[0].textContent.trim();


                    const project =
                        projects.find(
                            function (item) {

                                return item.projectName === projectName;

                            }
                        );


                    if (!project) {
                        return;
                    }


                    try {

                        const response = await fetch(
                            `http://localhost:3000/projects/${project.id}`,
                            {
                                method: "DELETE"
                            }
                        );


                        if (!response.ok) {

                            throw new Error(
                                "Unable to delete project"
                            );
                        }


                        row.remove();


                        projects =
                            projects.filter(
                                function (item) {

                                    return item.id !== project.id;

                                }
                            );


                        alert(
                            "Project deleted successfully!"
                        );


                    } catch (error) {

                        console.error(error);

                        alert(
                            "Unable to delete project."
                        );
                    }

                }
            );

        }
    );


    // Edit Existing Projects

    document.querySelectorAll(".edit-btn").forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const row =
                        button.closest("tr");

                    const cells =
                        row.querySelectorAll("td");


                    // Get existing values

                    document.getElementById("projectName").value =
                        cells[0].textContent.trim();

                    document.getElementById("description").value =
                        cells[1].textContent.trim();

                    document.getElementById("startDate").value =
                        cells[2].textContent.trim();

                    document.getElementById("deadline").value =
                        cells[3].textContent.trim();

                    document.getElementById("status").value =
                        cells[4].textContent.trim();

                    document.getElementById("members").value =
                        cells[5].textContent.trim();


                    // Open popup

                    modal.style.display = "flex";

                    document.body.style.overflow = "hidden";

                }
            );

        }
    );


    // Initialize Projects

    loadProjects();

});