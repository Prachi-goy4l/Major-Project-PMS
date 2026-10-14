document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "http://localhost:3000/tasks";
  const TEAM_MEMBERS_API_URL = "http://localhost:3000/teamMembers";

  const taskForm = document.getElementById("taskForm");
  const assignedToSelect = document.getElementById("assignedTo");
  const assignedToHelp = document.getElementById("assignedToHelp");
  const taskTableBody = document.getElementById("taskTableBody");
  const searchTask = document.getElementById("searchTask");
  const taskModal = document.getElementById("taskModal");
  const modalHeading = document.getElementById("taskModalHeading");
  const openTaskModal = document.getElementById("openTaskModal");
  const closeTaskModal = document.querySelector(".close");
  document.body.appendChild(taskModal);
  const calendar = document.getElementById("taskCalendar");
  const calendarMonth = document.getElementById("calendarMonth");
  const completedTaskGroups = document.getElementById("completedTaskGroups");
  let tasks = [];
  let teamMembers = [];
  let editTaskId = null;
  let visibleTasks = [];
  let calendarDate = new Date();
  calendarDate.setDate(1);

  function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  function formatDate(value, options) {
    const date = parseDate(value);
    return date
      ? new Intl.DateTimeFormat(undefined, options).format(date)
      : "No due date";
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) &&
      date.getMonth() === Number(match[2]) - 1 &&
      date.getDate() === Number(match[3])
      ? date
      : null;
  }

  function priorityClass(priority) {
    return {
      High: "priority-high",
      Medium: "priority-medium",
      Low: "priority-low",
    }[priority] || "priority-default";
  }

  function statusClass(status) {
    return {
      "To Do": "status-todo",
      "In Progress": "status-progress",
      Completed: "status-completed",
    }[status] || "status-default";
  }

  function renderTeamMemberOptions(selectedName = "") {
    const memberOptions = teamMembers.map((member) => `
      <option value="${escapeHTML(member.name)}">${escapeHTML(member.name)}</option>
    `);
    const selectedMemberExists = teamMembers.some((member) => member.name === selectedName);

    if (selectedName && !selectedMemberExists) {
      memberOptions.unshift(`
        <option value="${escapeHTML(selectedName)}">Former team member — ${escapeHTML(selectedName)}</option>
      `);
    }

    assignedToSelect.innerHTML = `
      <option value="">Select a team member</option>
      ${memberOptions.join("")}
    `;
    assignedToSelect.disabled = teamMembers.length === 0;
    assignedToSelect.value = selectedName;
    assignedToHelp.textContent = teamMembers.length
      ? "Choose a member from your team."
      : "No team members are available. Add a team member before assigning tasks.";
    assignedToHelp.classList.toggle("assignee-help-error", teamMembers.length === 0);
  }

  function taskSearchText(task) {
    return [
      task.taskName,
      task.description,
      task.assignedTo,
      task.priority,
      task.status,
      task.deadline,
    ].join(" ").toLocaleLowerCase();
  }

  function getVisibleTasks() {
    const searchValue = searchTask.value.trim().toLocaleLowerCase();
    return tasks.filter((task) => !searchValue || taskSearchText(task).includes(searchValue));
  }

  function renderTaskRow(task) {
    const taskId = escapeHTML(task.id);
    const deadline = formatDate(task.deadline, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `
      <tr>
        <td>
          <span class="task-name">${escapeHTML(task.taskName || "Untitled task")}</span>
          <span class="task-description">${escapeHTML(task.description || "")}</span>
        </td>
        <td>${escapeHTML(task.assignedTo || "Unassigned")}</td>
        <td><span class="task-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${deadline}</span></td>
        <td><span class="task-badge ${priorityClass(task.priority)}">${escapeHTML(task.priority || "—")}</span></td>
        <td><span class="task-badge ${statusClass(task.status)}">${escapeHTML(task.status || "Unknown")}</span></td>
        <td>
          <div class="task-row-actions">
            <button type="button" class="task-action-button" data-task-action="edit" data-task-id="${taskId}" aria-label="Edit ${escapeHTML(task.taskName)}">
              <i class="fa-solid fa-pen" aria-hidden="true"></i>
            </button>
            <button type="button" class="task-action-button task-delete-button" data-task-action="delete" data-task-id="${taskId}" aria-label="Delete ${escapeHTML(task.taskName)}">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderAllTasks(taskList) {
    document.getElementById("taskCount").textContent = String(taskList.length);

    if (taskList.length === 0) {
      taskTableBody.innerHTML = `
        <tr><td colspan="6" class="tasks-empty-cell">
          <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
          <span>${tasks.length ? "No tasks match your search." : "No tasks yet. Add a task to get started."}</span>
        </td></tr>
      `;
      return;
    }

    const sortedTasks = [...taskList].sort((first, second) => {
      return (first.deadline || "9999-12-31").localeCompare(second.deadline || "9999-12-31");
    });
    taskTableBody.innerHTML = sortedTasks.map(renderTaskRow).join("");
  }

  function renderCalendar(taskList) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    calendarMonth.textContent = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(calendarDate);

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const tasksByDate = new Map();

    taskList.forEach((task) => {
      if (!parseDate(task.deadline)) {
        return;
      }
      const dayTasks = tasksByDate.get(task.deadline) || [];
      dayTasks.push(task);
      tasksByDate.set(task.deadline, dayTasks);
    });

    let cells = weekdays.map((weekday) => `
      <div class="calendar-weekday" role="columnheader">${weekday}</div>
    `).join("");

    for (let index = 0; index < 42; index += 1) {
      let day;
      let cellDate;
      let outsideMonth = false;

      if (index < startOffset) {
        day = daysInPreviousMonth - startOffset + index + 1;
        cellDate = new Date(year, month - 1, day);
        outsideMonth = true;
      } else if (index >= startOffset + daysInMonth) {
        day = index - startOffset - daysInMonth + 1;
        cellDate = new Date(year, month + 1, day);
        outsideMonth = true;
      } else {
        day = index - startOffset + 1;
        cellDate = new Date(year, month, day);
      }

      const dateKey = [
        cellDate.getFullYear(),
        String(cellDate.getMonth() + 1).padStart(2, "0"),
        String(cellDate.getDate()).padStart(2, "0"),
      ].join("-");
      const isToday = cellDate.toDateString() === today.toDateString();
      const dayTasks = tasksByDate.get(dateKey) || [];
      const classes = [
        "calendar-day",
        outsideMonth ? "calendar-day-outside" : "",
        isToday ? "calendar-day-today" : "",
      ].filter(Boolean).join(" ");
      const taskCards = dayTasks.map((task) => `
        <div class="calendar-task ${task.status === "Completed" ? "calendar-task-completed" : ""}" title="${escapeHTML(task.taskName)} — ${escapeHTML(task.priority)} priority">
          <span class="calendar-task-marker" aria-hidden="true"></span>
          <span class="calendar-task-name">${escapeHTML(task.taskName || "Untitled task")}</span>
          <span class="calendar-task-priority">${escapeHTML(task.priority || "—")}</span>
        </div>
      `).join("");

      cells += `
        <div class="${classes}" role="gridcell" aria-label="${formatDate(dateKey, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}${dayTasks.length ? `, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}` : ""}">
          <span class="calendar-day-number">${day}</span>
          <div class="calendar-day-tasks">${taskCards}</div>
        </div>
      `;
    }

    calendar.innerHTML = cells;
  }

  function renderCompletedTasks(taskList) {
    const completedTasks = taskList
      .filter((task) => task.status === "Completed")
      .sort((first, second) => (second.deadline || "").localeCompare(first.deadline || ""));
    document.getElementById("completedTaskCount").textContent = String(completedTasks.length);

    if (completedTasks.length === 0) {
      completedTaskGroups.innerHTML = `
        <div class="completed-empty">
          <i class="fa-regular fa-circle-check" aria-hidden="true"></i>
          <span>${tasks.some((task) => task.status === "Completed")
            ? "No completed tasks match your search."
            : "Completed tasks will appear here."}</span>
        </div>
      `;
      return;
    }

    const groups = new Map();
    completedTasks.forEach((task) => {
      const date = parseDate(task.deadline);
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : "no-date";
      const label = date
        ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date)
        : "No due date";
      if (!groups.has(key)) {
        groups.set(key, { label, tasks: [] });
      }
      groups.get(key).tasks.push(task);
    });

    completedTaskGroups.innerHTML = Array.from(groups.values()).map((group) => `
      <section class="completed-month" aria-label="Completed tasks for ${escapeHTML(group.label)}">
        <div class="completed-month-heading">
          <h3><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>${escapeHTML(group.label)}</h3>
          <span>${group.tasks.length} task${group.tasks.length === 1 ? "" : "s"}</span>
        </div>
        <div class="tasks-table-wrap">
          <table class="tasks-table completed-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Assigned to</th>
                <th scope="col">Due date</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>${group.tasks.map(renderTaskRow).join("")}</tbody>
          </table>
        </div>
      </section>
    `).join("");
  }

  function renderTaskViews() {
    visibleTasks = getVisibleTasks();
    renderAllTasks(visibleTasks);
    renderCalendar(visibleTasks);
    renderCompletedTasks(visibleTasks);
  }

  function closeModal() {
    taskModal.style.display = "none";
    taskForm.reset();
    editTaskId = null;
    modalHeading.textContent = "Add New Task";
    setSubmitButton("fa-plus", "Add Task");
  }

  function setSubmitButton(icon, label) {
    taskForm.querySelector("button[type='submit']").innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> ${label}`;
  }

  function openEditModal(id) {
    const task = tasks.find((item) => String(item.id) === String(id));
    if (!task) {
      return;
    }

    document.getElementById("taskName").value = task.taskName || "";
    document.getElementById("taskDescription").value = task.description || "";
    renderTeamMemberOptions(task.assignedTo || "");
    document.getElementById("priority").value = task.priority || "";
    document.getElementById("deadline").value = task.deadline || "";
    document.getElementById("status").value = task.status || "";
    editTaskId = id;
    modalHeading.textContent = "Edit Task";
    setSubmitButton("fa-pen", "Update Task");
    taskModal.style.display = "flex";
    document.getElementById("taskName").focus();
  }

  async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to delete task");
      }
      tasks = tasks.filter((task) => String(task.id) !== String(id));
      renderTaskViews();
      alert("Task deleted successfully!");
    } catch (error) {
      alert("Could not connect to the tasks API. Start JSON Server and try again.");
    }
  }

  function handleTaskAction(event) {
    const button = event.target.closest("[data-task-action]");
    if (!button) {
      return;
    }

    if (button.dataset.taskAction === "edit") {
      openEditModal(button.dataset.taskId);
    } else if (button.dataset.taskAction === "delete") {
      deleteTask(button.dataset.taskId);
    }
  }

  openTaskModal.addEventListener("click", function () {
    editTaskId = null;
    taskForm.reset();
    renderTeamMemberOptions();
    modalHeading.textContent = "Add New Task";
    setSubmitButton("fa-plus", "Add Task");
    taskModal.style.display = "flex";
    document.getElementById("taskName").focus();
  });

  closeTaskModal.addEventListener("click", closeModal);
  window.addEventListener("click", function (event) {
    if (event.target === taskModal) {
      closeModal();
    }
  });
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && taskModal.style.display === "flex") {
      closeModal();
    }
  });

  taskTableBody.addEventListener("click", handleTaskAction);
  completedTaskGroups.addEventListener("click", handleTaskAction);
  searchTask.addEventListener("input", renderTaskViews);

  document.getElementById("previousMonth").addEventListener("click", function () {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar(visibleTasks);
  });
  document.getElementById("nextMonth").addEventListener("click", function () {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar(visibleTasks);
  });
  document.getElementById("todayMonth").addEventListener("click", function () {
    calendarDate = new Date();
    calendarDate.setDate(1);
    renderCalendar(visibleTasks);
  });

  taskForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const taskData = {
      taskName: document.getElementById("taskName").value.trim(),
      description: document.getElementById("taskDescription").value.trim(),
      assignedTo: assignedToSelect.value,
      priority: document.getElementById("priority").value,
      deadline: document.getElementById("deadline").value,
      status: document.getElementById("status").value,
    };

    if (Object.values(taskData).some((value) => value === "")) {
      alert("Please fill all fields.");
      return;
    }

    const taskId = editTaskId;
    try {
      const response = await fetch(
        taskId === null ? API_URL : `${API_URL}/${encodeURIComponent(taskId)}`,
        {
          method: taskId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskId === null ? taskData : { id: taskId, ...taskData }),
        },
      );
      if (!response.ok) {
        throw new Error("Unable to save task");
      }
      const savedTask = await response.json();
      if (taskId === null) {
        tasks.push(savedTask);
        alert("Task added successfully!");
      } else {
        tasks = tasks.map((task) => String(task.id) === String(taskId) ? savedTask : task);
        alert("Task updated successfully!");
      }
      closeModal();
      renderTaskViews();
    } catch (error) {
      alert("Could not connect to the tasks API. Start JSON Server and try again.");
    }
  });

  async function loadTasks() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error("Unable to load tasks");
      }
      tasks = await response.json();
      renderTaskViews();
    } catch (error) {
      taskTableBody.innerHTML = `
        <tr><td colspan="6" class="tasks-empty-cell">
          Unable to load tasks. Start JSON Server on port 3000.
        </td></tr>
      `;
      calendar.innerHTML = `<p class="calendar-empty">Calendar unavailable until tasks can be loaded.</p>`;
      completedTaskGroups.innerHTML = `<div class="completed-empty">Completed tasks unavailable until tasks can be loaded.</div>`;
    }
  }

  async function loadTeamMembers() {
    try {
      const response = await fetch(TEAM_MEMBERS_API_URL);
      if (!response.ok) {
        throw new Error("Unable to load team members");
      }
      const members = await response.json();
      teamMembers = members.filter((member) => member && typeof member.name === "string" && member.name.trim());
      renderTeamMemberOptions();
    } catch (error) {
      assignedToSelect.innerHTML = '<option value="">Unable to load team members</option>';
      assignedToSelect.disabled = true;
      assignedToHelp.textContent = "Could not load team members. Start JSON Server and try again.";
      assignedToHelp.classList.add("assignee-help-error");
      console.error("Unable to load team members:", error);
    }
  }

  renderTaskViews();
  loadTasks();
  loadTeamMembers();
});
