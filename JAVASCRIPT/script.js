
document.addEventListener("DOMContentLoaded", function () {
    // ================= NAVIGATION =================
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const navLinks = document.querySelector(".nav-links");

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener("click", function () {
            const isOpen = navLinks.classList.toggle("open");

            mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
            mobileMenuBtn.innerHTML = isOpen
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });

        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navLinks.classList.remove("open");
                mobileMenuBtn.setAttribute("aria-expanded", "false");
                mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            });
        });
    }

    // ================= ACTIVE NAV LINK =================
    const sectionLinks = document.querySelectorAll(
        '.nav-links a[href^="#"]'
    );

    const sections = Array.from(sectionLinks)
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    function updateActiveNavigation() {
        let currentSection = "";

        sections.forEach(function (section) {
            if (section.getBoundingClientRect().top <= 150) {
                currentSection = section.id;
            }
        });

        sectionLinks.forEach(function (link) {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === "#" + currentSection
            );
        });
    }

    window.addEventListener("scroll", updateActiveNavigation, {
        passive: true
    });
    updateActiveNavigation();

    // ================= SMOOTH SCROLL =================
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            const targetId = link.getAttribute("href");
            const targetElement = document.querySelector(targetId);

            if (!targetElement) return;

            event.preventDefault();

            targetElement.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches ? "auto" : "smooth",
                block: "start"
            });

            // Update the URL fragment without reloading the page.
            history.replaceState(null, "", targetId);
        });
    });

    // ================= DASHBOARD PREVIEW TABS =================
    const previewTabs = document.querySelectorAll(".preview-tabs button");
    const projectItems = document.querySelectorAll(".project-item");

    const previewData = {
        Projects: [
            ["Website Development", "In Progress"],
            ["Mobile App Design", "In Progress"],
            ["PMS Development", "Completed"]
        ],
        Tasks: [
            ["Design Dashboard", "In Progress"],
            ["Database Schema", "In Progress"],
            ["Test Authentication", "Completed"]
        ],
        Team: [
            ["Development Team", "Active"],
            ["Design Team", "Active"],
            ["Project Management", "Active"]
        ]
    };

    previewTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            previewTabs.forEach(function (item) {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            const selectedTab = tab.textContent.trim();
            const selectedData = previewData[selectedTab];

            if (!selectedData) return;

            projectItems.forEach(function (item, index) {
                const nameElement = item.querySelector(".preview-item-name");
                const statusElement = item.querySelector(".project-status");

                if (selectedData[index]) {
                    nameElement.textContent = selectedData[index][0];
                    statusElement.textContent = selectedData[index][1];
                    item.style.display = "flex";
                } else {
                    item.style.display = "none";
                }
            });
        });
    });

    // ================= FEATURE CARD REVEAL =================
    const featureCards = document.querySelectorAll(".feature-card");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12
        });

        featureCards.forEach(function (card) {
            observer.observe(card);
        });
    } else {
        featureCards.forEach(function (card) {
            card.classList.add("visible");
        });
    }
});
