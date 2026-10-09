
document.addEventListener("DOMContentLoaded", function () {

    // Get Started buttons
    const getStartedButtons = document.querySelectorAll(
        '.nav-button, .primary-btn'
    );

    getStartedButtons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();

            // Open signup page
            window.location.href = "../HTML/signup.html";
        });
    });


    // Login button
    const loginButton = document.querySelector(
        '.nav-links a[href="login.html"]'
    );

    if (loginButton) {
        loginButton.addEventListener("click", function (event) {
            event.preventDefault();

            window.location.href = "../HTML/login.html";
        });
    }


    // Explore Features button
    const exploreButton = document.querySelector(".secondary-btn");

    if (exploreButton) {
        exploreButton.addEventListener("click", function (event) {
            event.preventDefault();

            const featuresSection = document.getElementById("features");

            if (featuresSection) {
                featuresSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    }


    // Start Managing button
    const startManagingButton = document.querySelector(".cta-button");

    if (startManagingButton) {
        startManagingButton.addEventListener("click", function (event) {
            event.preventDefault();

            window.location.href = "signup.html";
        });
    }


    // Smooth scrolling for internal navigation links
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                event.preventDefault();

                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

    });


    // Dashboard preview tab interaction
    const previewTabs = document.querySelectorAll(".preview-tabs span");
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

        tab.style.cursor = "pointer";

        tab.addEventListener("click", function () {

            // Update active tab styling
            previewTabs.forEach(function (item) {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            const selectedTab = tab.textContent.trim();
            const selectedData = previewData[selectedTab];

            if (!selectedData) {
                return;
            }

            projectItems.forEach(function (item, index) {

                const nameElement = item.children[1];
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


    // Reveal feature cards when they enter the viewport
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
            threshold: 0.15
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