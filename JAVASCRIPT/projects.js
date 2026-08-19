
//    Project Management System
//    File: js/projects.js


document.addEventListener("DOMContentLoaded", function () {

    // Get Elements added
    

    const modal = document.getElementById("projectModal");
    const openBtn = document.getElementById("openProjectModal");
    const closeBtn = document.getElementById("closeProjectModal");

    const projectForm = document.getElementById("projectForm");
    const projectTableBody = document.getElementById("projectTableBody");


   
    // Open Add Project Popup


    openBtn.addEventListener("click", function () {

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
   

    projectForm.addEventListener("submit", function (event) {

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


        
        // project Dates
        

        if (deadline < startDate) {

            alert("Deadline cannot be before the start date.");

            return;

        }


       
        // Create Status Class
        

        let statusClass = "";

        if (status === "Not Started") {

            statusClass = "not-started";

        } else if (status === "In Progress") {

            statusClass = "in-progress";

        } else if (status === "Completed") {

            statusClass = "completed";

        }


        
        // Create New Table Row
       

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${projectName}</td>

            <td>${description}</td>

            <td>${startDate}</td>

            <td>${deadline}</td>

            <td>
                <span class="status ${statusClass}">
                    ${status}
                </span>
            </td>

            <td>${members || "Not Assigned"}</td>

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

        deleteBtn.addEventListener("click", function () {

            const confirmDelete =
                confirm("Are you sure you want to delete this project?");

            if (confirmDelete) {

                row.remove();

            }

        });


        
        // Add Edit Function
       

        const editBtn =
            row.querySelector(".edit-btn");

        editBtn.addEventListener("click", function () {

            // Put existing values back into form

            document.getElementById("projectName").value =
                projectName;

            document.getElementById("members").value =
                members;

            document.getElementById("description").value =
                description;

            document.getElementById("startDate").value =
                startDate;

            document.getElementById("deadline").value =
                deadline;

            document.getElementById("status").value =
                status;


            // Remove old row

            row.remove();


            // Open popup

            modal.style.display = "flex";

            document.body.style.overflow = "hidden";

        });


        // Reset Form
      

        projectForm.reset();


       
        // Close Popup
       

        modal.style.display = "none";

        document.body.style.overflow = "auto";


        
        // Success Message
       

        alert("Project added successfully!");

    });


    
    // Delete Existing Projects
   

    document.querySelectorAll(".delete-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            const row = button.closest("tr");

            const confirmDelete =
                confirm("Are you sure you want to delete this project?");

            if (confirmDelete) {

                row.remove();

            }

        });

    });


    
    // Edit Existing Projects
   

    document.querySelectorAll(".edit-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            const row = button.closest("tr");

            const cells = row.querySelectorAll("td");


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


            // Remove old row

            row.remove();


            // Open popup

            modal.style.display = "flex";

            document.body.style.overflow = "hidden";

        });

    });

});