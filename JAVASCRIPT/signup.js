// Signup JavaScript

const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Get form value
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Checking password
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    // Check password length
    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        // Get users from JSON Server
        const response = await fetch("http://localhost:3000/users");

        if (!response.ok) {
            throw new Error("Could not connect to JSON Server");
        }

        const users = await response.json();

        // Check if email already exists
        const existingUser = users.find(function (user) {
            return user.email.toLowerCase() === email.toLowerCase();
        });

        if (existingUser) {
            alert("An account with this email already exists.");
            return;
        }

        // Create new user
        const newUser = {
            name: name,
            email: email,
            password: password
        };

        // Add user to JSON Server
        const addUserResponse = await fetch(
            "http://localhost:3000/users",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newUser)
            }
        );

        if (!addUserResponse.ok) {
            throw new Error("Could not create account");
        }

        alert("Account created successfully!");

        // Go to login page
        window.location.href = "login.html";

    } catch (error) {
        console.error("Signup error:", error);

        alert(
            "Unable to connect to the server.\n" +
            "Please make sure JSON Server is running."
        );
    }
});

// Show or hide password
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
}