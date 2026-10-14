document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "http://localhost:3000/tasks";
  const user = PMS.requireUser();
  if (!user) {
    return;
  }
  const manager = PMS.isManager(user);
  const workspaceProjectId = PMS.projectIdFromUrl();
  let projects = [];
  let projectById = new Map();
  let activeProjectId = workspaceProjectId || "";
  const taskProjectSelect = document.getElementById("taskProject");
  const taskProjectField = document.getElementById("taskProjectField");
  const lockedTaskProject = document.getElementById("lockedTaskProject");

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
    const projectMembers = activeProjectId
      ? teamMembers.filter((member) =>
        Array.isArray(member.projectIds) && member.projectIds.map(String).includes(activeProjectId))
      : [];
    const memberOptions = projectMembers.map((member) => `
      <option value="${escapeHTML(member.name)}">${escapeHTML(member.name)}</option>
    `);
    const selectedMemberExists = projectMembers.some((member) => member.name === selectedName);

    if (selectedName && !selectedMemberExists) {
      memberOptions.unshift(`
        <option value="${escapeHTML(selectedName)}">Former team member — ${escapeHTML(selectedName)}</option>
      `);
    }

    assignedToSelect.innerHTML = `
      <option value="">Select a team member</option>
      ${memberOptions.join("")}
    `;
    assignedToSelect.disabled = projectMembers.length === 0;
    assignedToSelect.value = selectedName;
    assignedToHelp.textContent = projectMembers.length
      ? "Choose a member assigned to this project."
      : "No team members are assigned to this project.";
    assignedToHelp.classList.toggle("assignee-help-error", projectMembers.length === 0);
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
    return tasks.filter((task) =>
      (!searchValue || taskSearchText(task).includes(searchValue)) &&
      (!workspaceProjectId || String(task.projectId) === workspaceProjectId)
    );
  }

  function canUpdateTask(task) {
    if (manager) {
      return false;
    }
    const assignedMember = teamMembers.find((member) =>
      String(member.userId) === String(user.id) &&
      Array.isArray(member.projectIds) &&
      member.projectIds.map(String).includes(String(task.projectId)) &&
      member.name === task.assignedTo
    );
    return String(task.assignedToUserId || assignedMember?.userId || "") === String(user.id) ||
      (!task.assignedToUserId && !assignedMember && task.assignedTo === user.name);
  }

  function renderTaskRow(task) {
    const taskId = escapeHTML(task.id);
    const deadline = formatDate(task.deadline, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const projectName = projectById.get(String(task.projectId))?.projectName || "Unknown project";
    const actions = manager
      ? `
          <button type="button" class="task-action-button" data-task-action="edit" data-task-id="${taskId}" aria-label="Edit ${escapeHTML(task.taskName)}">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
          </button>
          <button type="button" class="task-action-button task-delete-button" data-task-action="delete" data-task-id="${taskId}" aria-label="Delete ${escapeHTML(task.taskName)}">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        `
      : canUpdateTask(task)
        ? `<select class="task-status-select" data-task-action="status" data-task-id="${taskId}" aria-label="Update status for ${escapeHTML(task.taskName)}">
            ${["To Do", "In Progress", "Completed"].map((status) =>
              `<option value="${status}"${task.status === status ? " selected" : ""}>${status}</option>`
            ).join("")}
          </select>`
        : '<span class="task-readonly-label">View only</span>';
    return `
      <tr>
        <td>
          <span class="task-name">${escapeHTML(task.taskName || "Untitled task")}</span>
          <span class="task-description">${escapeHTML(task.description || "")}</span>
        </td>
        <td>${escapeHTML(projectName)}</td>
        <td>${escapeHTML(task.assignedTo || "Unassigned")}</td>
        <td><span class="task-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${deadline}</span></td>
        <td><span class="task-badge ${priorityClass(task.priority)}">${escapeHTML(task.priority || "—")}</span></td>
        <td><span class="task-badge ${statusClass(task.status)}">${escapeHTML(task.status || "Unknown")}</span></td>
        <td>
          <div class="task-row-actions">
            ${actions}
          </div>
        </td>
      </tr>
    `;
  }

  function renderAllTasks(taskList) {
    document.getElementById("taskCount").textContent = String(taskList.length);

    if (taskList.length === 0) {
      const scopeTasks = workspaceProjectId
        ? tasks.filter((task) => String(task.projectId) === workspaceProjectId)
        : tasks;
      taskTableBody.innerHTML = `
        <tr><td colspan="7" class="tasks-empty-cell">
          <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
          <span>${scopeTasks.length ? "No tasks match your search." : "No tasks yet. Add a task to get started."}</span>
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
          <span>${taskList.some((task) => task.status === "Completed")
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
                <th scope="col">Project</th>
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
    if (!manager) {
      return;
    }
    const task = tasks.find((item) => String(item.id) === String(id));
    if (!task) {
      return;
    }

    activeProjectId = String(task.projectId);
    taskProjectSelect.value = activeProjectId;
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
    if (!manager) {
      return;
    }
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

    if (button.dataset.taskAction === "edit" && manager) {
      openEditModal(button.dataset.taskId);
    } else if (button.dataset.taskAction === "delete" && manager) {
      deleteTask(button.dataset.taskId);
    }
  }

  async function updateTaskStatus(event) {
    const select = event.target.closest('[data-task-action="status"]');
    if (!select || manager) {
      return;
    }
    const task = tasks.find((item) => String(item.id) === select.dataset.taskId);
    if (!task || !canUpdateTask(task)) {
      return;
    }
    const previousStatus = task.status;
    select.disabled = true;
    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      if (!response.ok) {
        throw new Error(`Unable to update task status (${response.status})`);
      }
      const updatedTask = await response.json();
      tasks = tasks.map((item) => String(item.id) === String(task.id) ? updatedTask : item);
      renderTaskViews();
    } catch (error) {
      console.error("Unable to update task status:", error);
      select.value = previousStatus;
      select.disabled = false;
      window.alert("Unable to update task status. Please try again.");
    }
  }

  openTaskModal.addEventListener("click", function () {
    if (!manager) {
      return;
    }
    editTaskId = null;
    taskForm.reset();
    if (workspaceProjectId) {
      activeProjectId = workspaceProjectId;
    } else {
      activeProjectId = taskProjectSelect.value;
    }
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
  taskTableBody.addEventListener("change", updateTaskStatus);
  completedTaskGroups.addEventListener("change", updateTaskStatus);
  searchTask.addEventListener("input", renderTaskViews);
  taskProjectSelect.addEventListener("change", function () {
    activeProjectId = taskProjectSelect.value;
    renderTeamMemberOptions();
  });

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
    if (!manager) {
      return;
    }
    const taskProjectId = workspaceProjectId || taskProjectSelect.value;
    const assignedMember = teamMembers.find((member) =>
      member.name === assignedToSelect.value &&
      Array.isArray(member.projectIds) &&
      member.projectIds.map(String).includes(String(taskProjectId))
    );
    const taskData = {
      taskName: document.getElementById("taskName").value.trim(),
      description: document.getElementById("taskDescription").value.trim(),
      assignedTo: assignedToSelect.value,
      assignedToUserId: assignedMember?.userId || "",
      projectId: String(taskProjectId),
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
      const refreshedUser = await PMS.refreshCurrentUser();
      if (refreshedUser) {
        Object.assign(user, refreshedUser);
      }
      const [projectRecords, taskRecords, memberRecords] = await Promise.all([
        PMS.fetchCollection("projects"),
        PMS.fetchCollection("tasks"),
        PMS.fetchCollection("teamMembers")
      ]);
      projects = PMS.accessibleProjects(projectRecords, user);
      projectById = new Map(projects.map((project) => [String(project.id), project]));
      const allowedProjectIds = new Set(projects.map((project) => String(project.id)));
      if (workspaceProjectId && !allowedProjectIds.has(workspaceProjectId)) {
        window.location.replace("projects.html");
        return;
      }
      tasks = taskRecords.filter((task) => allowedProjectIds.has(String(task.projectId)));
      teamMembers = memberRecords.filter((member) =>
        Array.isArray(member.projectIds) &&
        member.projectIds.some((id) => allowedProjectIds.has(String(id))) &&
        typeof member.name === "string" && member.name.trim()
      );
      taskProjectSelect.replaceChildren(
        new Option("Select a project", ""),
        ...projects.map((project) => new Option(project.projectName || "Untitled project", String(project.id)))
      );
      if (workspaceProjectId) {
        taskProjectField.hidden = true;
        taskProjectSelect.disabled = true;
        lockedTaskProject.hidden = false;
        lockedTaskProject.textContent = `Project: ${projectById.get(workspaceProjectId)?.projectName || "Selected project"}`;
        document.getElementById("taskScopeDescription").textContent =
          `Tasks and deadlines for ${projectById.get(workspaceProjectId)?.projectName || "this project"}.`;
      } else {
        taskProjectSelect.disabled = false;
      }
      if (!manager) {
        openTaskModal.hidden = true;
        openTaskModal.style.display = "none";
        document.getElementById("taskForm").querySelectorAll("label, input, textarea, select, small, button").forEach((element) => {
          element.disabled = true;
        });
      } else if (projects.length === 0) {
        openTaskModal.disabled = true;
      }
      renderTaskViews();
    } catch (error) {
      console.error("Unable to load tasks:", error);
      taskTableBody.innerHTML = `
        <tr><td colspan="7" class="tasks-empty-cell">
          Unable to load tasks. Start JSON Server on port 3000.
        </td></tr>
      `;
      calendar.innerHTML = `<p class="calendar-empty">Calendar unavailable until tasks can be loaded.</p>`;
      completedTaskGroups.innerHTML = `<div class="completed-empty">Completed tasks unavailable until tasks can be loaded.</div>`;
    }
  }

  renderTaskViews();
  loadTasks();
});
