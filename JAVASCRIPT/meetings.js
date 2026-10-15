"use strict";

// ==========================================
// API CONFIGURATION
// ==========================================

const API = "http://localhost:3000";

const ENDPOINTS = {
    projects: `${API}/projects`,
    members: `${API}/teamMembers`,
    users: `${API}/users`,
    meetings: `${API}/meetings`,
    requests: `${API}/meetingRequests`,
    notifications: `${API}/notifications`
};

const $ = id => document.getElementById(id);

let currentUser = null;
let projects = [];
let members = [];
let users = [];
let meetings = [];
let requests = [];
let calendarDate = new Date();
let pageInitialized = false;


// ==========================================
// USER HELPERS
// ==========================================

function getCurrentUser() {
    if (window.PMS && typeof PMS.getUser === "function") {
        const user = PMS.getUser();
        if (user) return user;
    }

    const keys = [
        "pmsSession",
        "loggedInUser",
        "currentUser",
        "loggedInUserData",
        "user"
    ];

    for (const key of keys) {
        try {
            const value = localStorage.getItem(key);
            if (!value) continue;

            const parsed = JSON.parse(value);
            const user = parsed?.user || parsed;

            if (user && (user.id != null || user.email)) {
                return user;
            }
        } catch (_) {
            // Check the next storage key.
        }
    }

    return null;
}

function nameOf(user) {
    return user?.name ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.fullName ||
        user?.username ||
        user?.email ||
        "User";
}

function emailOf(user) {
    return String(user?.email || "").trim().toLowerCase();
}

function idOf(user) {
    return user?.id == null ? "" : String(user.id);
}

function roleOf(user) {
    return String(
        user?.role ||
        user?.userType ||
        user?.accountType ||
        ""
    ).trim().toLowerCase();
}

function isAdmin() {
    return ["admin", "administrator", "hr"].includes(roleOf(currentUser));
}

function isManager() {
    return isAdmin() || [
        "manager",
        "project manager",
        "department head",
        "team leader",
        "team lead",
        "lead"
    ].includes(roleOf(currentUser));
}

function sameUser(a, b) {
    if (!a || !b) return false;

    const sameId = idOf(a) && idOf(b) &&
        idOf(a) === idOf(b);

    const sameEmail = emailOf(a) && emailOf(b) &&
        emailOf(a) === emailOf(b);

    return Boolean(sameId || sameEmail);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function projectName(project) {
    return project?.projectName ||
        project?.name ||
        project?.title ||
        "Untitled Project";
}

function projectId(project) {
    return project?.id == null ? "" : String(project.id);
}

function projectKeys(project) {
    if (!project) return [];

    return [
        projectId(project),
        projectName(project)
    ].filter(Boolean).map(value => String(value).toLowerCase());
}


// ==========================================
// PROJECT AND MEMBER HELPERS
// ==========================================

function isProjectMember(member, project) {
    if (!member || !project) return false;

    const keys = projectKeys(project);

    const directValues = [
        member.projectId,
        member.project_id,
        member.project,
        member.projectName
    ].filter(value => value != null)
        .map(value => String(value).toLowerCase());

    if (directValues.some(value => keys.includes(value))) {
        return true;
    }

    const many = member.projectIds || member.projects;

    if (Array.isArray(many)) {
        return many.some(value => {
            const key = typeof value === "object"
                ? value.id ??
                  value.projectId ??
                  value.projectName ??
                  value.name
                : value;

            return key != null &&
                keys.includes(String(key).toLowerCase());
        });
    }

    return false;
}

function findUserForMember(member) {
    if (!member) return null;

    return users.find(user =>
        emailOf(user) && emailOf(user) === emailOf(member)
    ) || users.find(user =>
        member.userId != null &&
        idOf(user) === String(member.userId)
    ) || null;
}

function projectForMeeting(meeting) {
    const keys = [
        meeting?.projectId,
        meeting?.project_id,
        meeting?.projectName,
        meeting?.project
    ].filter(value => value != null)
        .map(value => String(value).toLowerCase());

    return projects.find(project =>
        projectKeys(project).some(key => keys.includes(key))
    ) || null;
}

function isAssignedToUser(record) {
    if (!currentUser || !record) return false;

    const ids = [
        record.organizerId,
        record.createdById,
        record.managerId,
        record.recipientId,
        record.userId,
        record.employeeId,
        record.requesterId
    ].filter(value => value != null).map(String);

    const emails = [
        record.organizerEmail,
        record.createdByEmail,
        record.managerEmail,
        record.recipientEmail,
        record.userEmail,
        record.employeeEmail,
        record.requesterEmail
    ].filter(Boolean).map(value => String(value).toLowerCase());

    return (
        (idOf(currentUser) && ids.includes(idOf(currentUser))) ||
        (emailOf(currentUser) && emails.includes(emailOf(currentUser)))
    );
}

function meetingVisibleToUser(meeting) {
    if (!currentUser || !meeting) return false;
    if (isAdmin()) return true;

    if (isAssignedToUser(meeting)) return true;

    const attendeeIds = Array.isArray(meeting.attendeeIds)
        ? meeting.attendeeIds.map(String)
        : [];

    const attendeeEmails = Array.isArray(meeting.attendeeEmails)
        ? meeting.attendeeEmails.map(value => String(value).toLowerCase())
        : [];

    if (attendeeIds.includes(idOf(currentUser))) return true;
    if (attendeeEmails.includes(emailOf(currentUser))) return true;

    const attendees = Array.isArray(meeting.attendees)
        ? meeting.attendees
        : [];

    if (attendees.some(attendee => {
        if (typeof attendee !== "object") {
            return String(attendee) === idOf(currentUser) ||
                String(attendee).toLowerCase() === emailOf(currentUser);
        }

        return sameUser(attendee, currentUser);
    })) {
        return true;
    }

    const project = projectForMeeting(meeting);

    return Boolean(project && members.some(member =>
        isProjectMember(member, project) &&
        sameUser(findUserForMember(member), currentUser)
    ));
}

function userCanAccessProject(project) {
    if (isAdmin()) return true;

    const isMember = members.some(member =>
        isProjectMember(member, project) &&
        sameUser(findUserForMember(member), currentUser)
    );

    if (isMember) return true;

    return meetings.some(meeting =>
        meetingVisibleToUser(meeting) &&
        projectForMeeting(meeting) &&
        projectId(projectForMeeting(meeting)) === projectId(project)
    );
}

function permittedProjects() {
    return projects.filter(userCanAccessProject);
}


// ==========================================
// API HELPERS
// ==========================================

async function apiGet(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed: ${url} (${response.status})`);
    }

    return response.json();
}

async function apiPost(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Could not save data to ${url}`);
    }

    return response.json();
}

async function apiPatch(url, data) {
    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Could not update ${url}`);
    }

    return response.json();
}


// ==========================================
// MESSAGES AND MODALS
// ==========================================

function showMessage(message, error = false) {
    const element = $("meetingMessage") || $("pageMessage");
    if (!element) return;

    element.hidden = false;
    element.textContent = message;
    element.classList.toggle("error", error);
}

function setFormMessage(id, message, error = false) {
    const element = $(id);
    if (!element) return;

    element.hidden = !message;
    element.textContent = message;
    element.classList.toggle("error", error);
}

function openModal(id) {
    const modal = $(id);
    if (!modal) {
        console.error(`Modal not found: ${id}`);
        return;
    }

    modal.hidden = false;
    modal.removeAttribute("aria-hidden");
    modal.classList.add("is-open");

    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = $(id);
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");

    if (!document.querySelector(".modal.is-open")) {
        document.body.classList.remove("modal-open");
    }
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(modal => {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        modal.classList.remove("is-open");
    });

    document.body.classList.remove("modal-open");
}


// ==========================================
// HEADER AND BUTTON PERMISSIONS
// ==========================================

function setUserHeader() {
    // The shared layout.js creates the topbar and sidebar.
    // Do not create a second header here.

    const scheduleButton = $("scheduleMeetingBtn");
    const quickScheduleButton = $("quickScheduleBtn");
    const requestButton = $("requestMeetingBtn");

    if (scheduleButton) {
        scheduleButton.hidden = !currentUser || !isManager();
    }

    if (quickScheduleButton) {
        quickScheduleButton.hidden = !currentUser || !isManager();
    }

    if (requestButton) {
        requestButton.hidden = !currentUser;
    }

    document.querySelectorAll(".manager-only").forEach(element => {
        element.hidden = !currentUser || !isManager();
    });
}


// ==========================================
// PROJECT DROPDOWNS
// ==========================================

function populateProjectSelects() {
    const permitted = permittedProjects();

    const configs = [
        ["projectFilter", "All Projects"],
        ["meetingProject", "Choose a project"],
        ["requestProject", "Choose a project"]
    ];

    configs.forEach(([id, placeholder]) => {
        const select = $(id);
        if (!select) return;

        const previousValue = select.value;

        select.innerHTML =
            `<option value="">${escapeHTML(placeholder)}</option>` +
            permitted.map(project =>
                `<option value="${escapeHTML(projectId(project))}">` +
                `${escapeHTML(projectName(project))}</option>`
            ).join("");

        if (permitted.some(project =>
            projectId(project) === previousValue
        )) {
            select.value = previousValue;
        }
    });

    updateRequestManager();
}

function getSelectedProject() {
    const select = $("meetingProject");
    if (!select) return null;

    return projects.find(project =>
        projectId(project) === select.value
    ) || null;
}

function getRequestProject() {
    const select = $("requestProject");
    if (!select) return null;

    return projects.find(project =>
        projectId(project) === select.value
    ) || null;
}


// ==========================================
// FIND PROJECT MANAGER
// ==========================================

function managerForProject(project) {
    if (!project) return null;

    const managerRoles = [
        "manager",
        "project manager",
        "team leader",
        "team lead",
        "department head",
        "admin",
        "administrator",
        "hr"
    ];

    // Prefer a manager who is explicitly assigned to this project.
    const assignedManager = members
        .filter(member => isProjectMember(member, project))
        .map(findUserForMember)
        .filter(Boolean)
        .find(user => managerRoles.includes(roleOf(user)));

    if (assignedManager) return assignedManager;

    const managerId = String(
        project.managerId ??
        project.projectManagerId ??
        project.teamLeaderId ??
        project.departmentHeadId ??
        ""
    );

    const managerEmail = String(
        project.managerEmail ??
        project.projectManagerEmail ??
        project.teamLeaderEmail ??
        ""
    ).toLowerCase();

    const directManager = users.find(user =>
        (managerId && idOf(user) === managerId) ||
        (managerEmail && emailOf(user) === managerEmail)
    );

    if (directManager) return directManager;

    // Fallback for projects without explicit manager assignment.
    return users.find(user =>
        managerRoles.includes(roleOf(user))
    ) || null;
}

function updateRequestManager() {
    const select = $("requestManager");
    if (!select) return;

    const project = getRequestProject();

    if (!project) {
        select.innerHTML =
            `<option value="">Select a project first</option>`;
        return;
    }

    const manager = managerForProject(project);

    if (!manager) {
        select.innerHTML =
            `<option value="">No manager found for this project</option>`;
        return;
    }

    const value = idOf(manager) || emailOf(manager);

    select.innerHTML =
        `<option value="${escapeHTML(value)}">` +
        `${escapeHTML(nameOf(manager))}</option>`;
}


// ==========================================
// ATTENDEE SELECTION
// ==========================================

function getProjectCandidates(project) {
    if (!project) return [];

    const candidates = members
        .filter(member => isProjectMember(member, project))
        .map(member => {
            const user = findUserForMember(member);

            if (user) return user;

            if (member.email || member.userId != null) {
                return {
                    id: member.userId ?? member.id,
                    email: member.email || "",
                    name: nameOf(member),
                    role: member.role || ""
                };
            }

            return null;
        })
        .filter(Boolean);

    // Include the project manager when they have a user account.
    const manager = managerForProject(project);

    if (manager && !candidates.some(user => sameUser(user, manager))) {
        candidates.push(manager);
    }

    return candidates.filter((user, index, all) =>
        all.findIndex(other => sameUser(other, user)) === index
    );
}

function updateAttendeeVisibility() {
    const mode = document.querySelector(
        'input[name="inviteMode"]:checked'
    )?.value;

    const field = $("attendeesField");
    const select = $("meetingAttendees");

    if (field) {
        field.hidden = mode === "project";
    }

    if (select) {
        select.required = mode !== "project";
    }
}

function populateAttendees() {
    const select = $("meetingAttendees");
    if (!select) return;

    const previousValues = [...select.selectedOptions].map(option => option.value);
    const project = getSelectedProject();
    const candidates = getProjectCandidates(project);

    select.innerHTML = candidates.map(user => {
        const value = emailOf(user) || idOf(user);

        return `<option value="${escapeHTML(value)}">` +
            `${escapeHTML(nameOf(user))}` +
            `${user.email ? ` (${escapeHTML(user.email)})` : ""}` +
            `</option>`;
    }).join("");

    [...select.options].forEach(option => {
        option.selected = previousValues.includes(option.value);
    });

    updateAttendeeVisibility();
}

function resolveSelectedRecipients(project) {
    const mode = document.querySelector(
        'input[name="inviteMode"]:checked'
    )?.value;

    const candidates = getProjectCandidates(project);

    if (mode === "project") {
        return candidates;
    }

    const select = $("meetingAttendees");
    if (!select) return [];

    const selectedValues = [...select.selectedOptions]
        .map(option => option.value);

    return candidates.filter(user =>
        selectedValues.includes(emailOf(user) || idOf(user))
    );
}


// ==========================================
// NOTIFICATIONS
// ==========================================

async function createNotification(
    recipient,
    title,
    message,
    type,
    relatedId
) {
    if (!recipient || (!idOf(recipient) && !emailOf(recipient))) {
        throw new Error("Notification recipient must have a user ID or email.");
    }

    return apiPost(ENDPOINTS.notifications, {
        recipientId: idOf(recipient),
        recipientEmail: emailOf(recipient),
        title,
        message,
        type,
        relatedId: String(relatedId ?? ""),
        read: false,
        createdAt: new Date().toISOString()
    });
}

async function notifyRecipients(
    recipients,
    title,
    message,
    type,
    relatedId
) {
    const uniqueRecipients = recipients.filter((recipient, index, all) =>
        all.findIndex(other => sameUser(other, recipient)) === index
    );

    const results = await Promise.allSettled(
        uniqueRecipients.map(recipient =>
            createNotification(recipient, title, message, type, relatedId)
        )
    );

    const failed = results.some(result =>
        result.status === "rejected"
    );

    if (failed) {
        console.error("Some notifications failed:", results);

        showMessage(
            "Saved, but some notifications could not be sent.",
            true
        );
    }

    document.dispatchEvent(
        new Event("workSphereNotificationCreated")
    );

    return !failed;
}


// ==========================================
// MEETING STATUS
// ==========================================

function meetingDateTime(meeting) {
    if (!meeting?.date) return null;

    const dateTime = new Date(
        `${meeting.date}T${meeting.time || "00:00"}`
    );

    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function effectiveMeetingStatus(meeting) {
    const status = String(meeting.status || "").toLowerCase();

    if (status === "cancelled") return "cancelled";
    if (status === "completed") return "completed";

    const dateTime = meetingDateTime(meeting);

    if (dateTime && dateTime < new Date()) {
        return "completed";
    }

    return "upcoming";
}


// ==========================================
// RENDER MEETINGS
// ==========================================

function renderMeetings() {
    const list = $("meetingList");
    if (!list) return;

    const statusFilter = $("statusFilter")?.value || "";
    const projectFilter = $("projectFilter")?.value || "";
    const search = $("meetingSearch")?.value.trim().toLowerCase() || "";

    const visible = meetings.filter(meeting => {
        if (!meetingVisibleToUser(meeting)) return false;

        const project = projectForMeeting(meeting);
        const meetingProjectId = project
            ? projectId(project)
            : String(meeting.projectId ?? "");

        if (projectFilter && meetingProjectId !== projectFilter) {
            return false;
        }

        const status = effectiveMeetingStatus(meeting);

        if (statusFilter && statusFilter !== "all" &&
            status !== statusFilter) {
            return false;
        }

        const searchable = [
            meeting.title,
            meeting.agenda,
            meeting.projectName,
            meeting.project,
            project ? projectName(project) : ""
        ].join(" ").toLowerCase();

        return searchable.includes(search);
    }).sort((a, b) =>
        (meetingDateTime(a)?.getTime() || 0) -
        (meetingDateTime(b)?.getTime() || 0)
    );

    list.innerHTML = visible.length ? visible.map(meeting => {
        const project = projectForMeeting(meeting);
        const status = effectiveMeetingStatus(meeting);

        return `
            <article class="meeting-card">
                <div class="meeting-icon">
                    <i class="fa-regular fa-calendar-check"></i>
                </div>

                <div class="meeting-info">
                    <h3>${escapeHTML(meeting.title || "Meeting")}</h3>

                    <p>${escapeHTML(
                        project
                            ? projectName(project)
                            : meeting.projectName || meeting.project || "Project"
                    )}</p>

                    <p>
                        <i class="fa-regular fa-clock"></i>
                        ${escapeHTML(meeting.date || "Date not set")}
                        ${escapeHTML(meeting.time || "")}
                        · ${Number(meeting.duration || 30)} minutes
                    </p>

                    <p>${escapeHTML(meeting.agenda || "")}</p>

                    ${meeting.link
                        ? `<p><a href="${escapeHTML(meeting.link)}"
                            target="_blank" rel="noopener noreferrer">
                            Join Meeting</a></p>`
                        : ""}

                    <span class="meeting-status ${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </div>
            </article>`;
    }).join("") : `
        <div class="empty-state">
            <i class="fa-regular fa-calendar"></i>
            <p>No meetings found.</p>
        </div>`;

    const visibleMeetings = meetings.filter(meetingVisibleToUser);

    if ($("totalMeetings")) {
        $("totalMeetings").textContent = visibleMeetings.length;
    }

    if ($("upcomingMeetings")) {
        $("upcomingMeetings").textContent = visibleMeetings.filter(meeting =>
            effectiveMeetingStatus(meeting) === "upcoming"
        ).length;
    }

    if ($("completedMeetings")) {
        $("completedMeetings").textContent = visibleMeetings.filter(meeting =>
            effectiveMeetingStatus(meeting) === "completed"
        ).length;
    }

    renderCalendar();
}


// ==========================================
// CALENDAR
// ==========================================

function renderCalendar() {
    const monthElement = $("calendarMonth");
    const daysElement = $("calendarDays");

    if (!monthElement || !daysElement) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    monthElement.textContent = calendarDate.toLocaleDateString(
        undefined,
        { month: "long", year: "numeric" }
    );

    const firstDay = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const eventDates = new Set(
        meetings.filter(meetingVisibleToUser)
            .map(meeting => meeting.date)
            .filter(Boolean)
    );

    let html = "";

    for (let i = 0; i < firstDay; i++) {
        html += `<span class="calendar-empty"></span>`;
    }

    for (let day = 1; day <= numberOfDays; day++) {
        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-` +
            `${String(day).padStart(2, "0")}`;

        const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

        html += `
            <button type="button"
                class="calendar-day ${isToday ? "today" : ""} ${eventDates.has(date) ? "has-meeting" : ""}"
                data-date="${date}"
                aria-label="${date}">
                ${day}
            </button>`;
    }

    daysElement.innerHTML = html;
}

function showMeetingsForDate(date) {
    const list = $("meetingList");
    if (!list) return;

    const dateMeetings = meetings.filter(meeting =>
        meetingVisibleToUser(meeting) && meeting.date === date
    );

    list.innerHTML = dateMeetings.length
        ? dateMeetings.map(meeting => `
            <article class="meeting-card">
                <div class="meeting-icon">
                    <i class="fa-regular fa-calendar-check"></i>
                </div>
                <div class="meeting-info">
                    <h3>${escapeHTML(meeting.title || "Meeting")}</h3>
                    <p>${escapeHTML(meeting.date)} ${escapeHTML(meeting.time || "")}</p>
                    <p>${escapeHTML(meeting.agenda || "")}</p>
                </div>
            </article>
        `).join("")
        : `<div class="empty-state">
            <p>No meetings scheduled for ${escapeHTML(date)}.</p>
        </div>`;
}


// ==========================================
// MEETING REQUESTS
// ==========================================

function requestBelongsToUser(request) {
    return sameUser({
        id: request.requesterId,
        email: request.requesterEmail
    }, currentUser) || sameUser({
        id: request.managerId,
        email: request.managerEmail
    }, currentUser) || sameUser({
        id: request.recipientId,
        email: request.recipientEmail
    }, currentUser);
}

function canReviewRequest(request) {
    if (!isManager()) return false;
    if (isAdmin()) return true;

    return sameUser({
        id: request.managerId,
        email: request.managerEmail
    }, currentUser);
}

function renderRequests() {
    const list = $("meetingRequestsList") || $("requestList");
    if (!list) return;

    const relevant = requests.filter(request =>
        isAdmin() || requestBelongsToUser(request)
    );

    const pendingCount = relevant.filter(request =>
        String(request.status || "pending").toLowerCase() === "pending"
    ).length;

    if ($("pendingRequests")) {
        $("pendingRequests").textContent = pendingCount;
    }

    if ($("myRequests")) {
        $("myRequests").textContent = relevant.filter(request =>
            sameUser({
                id: request.requesterId,
                email: request.requesterEmail
            }, currentUser)
        ).length;
    }

    if (!relevant.length) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-comments"></i>
                <p>No meeting requests to display.</p>
            </div>`;
        return;
    }

    list.innerHTML = relevant.map(request => {
        const status = String(request.status || "pending").toLowerCase();
        const canReview = canReviewRequest(request) && status === "pending";

        return `
            <article class="request-card">
                <h3>${escapeHTML(request.title || "Meeting Request")}</h3>

                <p><strong>From:</strong>
                    ${escapeHTML(request.requesterName || request.requesterEmail || "Employee")}
                </p>

                <p><strong>Project:</strong>
                    ${escapeHTML(request.projectName || request.project || "Project")}
                </p>

                <p>${escapeHTML(request.agenda || request.reason || "")}</p>

                ${request.preferredDate
                    ? `<p><strong>Preferred date:</strong>
                        ${escapeHTML(request.preferredDate)}</p>`
                    : ""}

                ${request.preferredTime
                    ? `<p><strong>Preferred time:</strong>
                        ${escapeHTML(request.preferredTime)}</p>`
                    : ""}

                <p><strong>Status:</strong>
                    <span class="meeting-status ${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </p>

                ${canReview ? `
                    <div class="request-actions">
                        <button type="button" class="btn btn-primary"
                            data-review="${escapeHTML(request.id)}"
                            data-decision="approved">
                            Approve
                        </button>

                        <button type="button" class="btn btn-secondary"
                            data-review="${escapeHTML(request.id)}"
                            data-decision="rejected">
                            Reject
                        </button>
                    </div>
                ` : ""}
            </article>`;
    }).join("");
}


// ==========================================
// LOAD PAGE DATA
// ==========================================

async function loadPage() {
    currentUser = getCurrentUser();
    setUserHeader();

    if (!currentUser) {
        showMessage("Please log in before opening Meetings.", true);

        if ($("scheduleMeetingBtn")) {
            $("scheduleMeetingBtn").hidden = true;
        }

        if ($("quickScheduleBtn")) {
            $("quickScheduleBtn").hidden = true;
        }

        if ($("requestMeetingBtn")) {
            $("requestMeetingBtn").hidden = true;
        }

        return;
    }

    try {
        const [
            projectData,
            memberData,
            userData,
            meetingData,
            requestData
        ] = await Promise.all([
            apiGet(ENDPOINTS.projects),
            apiGet(ENDPOINTS.members),
            apiGet(ENDPOINTS.users),
            apiGet(ENDPOINTS.meetings),
            apiGet(ENDPOINTS.requests)
        ]);

        projects = Array.isArray(projectData) ? projectData : [];
        members = Array.isArray(memberData) ? memberData : [];
        users = Array.isArray(userData) ? userData : [];
        meetings = Array.isArray(meetingData) ? meetingData : [];
        requests = Array.isArray(requestData) ? requestData : [];

        populateProjectSelects();
        populateAttendees();
        renderMeetings();
        renderRequests();
        setUserHeader();

    } catch (error) {
        console.error("Meetings loading error:", error);

        showMessage(
            "Could not load meeting data. Check JSON Server and make sure db.json contains projects, teamMembers, users, meetings, and meetingRequests.",
            true
        );
    }
}


// ==========================================
// OPEN SCHEDULE AND REQUEST MODALS
// ==========================================

function openScheduleModal() {
    if (!isManager()) {
        showMessage(
            "Only managers and administrators can schedule meetings.",
            true
        );
        return;
    }

    $("scheduleForm")?.reset();
    setFormMessage("scheduleFormMessage", "");

    populateProjectSelects();
    populateAttendees();
    updateAttendeeVisibility();

    openModal("scheduleModal");
}

function openRequestModal() {
    $("requestForm")?.reset();
    setFormMessage("requestFormMessage", "");

    populateProjectSelects();
    updateRequestManager();

    openModal("requestModal");
}

function initializeModalControls() {
    // Use the data-close-modal attribute on the close/cancel buttons.
    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const target = button.getAttribute("data-close-modal");

            if (target) {
                closeModal(target);
            } else {
                const modal = button.closest(".modal");
                if (modal?.id) closeModal(modal.id);
            }
        });
    });

    // Support common close-button classes even if the HTML lacks
    // data-close-modal on the cross button.
    document.querySelectorAll(
        ".modal-close, .modal-close-btn, .close-modal, .close-btn, [aria-label='Close']"
    ).forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const modal = button.closest(".modal");

            if (modal?.id) {
                closeModal(modal.id);
            }
        });
    });

    // Clicking the backdrop closes the modal, but clicking the form
    // itself does not.
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeAllModals();
        }
    });
}


// ==========================================
// SCHEDULE MEETING
// ==========================================

async function handleScheduleSubmit(event) {
    event.preventDefault();

    if (!isManager()) {
        setFormMessage(
            "scheduleFormMessage",
            "Only managers and administrators can schedule meetings.",
            true
        );
        return;
    }

    const project = getSelectedProject();

    if (!project) {
        setFormMessage(
            "scheduleFormMessage",
            "Please select a project.",
            true
        );
        return;
    }

    const title = $("meetingTitle")?.value.trim() || "";
    const date = $("meetingDate")?.value || "";
    const time = $("meetingTime")?.value || "";

    if (!title || !date || !time) {
        setFormMessage(
            "scheduleFormMessage",
            "Please fill in the meeting title, date, and time.",
            true
        );
        return;
    }

    const scheduledDate = new Date(`${date}T${time}`);

    if (Number.isNaN(scheduledDate.getTime()) ||
        scheduledDate <= new Date()) {
        setFormMessage(
            "scheduleFormMessage",
            "Please select a future date and time.",
            true
        );
        return;
    }

    const recipients = resolveSelectedRecipients(project);

    if (!recipients.length) {
        setFormMessage(
            "scheduleFormMessage",
            "No attendees were found. Choose specific attendees or select the project-wide invitation option.",
            true
        );
        return;
    }

    const meeting = {
        title,
        projectId: projectId(project),
        projectName: projectName(project),
        date,
        time,
        duration: Number($("meetingDuration")?.value || 30),
        agenda: $("meetingAgenda")?.value.trim() || "",
        link: $("meetingLink")?.value.trim() || "",
        organizerId: idOf(currentUser),
        organizerEmail: emailOf(currentUser),
        organizerName: nameOf(currentUser),
        attendeeIds: recipients.map(idOf).filter(Boolean),
        attendeeEmails: recipients.map(emailOf).filter(Boolean),
        status: "scheduled",
        createdAt: new Date().toISOString()
    };

    const submitButton = event.currentTarget.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    try {
        const savedMeeting = await apiPost(ENDPOINTS.meetings, meeting);

        await notifyRecipients(
            recipients,
            `Meeting invitation: ${title}`,
            `${nameOf(currentUser)} invited you to "${title}" on ${date} at ${time}.`,
            "meeting_invitation",
            savedMeeting.id
        );

        closeModal("scheduleModal");
        $("scheduleForm")?.reset();

        showMessage("Meeting scheduled successfully.");
        await loadPage();

    } catch (error) {
        console.error("Schedule meeting error:", error);

        setFormMessage(
            "scheduleFormMessage",
            "Could not schedule the meeting. Check JSON Server and try again.",
            true
        );
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}


// ==========================================
// REQUEST A MEETING
// ==========================================

async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        setFormMessage(
            "requestFormMessage",
            "Please log in before requesting a meeting.",
            true
        );
        return;
    }

    const project = getRequestProject();
    const managerValue = $("requestManager")?.value || "";

    const manager = users.find(user =>
        idOf(user) === managerValue ||
        emailOf(user) === managerValue
    );

    if (!project) {
        setFormMessage(
            "requestFormMessage",
            "Please select a project.",
            true
        );
        return;
    }

    if (!manager) {
        setFormMessage(
            "requestFormMessage",
            "No manager was found for this project.",
            true
        );
        return;
    }

    const title = $("requestTitle")?.value.trim() || "";
    const agenda = $("requestAgenda")?.value.trim() || "";

    if (!title || !agenda) {
        setFormMessage(
            "requestFormMessage",
            "Please enter the meeting subject and details.",
            true
        );
        return;
    }

    const request = {
        title,
        agenda,
        projectId: projectId(project),
        projectName: projectName(project),
        requesterId: idOf(currentUser),
        requesterEmail: emailOf(currentUser),
        requesterName: nameOf(currentUser),
        managerId: idOf(manager),
        managerEmail: emailOf(manager),
        preferredDate: $("requestDate")?.value || "",
        preferredTime: $("requestTime")?.value || "",
        status: "pending",
        createdAt: new Date().toISOString()
    };

    const submitButton = event.currentTarget.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    try {
        const savedRequest = await apiPost(
            ENDPOINTS.requests,
            request
        );

        await createNotification(
            manager,
            `Meeting request from ${nameOf(currentUser)}`,
            `${nameOf(currentUser)} requested a meeting about "${title}".`,
            "meeting_request",
            savedRequest.id
        );

        document.dispatchEvent(
            new Event("workSphereNotificationCreated")
        );

        closeModal("requestModal");
        $("requestForm")?.reset();

        showMessage("Meeting request sent to your manager.");
        await loadPage();

    } catch (error) {
        console.error("Request meeting error:", error);

        setFormMessage(
            "requestFormMessage",
            "Could not send the request. Check JSON Server and try again.",
            true
        );
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}


// ==========================================
// APPROVE OR REJECT REQUEST
// ==========================================

async function handleRequestReview(event) {
    const button = event.target.closest("[data-review]");
    if (!button) return;

    const request = requests.find(item =>
        String(item.id) === button.dataset.review
    );

    if (!request || !canReviewRequest(request)) {
        showMessage("You are not authorized to review this request.", true);
        return;
    }

    const decision = button.dataset.decision;

    if (!["approved", "rejected"].includes(decision)) return;

    button.disabled = true;

    try {
        await apiPatch(
            `${ENDPOINTS.requests}/${encodeURIComponent(request.id)}`,
            {
                status: decision,
                reviewedById: idOf(currentUser),
                reviewedAt: new Date().toISOString()
            }
        );

        const requester = users.find(user =>
            sameUser({
                id: request.requesterId,
                email: request.requesterEmail
            }, user)
        );

        if (requester) {
            await createNotification(
                requester,
                `Meeting request ${decision}`,
                `Your meeting request "${request.title}" was ${decision}.`,
                "meeting_request_update",
                request.id
            );

            document.dispatchEvent(
                new Event("workSphereNotificationCreated")
            );
        }

        showMessage(`Meeting request ${decision}.`);
        await loadPage();

    } catch (error) {
        console.error("Review request error:", error);

        showMessage(
            "Could not update the meeting request. Please try again.",
            true
        );

        button.disabled = false;
    }
}


// ==========================================
// INITIALIZE EVENT LISTENERS
// ==========================================

function initializeMeetingsPage() {
    if (pageInitialized) return;
    pageInitialized = true;

    $("scheduleMeetingBtn")?.addEventListener("click", openScheduleModal);
    $("quickScheduleBtn")?.addEventListener("click", openScheduleModal);
    $("requestMeetingBtn")?.addEventListener("click", openRequestModal);

    $("viewRequestsBtn")?.addEventListener("click", () => {
        const panel = $("requestsPanel");
        if (!panel) return;

        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("closeRequestsBtn")?.addEventListener("click", () => {
        const panel = $("requestsPanel");
        if (panel) panel.hidden = true;
    });

    initializeModalControls();

    $("meetingProject")?.addEventListener("change", populateAttendees);
    $("requestProject")?.addEventListener("change", updateRequestManager);

    document.querySelectorAll('input[name="inviteMode"]').forEach(input => {
        input.addEventListener("change", updateAttendeeVisibility);
    });

    $("statusFilter")?.addEventListener("change", renderMeetings);
    $("projectFilter")?.addEventListener("change", renderMeetings);
    $("meetingSearch")?.addEventListener("input", renderMeetings);

    $("previousMonth")?.addEventListener("click", () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });

    $("nextMonth")?.addEventListener("click", () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    $("calendarDays")?.addEventListener("click", event => {
        const button = event.target.closest("[data-date]");
        if (button) showMeetingsForDate(button.dataset.date);
    });

    $("scheduleForm")?.addEventListener("submit", handleScheduleSubmit);
    $("requestForm")?.addEventListener("submit", handleRequestSubmit);

    const requestList = $("meetingRequestsList") || $("requestList");
    requestList?.addEventListener("click", handleRequestReview);

    loadPage();
}


// Initialize only once, whether this script loads before or after
// DOMContentLoaded. This avoids loading the page twice.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeMeetingsPage,
        { once: true }
    );
} else {
    initializeMeetingsPage();
}
