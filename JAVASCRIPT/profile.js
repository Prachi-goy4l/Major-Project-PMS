document.addEventListener("DOMContentLoaded", function () {
    const user = PMS.requireUser();
    if (!user) {
        return;
    }

    const displayName = user.name || "User";
    document.getElementById("profileAvatar").textContent =
        displayName.trim().charAt(0).toUpperCase() || "U";
    document.getElementById("profileName").textContent = displayName;
    document.getElementById("profileEmail").textContent = user.email || "No email address on file";
    document.getElementById("profileFullName").textContent = displayName;
    document.getElementById("profileDetailEmail").textContent =
        user.email || "No email address on file";

    document.getElementById("profileSignout").addEventListener("click", function () {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("pmsSession");
        window.location.href = "login.html";
    });
});
