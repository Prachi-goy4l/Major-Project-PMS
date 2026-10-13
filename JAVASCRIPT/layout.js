const SEARCH_API = "http://localhost:3000";
let searchableRecordsPromise;

async function searchEverything(query) {
    const searchTerm = query.trim().toLocaleLowerCase();

    if (!searchTerm) {
        return [];
    }

    if (!searchableRecordsPromise) {
        const collections = [
            { type: "Project", endpoint: "projects", href: "projects.html", icon: "fa-folder" },
            { type: "Task", endpoint: "tasks", href: "tasks.html", icon: "fa-square-check" },
            { type: "Team Member", endpoint: "teamMembers", href: "team.html", icon: "fa-users" },
            { type: "Event", endpoint: "events", href: "calendar.html", icon: "fa-calendar-days" }
        ];

        searchableRecordsPromise = Promise.all(collections.map(async function (collection) {
            const response = await fetch(`${SEARCH_API}/${collection.endpoint}`);

            if (!response.ok) {
                throw new Error(`Unable to search ${collection.endpoint}`);
            }

            const records = await response.json();
            return records.map(function (record) {
                const fields = Object.values(record)
                    .filter(function (value) {
                        return typeof value === "string" || typeof value === "number";
                    })
                    .map(String);

                return {
                    type: collection.type,
                    href: collection.href,
                    icon: collection.icon,
                    title: record.projectName || record.taskName || record.name || record.title || "Untitled",
                    detail: record.description || record.email || record.status || record.role || "",
                    searchText: fields.join(" ").toLocaleLowerCase()
                };
            });
        })).then(function (results) {
            return results.flat();
        }).catch(function (error) {
            searchableRecordsPromise = null;
            throw error;
        });
    }

    const records = await searchableRecordsPromise;
    return records.filter(function (record) {
        return record.searchText.includes(searchTerm);
    });
}

function initLayout(activePage) {
    const links = [
        { page: "dashboard", label: "Dashboard", href: "index.html", icon: "fa-house" },
        { page: "projects", label: "Projects", href: "projects.html", icon: "fa-folder" },
        { page: "tasks", label: "Tasks", href: "tasks.html", icon: "fa-square-check" },
        { page: "team", label: "Team", href: "team.html", icon: "fa-users" },
        { page: "calendar", label: "Calendar", href: "calendar.html", icon: "fa-calendar-days" }
    ];

    const sidebar = document.createElement("aside");
    sidebar.className = "layout-sidebar";
    sidebar.setAttribute("aria-label", "Main sidebar");
    sidebar.innerHTML = `
        <a class="layout-brand" href="index.html">
            <span class="layout-brand-icon" aria-hidden="true">
                <i class="fa-solid fa-layer-group"></i>
            </span>
            <span>Project<br>Management<br>System</span>
        </a>
        <nav class="layout-navigation" aria-label="Main navigation">
            <ul>
                ${links.map(function (link) {
                    const current = link.page === activePage;
                    return `
                        <li>
                            <a href="${link.href}"${current ? ' class="active" aria-current="page"' : ""}>
                                <i class="fa-solid ${link.icon}" aria-hidden="true"></i>
                                <span>${link.label}</span>
                            </a>
                        </li>
                    `;
                }).join("")}
            </ul>
        </nav>
        <div class="layout-tagline">Plan <span>|</span> Organize <span>|</span> Achieve</div>
    `;

    const topbar = document.createElement("div");
    topbar.className = "layout-topbar";
    topbar.setAttribute("role", "banner");
    topbar.innerHTML = `
        <button class="layout-menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false">
            <i class="fa-solid fa-bars" aria-hidden="true"></i>
        </button>
        <div class="layout-search-wrapper">
            <label class="layout-search">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <input type="search" placeholder="Search projects, tasks, or team members..." aria-label="Search" autocomplete="off">
            </label>
            <div class="layout-search-results" role="listbox" aria-label="Search results" hidden></div>
        </div>
        <div class="layout-user">
            <button class="layout-notifications" type="button" aria-label="Notifications">
                <i class="fa-regular fa-bell" aria-hidden="true"></i>
                <span class="layout-notification-count" aria-label="3 unread notifications">3</span>
            </button>
            <div class="layout-account">
                <button class="layout-account-toggle" type="button" aria-expanded="false" aria-haspopup="true">
                    <span class="layout-avatar" aria-hidden="true"></span>
                    <span class="layout-user-name"></span>
                    <i class="fa-solid fa-chevron-down layout-user-chevron" aria-hidden="true"></i>
                </button>
                <div class="layout-account-menu" role="menu" hidden>
                    <button class="layout-signout" type="button" role="menuitem">
                        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    `;

    let signedInUser = null;
    try {
        signedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    } catch (error) {
        console.error("Unable to read signed-in user:", error);
    }

    const displayName = signedInUser && signedInUser.name ? signedInUser.name : "Admin";
    topbar.querySelector(".layout-avatar").textContent = displayName.charAt(0).toUpperCase();
    topbar.querySelector(".layout-user-name").textContent = displayName;

    const pageContent = document.createElement("div");
    pageContent.className = "layout-main";

    const pageScripts = Array.from(document.body.children).filter(function (element) {
        return element.tagName === "SCRIPT";
    });

    Array.from(document.body.children).forEach(function (element) {
        if (!pageScripts.includes(element)) {
            pageContent.appendChild(element);
        }
    });

    document.body.append(sidebar, topbar, pageContent);
    pageScripts.forEach(function (script) {
        document.body.appendChild(script);
    });

    const menuToggle = topbar.querySelector(".layout-menu-toggle");
    menuToggle.addEventListener("click", function () {
        const isOpen = document.body.classList.toggle("layout-menu-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    sidebar.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            document.body.classList.remove("layout-menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation menu");
        });
    });

    const searchInput = topbar.querySelector(".layout-search input");
    const searchResults = topbar.querySelector(".layout-search-results");
    let searchRequest = 0;
    const accountToggle = topbar.querySelector(".layout-account-toggle");
    const accountMenu = topbar.querySelector(".layout-account-menu");

    accountToggle.addEventListener("click", function () {
        const isOpen = accountMenu.hidden;
        accountMenu.hidden = !isOpen;
        accountToggle.setAttribute("aria-expanded", String(isOpen));
    });

    topbar.querySelector(".layout-signout").addEventListener("click", function () {
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
    });

    function renderSearchResults(results, message) {
        searchResults.replaceChildren();

        if (message) {
            const status = document.createElement("p");
            status.className = "layout-search-message";
            status.textContent = message;
            searchResults.appendChild(status);
            searchResults.hidden = false;
            return;
        }

        results.forEach(function (result) {
            const link = document.createElement("a");
            link.className = "layout-search-result";
            link.href = result.href;
            link.setAttribute("role", "option");

            const icon = document.createElement("i");
            icon.className = `fa-solid ${result.icon}`;
            icon.setAttribute("aria-hidden", "true");

            const text = document.createElement("span");
            text.className = "layout-search-result-text";

            const title = document.createElement("strong");
            title.textContent = result.title;

            const detail = document.createElement("small");
            detail.textContent = `${result.type}${result.detail ? ` · ${result.detail}` : ""}`;

            text.append(title, detail);
            link.append(icon, text);
            searchResults.appendChild(link);
        });

        searchResults.hidden = results.length === 0;
    }

    searchInput.addEventListener("input", async function () {
        const query = searchInput.value.trim();
        const requestId = ++searchRequest;

        if (!query) {
            renderSearchResults([]);
            return;
        }

        renderSearchResults([], "Searching...");

        try {
            const results = await searchEverything(query);

            if (requestId !== searchRequest) {
                return;
            }

            renderSearchResults(results, results.length ? "" : "No matching results.");
        } catch (error) {
            if (requestId !== searchRequest) {
                return;
            }

            console.error("Search error:", error);
            renderSearchResults([], "Search is unavailable. Make sure JSON Server is running.");
        }
    });

    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            renderSearchResults([]);
            searchInput.blur();
            accountMenu.hidden = true;
            accountToggle.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("click", function (event) {
        if (!topbar.querySelector(".layout-search-wrapper").contains(event.target)) {
            renderSearchResults([]);
        }
        if (!topbar.querySelector(".layout-account").contains(event.target)) {
            accountMenu.hidden = true;
            accountToggle.setAttribute("aria-expanded", "false");
        }
    });
}
