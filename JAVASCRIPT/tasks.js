/* =========================================
   Task Management JavaScript
   File: js/tasks.js
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const taskForm = document.getElementById("taskForm");
    const taskTableBody = document.getElementById("taskTableBody");
    const searchTask = document.getElementById("searchTask");

    /* Modal elements */
    const taskModal = document.getElementById("taskModal");
    const openTaskModal = document.getElementById("openTaskModal");
    const closeTaskModal = document.querySelector(".close");

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    let editTaskId = null;


    /* =========================================
       OPEN ADD TASK MODAL
    ========================================= */

    openTaskModal.addEventListener("click", function () {

        editTaskId = null;

        taskForm.reset();

        taskForm.querySelector("button").innerHTML = `
            <i class="fa-solid fa-plus"></i>
            Add Task
        `;

        taskModal.style.display = "flex";

    });


    /* =========================================
       CLOSE MODAL
    ========================================= */

    closeTaskModal.addEventListener("click", function () {

        taskModal.style.display = "none";

        taskForm.reset();

        editTaskId = null;

    });


    /* =========================================
       CLOSE MODAL WHEN CLICKING OUTSIDE
    ========================================= */

    window.addEventListener("click", function (event) {

        if (event.target === taskModal) {

            taskModal.style.display = "none";

            taskForm.reset();

            editTaskId = null;

        }

    });


    /* =========================================
       DISPLAY TASKS
    ========================================= */

    function displayTasks(taskList = tasks) {

        taskTableBody.innerHTML = "";

        if (taskList.length === 0) {

            taskTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        No tasks available
                    </td>
                </tr>
            `;

            return;
        }


        taskList.forEach(function (task) {

            const row = document.createElement("tr");


            /* Priority Class */

            let priorityClass = "";

            if (task.priority === "High") {

                priorityClass = "priority-high";

            }
            else if (task.priority === "Medium") {

                priorityClass = "priority-medium";

            }
            else {

                priorityClass = "priority-low";

            }


            /* Status Class */

            let statusClass = "";

            if (task.status === "To Do") {

                statusClass = "status-todo";

            }
            else if (task.status === "In Progress") {

                statusClass = "status-progress";

            }
            else if (task.status === "Completed") {

                statusClass = "status-completed";

            }


            row.innerHTML = `

                <td>
                    ${escapeHTML(task.taskName)}
                </td>

                <td>
                    ${escapeHTML(task.description)}
                </td>

                <td>
                    ${escapeHTML(task.assignedTo)}
                </td>

                <td>
                    <span class="${priorityClass}">
                        ${escapeHTML(task.priority)}
                    </span>
                </td>

                <td>
                    ${escapeHTML(task.deadline)}
                </td>

                <td>
                    <span class="${statusClass}">
                        ${escapeHTML(task.status)}
                    </span>
                </td>

                <td>

                    <button
                        class="edit-btn"
                        onclick="editTask(${task.id})">

                        <i class="fa-solid fa-pen"></i>
                        Edit

                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteTask(${task.id})">

                        <i class="fa-solid fa-trash"></i>
                        Delete

                    </button>

                </td>

            `;

            taskTableBody.appendChild(row);

        });

    }


    /* =========================================
       ADD / UPDATE TASK
    ========================================= */

    taskForm.addEventListener("submit", function (event) {

        event.preventDefault();


        /* Get form values */

        const taskName =
            document.getElementById("taskName").value.trim();

        const description =
            document.getElementById("taskDescription").value.trim();

        const assignedTo =
            document.getElementById("assignedTo").value.trim();

        const priority =
            document.getElementById("priority").value;

        const deadline =
            document.getElementById("deadline").value;

        const status =
            document.getElementById("status").value;


        /* Validation */

        if (
            taskName === "" ||
            description === "" ||
            assignedTo === "" ||
            priority === "" ||
            deadline === "" ||
            status === ""
        ) {

            alert("Please fill all fields.");

            return;

        }


        /* =========================================
           UPDATE EXISTING TASK
        ========================================= */

        if (editTaskId !== null) {

            const taskIndex = tasks.findIndex(
                task => task.id === editTaskId
            );


            if (taskIndex !== -1) {

                tasks[taskIndex] = {

                    id: editTaskId,

                    taskName: taskName,

                    description: description,

                    assignedTo: assignedTo,

                    priority: priority,

                    deadline: deadline,

                    status: status

                };

            }


            alert("Task updated successfully!");

            editTaskId = null;

        }


        /* =========================================
           ADD NEW TASK
        ========================================= */

        else {

            const newTask = {

                id: Date.now(),

                taskName: taskName,

                description: description,

                assignedTo: assignedTo,

                priority: priority,

                deadline: deadline,

                status: status

            };


            tasks.push(newTask);

            alert("Task added successfully!");

        }


        /* Save to LocalStorage */

        localStorage.setItem(
            "tasks",
            JSON.stringify(tasks)
        );


        /* Clear form */

        taskForm.reset();


        /* Close modal */

        taskModal.style.display = "none";


        /* Display updated tasks */

        displayTasks();

    });


    /* =========================================
       EDIT TASK
    ========================================= */

    window.editTask = function (id) {

        const task = tasks.find(
            task => task.id === id
        );


        if (!task) {
            return;
        }


        /* Fill form */

        document.getElementById("taskName").value =
            task.taskName;

        document.getElementById("taskDescription").value =
            task.description;

        document.getElementById("assignedTo").value =
            task.assignedTo;

        document.getElementById("priority").value =
            task.priority;

        document.getElementById("deadline").value =
            task.deadline;

        document.getElementById("status").value =
            task.status;


        /* Store ID */

        editTaskId = id;


        /* Change button */

        taskForm.querySelector("button").innerHTML = `
            <i class="fa-solid fa-pen"></i>
            Update Task
        `;


        /* Open modal */

        taskModal.style.display = "flex";

    };


    /* =========================================
       DELETE TASK
    ========================================= */

    window.deleteTask = function (id) {

        const confirmation = confirm(
            "Are you sure you want to delete this task?"
        );


        if (!confirmation) {
            return;
        }


        tasks = tasks.filter(
            task => task.id !== id
        );


        /* Save updated data */

        localStorage.setItem(
            "tasks",
            JSON.stringify(tasks)
        );


        /* Refresh table */

        displayTasks();


        alert("Task deleted successfully!");

    };


    /* =========================================
       SEARCH TASKS
    ========================================= */

    searchTask.addEventListener("input", function () {

        const searchValue =
            searchTask.value.toLowerCase().trim();


        const filteredTasks = tasks.filter(function (task) {

            return (

                task.taskName
                    .toLowerCase()
                    .includes(searchValue)

                ||

                task.description
                    .toLowerCase()
                    .includes(searchValue)

                ||

                task.assignedTo
                    .toLowerCase()
                    .includes(searchValue)

                ||

                task.priority
                    .toLowerCase()
                    .includes(searchValue)

                ||

                task.status
                    .toLowerCase()
                    .includes(searchValue)

            );

        });


        displayTasks(filteredTasks);

    });


    /* =========================================
       SECURITY FUNCTION
       Prevent HTML injection
    ========================================= */

    function escapeHTML(value) {

        const div = document.createElement("div");

        div.textContent = value;

        return div.innerHTML;

    }


    /* =========================================
       LOAD TASKS WHEN PAGE OPENS
    ========================================= */

    displayTasks();

});