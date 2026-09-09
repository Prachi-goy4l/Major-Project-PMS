document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "http://localhost:3000/tasks";

  const taskForm = document.getElementById("taskForm");
  const taskTableBody = document.getElementById("taskTableBody");
  const searchTask = document.getElementById("searchTask");
  const taskModal = document.getElementById("taskModal");
  const openTaskModal = document.getElementById("openTaskModal");
  const closeTaskModal = document.querySelector(".close");
  let tasks = [];
  let editTaskId = null;

  function closeModal() {
    taskModal.style.display = "none";
    taskForm.reset();
    editTaskId = null;
  }

  function setSubmitButton(icon, label) {
    taskForm.querySelector("button").innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
  }

  // Open the add-task modal.
  openTaskModal.addEventListener("click", function () {
    editTaskId = null;
    taskForm.reset();
    setSubmitButton("fa-plus", "Add Task");
    taskModal.style.display = "flex";
  });

  // Close the modal.
  closeTaskModal.addEventListener("click", closeModal);

  // Close when clicking outside the modal.
  window.addEventListener("click", function (event) {
    if (event.target === taskModal) {
      closeModal();
    }
  });

  // Render the current task list.
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

      const priorityClass = `priority-${task.priority.toLowerCase()}`;
      const statusClass = {
        "To Do": "status-todo",
        "In Progress": "status-progress",
        Completed: "status-completed",
      }[task.status] || "";

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
                        onclick='editTask(${JSON.stringify(String(task.id))})'>

                        <i class="fa-solid fa-pen"></i>
                        Edit

                    </button>

                    <button
                        class="delete-btn"
                        onclick='deleteTask(${JSON.stringify(String(task.id))})'>

                        <i class="fa-solid fa-trash"></i>
                        Delete

                    </button>

                </td>

            `;

      taskTableBody.appendChild(row);
    });
  }

  // Add or update a task.
  taskForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const taskData = {
      taskName: document.getElementById("taskName").value.trim(),
      description: document.getElementById("taskDescription").value.trim(),
      assignedTo: document.getElementById("assignedTo").value.trim(),
      priority: document.getElementById("priority").value,
      deadline: document.getElementById("deadline").value,
      status: document.getElementById("status").value,
    };

    if (Object.values(taskData).some((value) => value === "")) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const response = await fetch(
        editTaskId === null ? API_URL : `${API_URL}/${editTaskId}`,
        {
          method: editTaskId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editTaskId === null ? taskData : { id: editTaskId, ...taskData },
          ),
        },
      );

      if (!response.ok) {
        throw new Error("Unable to save task");
      }

      const savedTask = await response.json();

      if (editTaskId === null) {
        tasks.push(savedTask);
        alert("Task added successfully!");
      } else {
        tasks = tasks.map((task) =>
          String(task.id) === String(editTaskId) ? savedTask : task,
        );
        alert("Task updated successfully!");
        editTaskId = null;
      }
    } catch (error) {
      alert(
        "Could not connect to the tasks API. Start JSON Server and try again.",
      );
      return;
    }

    taskForm.reset();

    /* Close modal */

    taskModal.style.display = "none";

    /* Display updated tasks */

    displayTasks();
  });

  //edit task
  window.editTask = function (id) {
    const task = tasks.find((task) => String(task.id) === String(id));

    if (!task) {
      return;
    }

    /* Fill form */

    document.getElementById("taskName").value = task.taskName;

    document.getElementById("taskDescription").value = task.description;

    document.getElementById("assignedTo").value = task.assignedTo;

    document.getElementById("priority").value = task.priority;

    document.getElementById("deadline").value = task.deadline;

    document.getElementById("status").value = task.status;

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

  //delete task
  window.deleteTask = async function (id) {
    const confirmation = confirm("Are you sure you want to delete this task?");

    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete task");
      }

      tasks = tasks.filter((task) => String(task.id) !== String(id));
    } catch (error) {
      alert(
        "Could not connect to the tasks API. Start JSON Server and try again.",
      );
      return;
    }

    /* Refresh table */

    displayTasks();

    alert("Task deleted successfully!");
  };

  //search task
  searchTask.addEventListener("input", function () {
    const searchValue = searchTask.value.toLowerCase().trim();

    const filteredTasks = tasks.filter(function (task) {
      return (
        task.taskName.toLowerCase().includes(searchValue) ||
        task.description.toLowerCase().includes(searchValue) ||
        task.assignedTo.toLowerCase().includes(searchValue) ||
        task.priority.toLowerCase().includes(searchValue) ||
        task.status.toLowerCase().includes(searchValue)
      );
    });

    displayTasks(filteredTasks);
  });

  //  Prevent HTML injection
  function escapeHTML(value) {
    const div = document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
  }

  async function loadTasks() {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load tasks");
      }

      tasks = await response.json();
      displayTasks();
    } catch (error) {
      taskTableBody.innerHTML = `
                <tr>
                    <td colspan="7">Unable to load tasks. Start JSON Server on port 3000.</td>
                </tr>
            `;
    }
  }

  loadTasks();
});
