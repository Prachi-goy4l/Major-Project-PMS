// Login js

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        // Get users from JSON Server
        const response = await fetch("http://localhost:3000/users");

        if (!response.ok) {
            alert("JSON Server is not running.");
            return;
        }

        const users = await response.json();

        // Find matching user
        const user = users.find(function (item) {
            return item.email === email && item.password === password;
        });

        if (user) {
            alert("Login successful!");

            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(user)
            );

            // Opening  dashboard
            window.location.href = "index.html";
        } else {
            alert("Invalid email or password.");
        }

    } catch (error) {
        console.error(error);
        alert("Unable to connect to JSON Server.");
    }
});

// Show or hide password
function togglePassword() {
    const password = document.getElementById("password");

    if (password.type === "password") {
        password.type = "text";
    } else {
        password.type = "password";
    }
}