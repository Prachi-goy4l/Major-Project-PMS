(function () {
    const API_URL = "http://localhost:3000";
    const SESSION_KEY = "pmsSession";
    const USER_KEY = "loggedInUser";

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        } catch (error) {
            console.error("Unable to read the current session:", error);
            return null;
        }
    }

    function getUser() {
        const session = readSession();
        if (session && session.user) {
            return session.user;
        }

        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch (error) {
            console.error("Unable to read the signed-in user:", error);
            return null;
        }
    }

    function saveUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const previousSession = readSession() || {};
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            sessionId: previousSession.sessionId || createSessionId(),
            startedAt: previousSession.startedAt || new Date().toISOString(),
            userId: String(user.id),
            role: user.role,
            user: user
        }));
    }

    function createSessionId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function requireUser() {
        const user = getUser();
        if (!user || !user.id) {
            window.location.replace("login.html");
            return null;
        }
        return user;
    }

    function isManager(user) {
        return Boolean(user && user.role === "Manager");
    }

    function assignedProjectIds(user) {
        return Array.isArray(user && user.projectIds)
            ? user.projectIds.map(String)
            : [];
    }

    function accessibleProjects(projects, user) {
        if (isManager(user)) {
            return projects;
        }
        const allowedIds = new Set(assignedProjectIds(user));
        return projects.filter((project) => allowedIds.has(String(project.id)));
    }

    function canAccessProject(project, user) {
        return Boolean(project && user && (
            isManager(user) || assignedProjectIds(user).includes(String(project.id))
        ));
    }

    function projectIdFromUrl() {
        return new URLSearchParams(window.location.search).get("projectId");
    }

    function urlForPage(page, projectId) {
        const url = new URL(page, window.location.href);
        if (projectId) {
            url.searchParams.set("projectId", String(projectId));
        }
        return `${url.pathname.split("/").pop()}${url.search}`;
    }

    async function fetchCollection(collection) {
        const response = await fetch(`${API_URL}/${collection}`);
        if (!response.ok) {
            throw new Error(`Unable to load ${collection} (${response.status})`);
        }
        const records = await response.json();
        if (!Array.isArray(records)) {
            throw new Error(`${collection} response was not a list`);
        }
        return records;
    }

    async function refreshCurrentUser() {
        const user = getUser();
        if (!user || !user.id) {
            return null;
        }
        const response = await fetch(`${API_URL}/users/${encodeURIComponent(user.id)}`);
        if (!response.ok) {
            throw new Error(`Unable to refresh the signed-in user (${response.status})`);
        }
        const currentUser = await response.json();
        saveUser(currentUser);
        return currentUser;
    }

    window.PMS = {
        API_URL,
        getUser,
        saveUser,
        requireUser,
        isManager,
        assignedProjectIds,
        accessibleProjects,
        canAccessProject,
        projectIdFromUrl,
        urlForPage,
        fetchCollection,
        refreshCurrentUser
    };
}());
