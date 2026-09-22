
// DOM ELEMENTS

const teamForm = document.getElementById("teamForm");

const nameInput = document.getElementById("name");

const emailInput = document.getElementById("email");

const roleInput = document.getElementById("role");

const departmentInput = document.getElementById("department");

const teamBody = document.getElementById("teamBody");


// TEAM DATA

let teamMembers = [];

let editIndex = -1;


// LOAD TEAM MEMBERS FROM JSON SERVER

async function loadTeamMembers() {

    try {

        const response = await fetch(
            "http://localhost:3000/teamMembers"
        );

        if (!response.ok) {
            throw new Error("Unable to load team members");
        }

        teamMembers = await response.json();

        displayTeamMembers();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load team members. " +
            "Please make sure JSON Server is running."
        );
    }
}


// DISPLAY TEAM MEMBERS

function displayTeamMembers() {

    teamBody.innerHTML = "";

    if (teamMembers.length === 0) {

        teamBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No team members added yet.
                </td>
            </tr>
        `;

        return;
    }

    teamMembers.forEach((member, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${member.name}</td>

            <td>${member.email}</td>

            <td>${member.role}</td>

            <td>${member.department}</td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editMember(${index})">

                    <i class="fa-solid fa-pen"></i>
                    Edit

                </button>

                <button
                    class="delete-btn"
                    onclick="deleteMember(${index})">

                    <i class="fa-solid fa-trash"></i>
                    Delete

                </button>

            </td>
        `;

        teamBody.appendChild(row);
    });
}


// ADD / UPDATE MEMBER

teamForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = nameInput.value.trim();

    const email = emailInput.value.trim();

    const role = roleInput.value.trim();

    const department = departmentInput.value.trim();


    // Validate fields

    if (
        name === "" ||
        email === "" ||
        role === "" ||
        department === ""
    ) {

        alert("Please fill in all fields.");

        return;
    }


    // Validate Email

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        alert("Please enter a valid email address.");

        return;
    }


    // Check duplicate email

    const duplicateEmail = teamMembers.some(
        (member, index) =>
            member.email.toLowerCase() === email.toLowerCase()
            && index !== editIndex
    );

    if (duplicateEmail) {

        alert(
            "A team member with this email already exists."
        );

        return;
    }


    // Create Member Object

    const member = {

        name: name,

        email: email,

        role: role,

        department: department
    };


    try {

        // UPDATE

        if (editIndex !== -1) {

            const memberId = teamMembers[editIndex].id;

            const response = await fetch(
                `http://localhost:3000/teamMembers/${memberId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(member)
                }
            );

            if (!response.ok) {
                throw new Error("Unable to update member");
            }

            alert("Team member updated successfully.");

            editIndex = -1;

            changeButtonToAdd();
        }


        // ADD

        else {

            const response = await fetch(
                "http://localhost:3000/teamMembers",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(member)
                }
            );

            if (!response.ok) {
                throw new Error("Unable to add member");
            }

            alert("Team member added successfully.");
        }


        // Reload data

        await loadTeamMembers();


        // Clear Form

        teamForm.reset();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to save team member. " +
            "Please make sure JSON Server is running."
        );
    }

});


// EDIT MEMBER

function editMember(index) {

    const member = teamMembers[index];

    nameInput.value = member.name;

    emailInput.value = member.email;

    roleInput.value = member.role;

    departmentInput.value = member.department;

    editIndex = index;


    // Change Button

    teamForm.querySelector("button").innerHTML = `
        <i class="fa-solid fa-pen"></i>
        Update Member
    `;


    // Scroll to form

    document.querySelector(".form-box").scrollIntoView({
        behavior: "smooth"
    });

}


// DELETE MEMBER

async function deleteMember(index) {

    const member = teamMembers[index];

    const confirmDelete = confirm(
        `Are you sure you want to delete ${member.name}?`
    );

    if (!confirmDelete) {

        return;
    }


    try {

        // Delete from JSON Server

        const response = await fetch(
            `http://localhost:3000/teamMembers/${member.id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to delete member");
        }


        // Refresh data

        await loadTeamMembers();


        // Reset edit mode if necessary

        if (editIndex === index) {

            editIndex = -1;

            teamForm.reset();

            changeButtonToAdd();
        }

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete team member."
        );
    }

}


// CHANGE BUTTON TO ADD

function changeButtonToAdd() {

    teamForm.querySelector("button").innerHTML = `
        <i class="fa-solid fa-user-plus"></i>
        Add Member
    `;

}


// INITIALIZE

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadTeamMembers();

    }
);
