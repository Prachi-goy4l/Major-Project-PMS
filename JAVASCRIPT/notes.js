/* =====================================================
   WORKSPHERE PROJECT NOTES
   File: js/notes.js
   ===================================================== */

(function () {
    "use strict";

    const API_URL = "http://localhost:3000";
    const NOTES_URL = `${API_URL}/notes`;

    let currentUser = null;
    let currentProjectId = null;
    let allProjects = [];
    let allNotes = [];
    let allMembers = [];
    let canLoadNotes = false;

    const $ = (selector) => document.querySelector(selector);

    const elements = {
        totalNotes: $("#totalNotes"),
        pinnedNotes: $("#pinnedNotes"),
        projectMembers: $("#projectMembers"),
        myNotes: $("#myNotes"),
        notesGrid: $("#notesGrid"),
        emptyState: $("#emptyState"),
        notesMessage: $("#notesMessage"),
        searchNotes: $("#searchNotes"),
        sortNotes: $("#sortNotes"),
        projectFilter: $("#projectFilter"),
        tagFilter: $("#tagFilter"),
        addNoteBtn: $("#addNoteBtn"),
        emptyAddNoteBtn: $("#emptyAddNoteBtn"),
        modal: $("#noteModal"),
        modalTitle: $("#modalTitle"),
        closeModal: $("#closeNoteModal"),
        cancelBtn: $("#cancelNoteBtn"),
        form: $("#noteForm"),
        noteId: $("#noteId"),
        noteTitle: $("#noteTitle"),
        noteProject: $("#noteProject"),
        noteCategory: $("#noteCategory"),
        noteContent: $("#noteContent"),
        notePinned: $("#notePinned"),
        saveBtn: $("#saveNoteBtn"),
        formError: $("#formError")
    };

    /* =====================================================
       HELPERS
       ===================================================== */

    function normalize(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function getUserId(user) {
        return String(user?.id ?? user?.userId ?? "");
    }

    function getUserName(user) {
        return user?.name || user?.username || user?.email || "Unknown user";
    }

    function isManager() {
        return ["manager", "admin", "administrator"].includes(
            normalize(currentUser?.role)
        );
    }

    function getProjectIdFromURL() {
        if (window.PMS &&
            typeof window.PMS.projectIdFromUrl === "function") {
            return window.PMS.projectIdFromUrl();
        }

        const params = new URLSearchParams(window.location.search);
        return params.get("projectId") || params.get("project");
    }

    function getProjectName(projectId) {
        const project = allProjects.find(
            item => String(item.id) === String(projectId)
        );

        return project?.projectName || project?.name || "Project";
    }

    function showMessage(message, isError = false) {
        elements.notesMessage.textContent = message;
        elements.notesMessage.classList.toggle("error", isError);
        elements.notesMessage.hidden = false;
    }

    function hideMessage() {
        elements.notesMessage.hidden = true;
        elements.notesMessage.textContent = "";
        elements.notesMessage.classList.remove("error");
    }

    async function fetchJSON(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body ? {
                    "Content-Type": "application/json"
                } : {}),
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            throw new Error(
                `Request failed (${response.status}). Please try again.`
            );
        }

        if (response.status === 204) return null;

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async function fetchCollection(name) {
        if (window.PMS &&
            typeof window.PMS.fetchCollection === "function") {
            const result = await window.PMS.fetchCollection(name);
            return Array.isArray(result) ? result : [];
        }

        const result = await fetchJSON(`${API_URL}/${name}`);
        return Array.isArray(result) ? result : [];
    }

    /* =====================================================
       USER AND PROJECT ACCESS
       ===================================================== */

    function getAccessibleProjects(projects) {
        if (window.PMS &&
            typeof window.PMS.accessibleProjects === "function") {
            return window.PMS.accessibleProjects(projects, currentUser);
        }

        if (isManager()) {
            return projects;
        }

        const assignedIds = new Set(
            (currentUser?.projectIds || []).map(String)
        );

        return projects.filter(project => {
            if (assignedIds.has(String(project.id))) return true;

            return Array.isArray(project.assignedUserIds) &&
                project.assignedUserIds.some(
                    id => String(id) === getUserId(currentUser)
                );
        });
    }

    function isProjectMember(projectId) {
        return allProjects.some(project =>
            String(project.id) === String(projectId)
        );
    }

    function getProjectNotes() {
        return allNotes.filter(note =>
            String(note.projectId) === String(currentProjectId)
        );
    }

    function canEditNote(note) {
        if (isManager()) return true;

        const userId = getUserId(currentUser);

        return Boolean(userId) &&
            String(note.createdBy ?? note.createdById ?? "") === userId;
    }

    /* =====================================================
       PROJECT FILTERS
       ===================================================== */

    function populateProjectFilters() {
        const options = allProjects.map(project => {
            const id = String(project.id);
            const name = project.projectName || project.name || "Untitled";

            return {
                id,
                name
            };
        });

        elements.projectFilter.replaceChildren();
        elements.noteProject.replaceChildren();

        if (!currentProjectId) {
            elements.projectFilter.add(
                new Option("Select a project", "")
            );
        }

        options.forEach(project => {
            const option1 = new Option(project.name, project.id);
            const option2 = new Option(project.name, project.id);

            elements.projectFilter.add(option1);
            elements.noteProject.add(option2);
        });

        if (currentProjectId) {
            elements.projectFilter.value = String(currentProjectId);
            elements.projectFilter.disabled = true;
            elements.noteProject.value = String(currentProjectId);
        } else {
            elements.projectFilter.disabled = false;
        }
    }

    function populateCategoryFilter() {
        const previousValue = elements.tagFilter.value;
        const categories = [
            ...new Set(
                getProjectNotes()
                    .map(note => note.category || "General")
                    .filter(Boolean)
            )
        ].sort();

        elements.tagFilter.replaceChildren(
            new Option("All categories", "")
        );

        categories.forEach(category => {
            elements.tagFilter.add(
                new Option(category, category)
            );
        });

        if (categories.includes(previousValue)) {
            elements.tagFilter.value = previousValue;
        }
    }

    /* =====================================================
       STATISTICS
       ===================================================== */

    function updateStatistics(notes) {
        const userId = getUserId(currentUser);

        elements.totalNotes.textContent = notes.length;

        elements.pinnedNotes.textContent = notes.filter(
            note => note.isPinned === true
        ).length;

        elements.myNotes.textContent = notes.filter(note =>
            String(note.createdBy ?? note.createdById ?? "") === userId
        ).length;

        const projectMembers = allMembers.filter(member => {
            const projectIds = Array.isArray(member.projectIds)
                ? member.projectIds.map(String)
                : member.projectId != null
                    ? [String(member.projectId)]
                    : [];

            return projectIds.includes(String(currentProjectId));
        });

        const uniqueMembers = new Set(
            projectMembers.map(member =>
                String(member.userId ?? member.id ?? member.email ?? member.name)
            )
        );

        // Include the current user if present in the project's user list.
        elements.projectMembers.textContent = uniqueMembers.size;
    }

    /* =====================================================
       FILTER AND SORT
       ===================================================== */

    function getVisibleNotes() {
        const search = normalize(elements.searchNotes.value);
        const category = elements.tagFilter.value;

        let notes = getProjectNotes();

        if (search) {
            notes = notes.filter(note => [
                note.title,
                note.content,
                note.createdByName,
                note.category,
                getProjectName(note.projectId)
            ].some(value => normalize(value).includes(search)));
        }

        if (category) {
            notes = notes.filter(
                note => (note.category || "General") === category
            );
        }

        notes = [...notes];

        const sort = elements.sortNotes.value;

        if (sort === "title") {
            notes.sort((a, b) =>
                String(a.title || "").localeCompare(String(b.title || ""))
            );
        } else if (sort === "oldest") {
            notes.sort((a, b) =>
                new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
            );
        } else {
            // Pinned notes appear first, then newest notes.
            notes.sort((a, b) => {
                if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
                    return Number(Boolean(b.isPinned)) -
                        Number(Boolean(a.isPinned));
                }

                return new Date(b.updatedAt || b.createdAt || 0) -
                    new Date(a.updatedAt || a.createdAt || 0);
            });
        }

        return notes;
    }

    /* =====================================================
       RENDER NOTES
       ===================================================== */

    function formatDate(value) {
        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function renderNotes() {
        if (!canLoadNotes) return;

        hideMessage();

        const projectNotes = getProjectNotes();
        const visibleNotes = getVisibleNotes();

        updateStatistics(projectNotes);
        populateCategoryFilter();

        elements.notesGrid.replaceChildren();
        elements.emptyState.hidden = visibleNotes.length > 0;

        visibleNotes.forEach(note => {
            const card = document.createElement("article");
            card.className = "note-card";

            const canEdit = canEditNote(note);
            const title = escapeHTML(note.title || "Untitled note");
            const content = escapeHTML(note.content || "");
            const category = escapeHTML(note.category || "General");
            const projectName = escapeHTML(getProjectName(note.projectId));
            const author = escapeHTML(note.createdByName || "Team member");
            const createdAt = escapeHTML(
                formatDate(note.updatedAt || note.createdAt)
            );

            card.innerHTML = `
                <div class="note-card-header">
                    <div class="note-icon">
                        <i class="fa-regular fa-note-sticky"></i>
                    </div>

                    <div class="note-heading">
                        <h3>${title}</h3>
                        <p class="note-project">${projectName}</p>
                    </div>

                    ${note.isPinned ? `
                        <span class="note-pin" title="Pinned note">
                            <i class="fa-solid fa-thumbtack"></i>
                        </span>
                    ` : ""}
                </div>

                <p class="note-content">${content}</p>

                <div class="note-meta">
                    <span class="note-category">${category}</span>
                    <span class="note-date">
                        <i class="fa-regular fa-clock"></i>
                        ${createdAt}
                    </span>
                </div>

                <div class="note-footer">
                    <span class="note-author">
                        <i class="fa-regular fa-user"></i>
                        ${author}
                    </span>

                    <div class="note-actions">
                        ${canEdit ? `
                            <button
                                type="button"
                                class="icon-btn pin-btn"
                                data-id="${escapeHTML(note.id)}"
                                title="${note.isPinned ? "Unpin note" : "Pin note"}"
                                aria-label="${note.isPinned ? "Unpin note" : "Pin note"}"
                            >
                                <i class="fa-solid fa-thumbtack"></i>
                            </button>

                            <button
                                type="button"
                                class="icon-btn edit-btn"
                                data-id="${escapeHTML(note.id)}"
                                title="Edit note"
                                aria-label="Edit note"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="icon-btn delete-btn"
                                data-id="${escapeHTML(note.id)}"
                                title="Delete note"
                                aria-label="Delete note"
                            >
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        ` : ""}
                    </div>
                </div>
            `;

            elements.notesGrid.appendChild(card);
        });

        elements.emptyState.hidden = visibleNotes.length > 0;

        if (projectNotes.length === 0) {
            elements.emptyState.querySelector("h3").textContent =
                "No notes yet";

            elements.emptyState.querySelector("p").textContent =
                "Create the first note to share useful information with this project team.";
        } else if (visibleNotes.length === 0) {
            elements.emptyState.querySelector("h3").textContent =
                "No matching notes";

            elements.emptyState.querySelector("p").textContent =
                "Try another search term or select a different category.";
        } else {
            elements.emptyState.querySelector("h3").textContent =
                "No notes found";
        }
    }

    /* =====================================================
       MODAL
       ===================================================== */

    function openModal(note = null) {
        if (!allProjects.length) {
            showMessage("You need access to a project before creating notes.", true);
            return;
        }

        elements.form.reset();
        elements.noteId.value = "";
        elements.formError.hidden = true;
        elements.saveBtn.disabled = false;

        if (note) {
            elements.modalTitle.textContent = "Edit Note";
            elements.noteId.value = String(note.id);
            elements.noteTitle.value = note.title || "";
            elements.noteProject.value = String(note.projectId);
            elements.noteCategory.value = note.category || "General";
            elements.noteContent.value = note.content || "";
            elements.notePinned.checked = Boolean(note.isPinned);
        } else {
            elements.modalTitle.textContent = "Create Note";
            elements.noteProject.value = String(currentProjectId);
            elements.noteCategory.value = "General";
            elements.notePinned.checked = false;
        }

        document.body.classList.add("modal-open");
        elements.modal.hidden = false;
        elements.noteTitle.focus();
    }

    function closeModal() {
        elements.modal.hidden = true;
        document.body.classList.remove("modal-open");
        elements.formError.hidden = true;
    }

    function showFormError(message) {
        elements.formError.textContent = message;
        elements.formError.hidden = false;
    }

    /* =====================================================
       CREATE AND UPDATE
       ===================================================== */

    async function saveNote(event) {
        event.preventDefault();

        const id = elements.noteId.value;
        const title = elements.noteTitle.value.trim();
        const content = elements.noteContent.value.trim();
        const projectId = elements.noteProject.value;
        const category = elements.noteCategory.value;
        const isPinned = elements.notePinned.checked;

        if (!title || !content || !projectId) {
            showFormError("Please complete all required fields.");
            return;
        }

        if (!isProjectMember(projectId)) {
            showFormError("You do not have access to this project.");
            return;
        }

        const existingNote = id
            ? allNotes.find(note => String(note.id) === String(id))
            : null;

        if (id && (!existingNote || !canEditNote(existingNote))) {
            showFormError("You do not have permission to edit this note.");
            return;
        }

        const now = new Date().toISOString();

        const noteData = {
            projectId: String(projectId),
            projectName: getProjectName(projectId),
            title,
            content,
            category,
            isPinned,
            updatedAt: now
        };

        if (existingNote) {
            noteData.createdBy = existingNote.createdBy;
            noteData.createdByName = existingNote.createdByName;
            noteData.createdAt = existingNote.createdAt;
        } else {
            noteData.createdBy = getUserId(currentUser);
            noteData.createdByName = getUserName(currentUser);
            noteData.createdAt = now;
        }

        elements.saveBtn.disabled = true;
        elements.saveBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
            const url = existingNote
                ? `${NOTES_URL}/${encodeURIComponent(id)}`
                : NOTES_URL;

            const savedNote = await fetchJSON(url, {
                method: existingNote ? "PUT" : "POST",
                body: JSON.stringify(
                    existingNote
                        ? { ...existingNote, ...noteData }
                        : noteData
                )
            });

            if (existingNote) {
                allNotes = allNotes.map(note =>
                    String(note.id) === String(id)
                        ? { ...existingNote, ...noteData, ...savedNote }
                        : note
                );
            } else if (savedNote) {
                allNotes.push(savedNote);
            }

            closeModal();
            renderNotes();
            showMessage(existingNote
                ? "Note updated successfully."
                : "Note created and shared with your project.");

            document.dispatchEvent(
                new CustomEvent("workSphereNotesChanged")
            );
        } catch (error) {
            showFormError(
                `${error.message} Check that JSON Server is running and the notes collection exists.`
            );
        } finally {
            elements.saveBtn.disabled = false;
            elements.saveBtn.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Note';
        }
    }

    /* =====================================================
       PIN / UNPIN
       ===================================================== */

    async function togglePin(id) {
        const note = allNotes.find(
            item => String(item.id) === String(id)
        );

        if (!note || !canEditNote(note)) return;

        try {
            const updatedNote = {
                ...note,
                isPinned: !note.isPinned,
                updatedAt: new Date().toISOString()
            };

            const savedNote = await fetchJSON(
                `${NOTES_URL}/${encodeURIComponent(id)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        isPinned: updatedNote.isPinned,
                        updatedAt: updatedNote.updatedAt
                    })
                }
            );

            allNotes = allNotes.map(item =>
                String(item.id) === String(id)
                    ? { ...updatedNote, ...savedNote }
                    : item
            );

            renderNotes();
        } catch (error) {
            showMessage(`Could not update the note: ${error.message}`, true);
        }
    }

    /* =====================================================
       DELETE
       ===================================================== */

    async function deleteNote(id) {
        const note = allNotes.find(
            item => String(item.id) === String(id)
        );

        if (!note || !canEditNote(note)) return;

        const confirmed = window.confirm(
            `Delete "${note.title || "this note"}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await fetchJSON(
                `${NOTES_URL}/${encodeURIComponent(id)}`,
                { method: "DELETE" }
            );

            allNotes = allNotes.filter(
                item => String(item.id) !== String(id)
            );

            renderNotes();
            showMessage("Note deleted successfully.");

            document.dispatchEvent(
                new CustomEvent("workSphereNotesChanged")
            );
        } catch (error) {
            showMessage(`Could not delete the note: ${error.message}`, true);
        }
    }

    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    function bindEvents() {
        elements.addNoteBtn.addEventListener("click", () => openModal());
        elements.emptyAddNoteBtn.addEventListener("click", () => openModal());
        elements.closeModal.addEventListener("click", closeModal);
        elements.cancelBtn.addEventListener("click", closeModal);

        elements.modal.addEventListener("click", event => {
            if (event.target === elements.modal) closeModal();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !elements.modal.hidden) {
                closeModal();
            }
        });

        elements.form.addEventListener("submit", saveNote);

        elements.searchNotes.addEventListener("input", renderNotes);
        elements.sortNotes.addEventListener("change", renderNotes);

        elements.tagFilter.addEventListener("change", renderNotes);

        elements.projectFilter.addEventListener("change", () => {
            const selectedId = elements.projectFilter.value;

            if (!selectedId) return;

            const params = new URLSearchParams(window.location.search);
            params.set("projectId", selectedId);

            // Preserve the project's existing URL when possible.
            const destination = window.PMS &&
                typeof window.PMS.urlForPage === "function"
                ? window.PMS.urlForPage("notes.html", selectedId)
                : `notes.html?${params.toString()}`;

            window.location.href = destination;
        });

        elements.notesGrid.addEventListener("click", event => {
            const button = event.target.closest("button[data-id]");
            if (!button) return;

            const id = button.dataset.id;

            if (button.classList.contains("edit-btn")) {
                const note = allNotes.find(
                    item => String(item.id) === String(id)
                );

                if (note && canEditNote(note)) openModal(note);
            }

            if (button.classList.contains("delete-btn")) {
                deleteNote(id);
            }

            if (button.classList.contains("pin-btn")) {
                togglePin(id);
            }
        });

        document.addEventListener("workSphereNotesChanged", loadNotes);
    }

    /* =====================================================
       LOAD DATA
       ===================================================== */

    async function loadNotes() {
        try {
            allNotes = await fetchCollection("notes");
            renderNotes();
        } catch (error) {
            showMessage(
                "Unable to load notes. Check JSON Server and your notes collection.",
                true
            );
        }
    }

    async function initializeNotes() {
        try {
            if (typeof window.initLayout === "function") {
                window.initLayout("notes");
            }

            currentUser = window.PMS &&
                typeof window.PMS.getUser === "function"
                ? window.PMS.getUser()
                : null;

            if (!currentUser) {
                showMessage(
                    "Your login session could not be identified. Please sign in again.",
                    true
                );
                return;
            }

            currentProjectId = getProjectIdFromURL();

            const [projects, members] = await Promise.all([
                fetchCollection("projects"),
                fetchCollection("teamMembers")
            ]);

            allProjects = getAccessibleProjects(projects);
            allMembers = members;

            if (currentProjectId) {
                allProjects = allProjects.filter(
                    project => String(project.id) === String(currentProjectId)
                );
            } else if (allProjects.length === 1) {
                currentProjectId = String(allProjects[0].id);
            }

            if (!allProjects.length) {
                showMessage(
                    "No accessible project was found. Open Notes from a project workspace.",
                    true
                );
                return;
            }

            if (!currentProjectId) {
                currentProjectId = String(allProjects[0].id);
            }

            populateProjectFilters();

            // The current project is now fixed for this workspace.
            elements.projectFilter.value = String(currentProjectId);
            elements.noteProject.value = String(currentProjectId);

            canLoadNotes = true;
            bindEvents();
            await loadNotes();
        } catch (error) {
            console.error("Notes initialization error:", error);

            showMessage(
                "Notes could not be initialized. Check your PMS session, layout.js, and JSON Server.",
                true
            );
        }
    }

    initializeNotes();
})();