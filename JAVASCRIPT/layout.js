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
        <label class="layout-search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input type="search" placeholder="Search projects, tasks, or team members..." aria-label="Search">
        </label>
        <div class="layout-user">
            <button class="layout-notifications" type="button" aria-label="Notifications">
                <i class="fa-regular fa-bell" aria-hidden="true"></i>
                <span class="layout-notification-count" aria-label="3 unread notifications">3</span>
            </button>
            <span class="layout-avatar" aria-hidden="true">A</span>
            <span class="layout-user-name">Admin</span>
            <i class="fa-solid fa-chevron-down layout-user-chevron" aria-hidden="true"></i>
        </div>
    `;

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
}
