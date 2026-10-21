
/* =====================================================
   WORKSPHERE NOTIFICATIONS
   ===================================================== */

(function () {
    "use strict";

    const API_URL = "http://localhost:3000";
    const NOTIFICATIONS_URL = `${API_URL}/notifications`;
    const TASKS_URL = `${API_URL}/tasks`;
    const MEETINGS_URL = `${API_URL}/meetings`;
    const MEETING_REQUESTS_URL = `${API_URL}/meetingRequests`;
    const READ_STORAGE_KEY = "worksphere_read_notifications";

    let currentUser = null;
    let notificationItems = [];
    let dropdown = null;
    let bellButton = null;
    let countBadge = null;
    let refreshTimer = null;

    /* =====================================================
       CURRENT USER
       ===================================================== */

    function getCurrentUser() {
        // Prefer the application's existing current-user object.
        if (window.currentUser && typeof window.currentUser === "object") {
            return window.currentUser;
        }

        // Support common localStorage session formats.
        const possibleKeys = [
            "currentUser",
            "loggedInUser",
            "user",
            "loggedInUserId"
        ];

        for (const key of possibleKeys) {
            const storedValue = localStorage.getItem(key);

            if (!storedValue) continue;

            try {
                const parsed = JSON.parse(storedValue);

                if (parsed && typeof parsed === "object") {
                    return parsed;
                }

                if (typeof parsed === "string") {
                    return { id: parsed, name: parsed };
                }
            } catch {
                return {
                    id: storedValue,
                    name: storedValue
                };
            }
        }

        return null;
    }

    function getUserIdentifiers(user) {
        if (!user) return [];

        return [
            user.id,
            user.userId,
            user.email,
            user.name,
            user.username
        ]
            .filter(value => value !== undefined && value !== null)
            .map(value => String(value).trim().toLowerCase())
            .filter(Boolean);
    }

    function matchesCurrentUser(value) {
        if (!currentUser || value === undefined || value === null) {
            return false;
        }

        const userIds = getUserIdentifiers(currentUser);

        if (Array.isArray(value)) {
            return value.some(item => matchesCurrentUser(item));
        }

        if (typeof value === "object") {
            return matchesCurrentUser(
                value.id ??
                value.userId ??
                value.email ??
                value.name ??
                value.username
            );
        }

        return userIds.includes(String(value).trim().toLowerCase());
    }

    /* =====================================================
       READ STATUS
       ===================================================== */

    function getReadIds() {
        try {
            const saved = localStorage.getItem(READ_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    function saveReadIds(ids) {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
    }

    function isRead(id) {
        return getReadIds().includes(String(id));
    }

    function markAsRead(id) {
        const ids = getReadIds();
        const normalizedId = String(id);

        if (!ids.includes(normalizedId)) {
            ids.push(normalizedId);
            saveReadIds(ids);
        }
    }

    function markAllAsRead() {
        const ids = getReadIds();

        notificationItems.forEach(item => {
            if (!ids.includes(String(item.id))) {
                ids.push(String(item.id));
            }
        });

        saveReadIds(ids);
        renderNotifications();
    }

    /* =====================================================
       API HELPERS
       ===================================================== */

    async function fetchCollection(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Notification data could not be loaded:", error);
            return [];
        }
    }

    /* =====================================================
       TASK NOTIFICATIONS
       ===================================================== */

    function getTaskAssignee(task) {
        return (
            task.assignedToUserId ??
            task.assignedToId ??
            task.assignedUserId ??
            task.assignedToEmail ??
            task.assignedTo ??
            task.assignee ??
            task.assignedUser ??
            null
        );
    }

    function getTaskTitle(task) {
        return (
            task.title ??
            task.taskName ??
            task.name ??
            "Untitled task"
        );
    }

    function buildTaskNotifications(tasks) {
        return tasks
            .filter(task => matchesCurrentUser(getTaskAssignee(task)))
            .map(task => {
                const id = `task-${task.id}`;

                return {
                    id,
                    type: "task",
                    title: "Task assigned to you",
                    message: getTaskTitle(task),
                    sourceId: task.id,
                    date:
                        task.updatedAt ??
                        task.createdAt ??
                        task.dueDate ??
                        null
                };
            });
    }

    /* =====================================================
       MEETING NOTIFICATIONS
       ===================================================== */

    function getMeetingAttendees(meeting) {
        return (
            meeting.attendees ??
            meeting.participants ??
            meeting.invitedUsers ??
            meeting.attendeeIds ??
            meeting.participantIds ??
            meeting.requiredAttendees ??
            meeting.attendeesList ??
            []
        );
    }

    function buildMeetingNotifications(meetings) {
        return meetings
            .filter(meeting =>
                matchesCurrentUser(getMeetingAttendees(meeting))
            )
            .map(meeting => {
                const id = `meeting-${meeting.id}`;

                return {
                    id,
                    type: "meeting",
                    title: "Meeting you must attend",
                    message:
                        meeting.title ??
                        meeting.meetingName ??
                        meeting.name ??
                        "Scheduled meeting",
                    sourceId: meeting.id,
                    date:
                        meeting.dateTime ??
                        meeting.startTime ??
                        meeting.date ??
                        meeting.updatedAt ??
                        null
                };
            });
    }

    /* =====================================================
       SAVED NOTIFICATIONS
       Optional JSON Server collection: /notifications
       Supports userId, recipientId, recipientEmail,
       recipient, and user fields.
       ===================================================== */

    function belongsToCurrentUser(notification) {
        const recipient =
            notification.userId ??
            notification.recipientId ??
            notification.recipientEmail ??
            notification.recipient ??
            notification.user ??
            null;

        return matchesCurrentUser(recipient);
    }

    function buildSavedNotifications(notifications) {
        return notifications
            .filter(belongsToCurrentUser)
            .map(notification => ({
                id: `saved-${notification.id}`,
                type: notification.type ?? "general",
                title: notification.title ?? "Notification",
                message:
                    notification.message ??
                    notification.text ??
                    "",
                sourceId: notification.id,
                date:
                    notification.createdAt ??
                    notification.date ??
                    null
            }));
    }

    /* =====================================================
       LOAD AND MERGE NOTIFICATIONS
       ===================================================== */

    async function loadNotifications() {
        currentUser = getCurrentUser();

        if (!currentUser) {
            notificationItems = [];
            renderNotifications();
            return;
        }

        const [tasks, meetings, savedNotifications] =
            await Promise.all([
                fetchCollection(TASKS_URL),
                fetchCollection(MEETINGS_URL),
                fetchCollection(NOTIFICATIONS_URL)
            ]);

        const taskItems = buildTaskNotifications(tasks);
        const meetingItems = buildMeetingNotifications(meetings);
        const savedItems = buildSavedNotifications(savedNotifications);

        const combined = [
            ...taskItems,
            ...meetingItems,
            ...savedItems
        ];

        // Remove duplicate IDs and sort newest first when dates exist.
        const unique = new Map();

        combined.forEach(item => {
            unique.set(String(item.id), item);
        });

        notificationItems = Array.from(unique.values()).sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;

            return dateB - dateA;
        });

        renderNotifications();
    }

    /* =====================================================
       CREATE DROPDOWN
       ===================================================== */

    function createDropdown() {
        if (dropdown) return;

        dropdown = document.createElement("section");
        dropdown.className = "notification-dropdown";
        dropdown.setAttribute("aria-label", "Notifications");
        dropdown.hidden = true;

        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <button
                    type="button"
                    class="notification-mark-all"
                >
                    Mark all as read
                </button>
            </div>

            <div class="notification-list"></div>

            <div class="notification-empty" hidden>
                You have no notifications.
            </div>
        `;

        const markAllButton = dropdown.querySelector(
            ".notification-mark-all"
        );

        markAllButton.addEventListener("click", markAllAsRead);

        document.body.appendChild(dropdown);

        document.addEventListener("click", event => {
            if (
                dropdown &&
                !dropdown.contains(event.target) &&
                bellButton &&
                !bellButton.contains(event.target)
            ) {
                closeDropdown();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeDropdown();
            }
        });
    }

    function openDropdown() {
        if (!dropdown) return;

        positionDropdown();
        dropdown.hidden = false;

        if (bellButton) {
            bellButton.setAttribute("aria-expanded", "true");
        }
    }

    function closeDropdown() {
        if (!dropdown) return;

        dropdown.hidden = true;

        if (bellButton) {
            bellButton.setAttribute("aria-expanded", "false");
        }
    }

    function toggleDropdown() {
        if (!dropdown) return;

        if (dropdown.hidden) {
            openDropdown();
        } else {
            closeDropdown();
        }
    }

    function positionDropdown() {
        if (!dropdown || !bellButton) return;

        const rect = bellButton.getBoundingClientRect();

        dropdown.style.position = "fixed";
        dropdown.style.top = `${Math.min(
            rect.bottom + 8,
            window.innerHeight - 120
        )}px`;

        dropdown.style.right = `${Math.max(
            12,
            window.innerWidth - rect.right
        )}px`;

        dropdown.style.left = "auto";
        dropdown.style.zIndex = "9999";
    }

    /* =====================================================
       RENDER NOTIFICATIONS
       ===================================================== */

    function formatDate(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function renderNotifications() {
        if (!dropdown) return;

        const list = dropdown.querySelector(".notification-list");
        const emptyMessage = dropdown.querySelector(".notification-empty");

        list.replaceChildren();

        const unreadCount = notificationItems.filter(
            item => !isRead(item.id)
        ).length;

        if (countBadge) {
            countBadge.textContent = unreadCount > 99
                ? "99+"
                : String(unreadCount);

            countBadge.setAttribute(
                "aria-label",
                `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            );
            countBadge.hidden = unreadCount === 0;
        }

        emptyMessage.hidden = notificationItems.length > 0;

        notificationItems.forEach(item => {
            const read = isRead(item.id);
            const element = document.createElement("article");

            element.className = "notification-item";
            if (read) element.classList.add("is-read");

            const icon = document.createElement("span");
            icon.className = "notification-item-icon";
            icon.textContent =
                item.type === "task" ? "✓" :
                item.type === "meeting" ? "◷" : "•";

            const content = document.createElement("div");
            content.className = "notification-item-content";

            const title = document.createElement("strong");
            title.textContent = item.title;

            const message = document.createElement("p");
            message.textContent = item.message;

            const date = document.createElement("small");
            date.textContent = formatDate(item.date);

            content.append(title, message, date);
            element.append(icon, content);

            if (!read) {
                const markButton = document.createElement("button");
                markButton.type = "button";
                markButton.className = "notification-mark-read";
                markButton.textContent = "Mark read";
                markButton.setAttribute(
                    "aria-label",
                    `Mark ${item.title} as read`
                );

                markButton.addEventListener("click", event => {
                    event.stopPropagation();
                    markAsRead(item.id);
                    renderNotifications();
                });

                element.appendChild(markButton);
            }

            list.appendChild(element);
        });
    }

    /* =====================================================
       INITIALIZE
       ===================================================== */

    function init(root = document) {
        bellButton = root.querySelector(".layout-notifications") ||
            document.querySelector(".layout-notifications");

        if (!bellButton) {
            console.warn(
                "WorkSphere Notifications: bell button not found."
            );
            return;
        }

        countBadge = bellButton.querySelector(
            ".layout-notification-count"
        );

        if (!countBadge) {
            countBadge = document.createElement("span");
            countBadge.className = "layout-notification-count";
            countBadge.hidden = true;
            bellButton.appendChild(countBadge);
        }

        createDropdown();

        // Avoid registering duplicate click handlers.
        if (bellButton.dataset.notificationsInitialized !== "true") {
            bellButton.dataset.notificationsInitialized = "true";

            bellButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                toggleDropdown();
            });
        }

        window.addEventListener("resize", positionDropdown);
        window.addEventListener("scroll", positionDropdown, true);

        loadNotifications();

        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        refreshTimer = setInterval(loadNotifications, 30000);
    }

    /* =====================================================
       REFRESH EVENTS
       ===================================================== */

    document.addEventListener("workSphereTasksChanged", loadNotifications);
    document.addEventListener("workSphereMeetingsChanged", loadNotifications);
    document.addEventListener("workSphereNotificationCreated", loadNotifications);

    window.addEventListener("storage", event => {
        if (event.key === READ_STORAGE_KEY) {
            renderNotifications();
        }
    });

    window.WorkSphereNotifications = {
        init,
        refresh: loadNotifications,
        markAllAsRead,
        close: closeDropdown
    };
})();
