/* DOM ELEMENTS */

const eventForm = document.getElementById("eventForm");

const eventTitle = document.getElementById("eventTitle");
const eventDate = document.getElementById("eventDate");
const eventType = document.getElementById("eventType");
const eventDescription = document.getElementById("eventDescription");

const calendarDays = document.getElementById("calendarDays");
const monthYear = document.getElementById("monthYear");

const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

const eventsList = document.getElementById("eventsList");


/* CALENDAR DATA */

let events = [];


/* Current calendar date */

let currentDate = new Date();


/* LOAD EVENTS FROM JSON SERVER */

async function loadEvents() {

    try {

        const response = await fetch(
            "http://localhost:3000/events"
        );

        if (!response.ok) {
            throw new Error("Unable to load events");
        }

        events = await response.json();

        renderCalendar();
        displayEvents();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load events. Please make sure JSON Server is running."
        );
    }
}


/* SAVE EVENTS */

async function saveEvents() {

    // Events are saved directly to JSON Server
    // through POST and DELETE requests.
}


/* RENDER CALENDAR */

function renderCalendar() {

    calendarDays.innerHTML = "";

    const year = currentDate.getFullYear();

    const month = currentDate.getMonth();


    /* Month name */

    const monthName = currentDate.toLocaleString(
        "default",
        {
            month: "long"
        }
    );

    monthYear.textContent =
        `${monthName} ${year}`;


    /* First day of month */

    const firstDay =
        new Date(year, month, 1).getDay();


    /* Number of days */

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();


    /* Today's date */

    const today = new Date();

    const todayDate = today.getDate();

    const todayMonth = today.getMonth();

    const todayYear = today.getFullYear();


    /* Empty cells before first day */

    for (let i = 0; i < firstDay; i++) {

        const emptyCell =
            document.createElement("div");

        emptyCell.classList.add(
            "calendar-day",
            "empty"
        );

        calendarDays.appendChild(emptyCell);
    }


    /* Create calendar dates */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dayCell =
            document.createElement("div");

        dayCell.classList.add(
            "calendar-day"
        );


        /* Check today */

        if (
            day === todayDate &&
            month === todayMonth &&
            year === todayYear
        ) {

            dayCell.classList.add("today");
        }


        /* Date number */

        const dateNumber =
            document.createElement("div");

        dateNumber.classList.add(
            "date-number"
        );

        dateNumber.textContent = day;

        dayCell.appendChild(dateNumber);


        /* Date string */

        const monthString =
            String(month + 1).padStart(2, "0");

        const dayString =
            String(day).padStart(2, "0");

        const dateString =
            `${year}-${monthString}-${dayString}`;


        /* Find events for date */

        const dayEvents =
            events.filter(
                event => event.date === dateString
            );


        /* Add events */

        dayEvents.forEach(event => {

            const eventElement =
                document.createElement("div");

            eventElement.classList.add(
                "calendar-event"
            );


            /* Event type class */

            if (
                event.type === "Project Deadline"
            ) {

                eventElement.classList.add(
                    "project"
                );

            } else if (
                event.type === "Task Deadline"
            ) {

                eventElement.classList.add(
                    "task"
                );

            } else if (
                event.type === "Meeting"
            ) {

                eventElement.classList.add(
                    "meeting"
                );

            } else if (
                event.type === "Milestone"
            ) {

                eventElement.classList.add(
                    "milestone"
                );
            }


            eventElement.textContent =
                event.title;


            eventElement.title =
                event.description ||
                event.title;


            /* Click event */

            eventElement.addEventListener(
                "click",
                function () {

                    alert(
                        `${event.title}\n\n` +
                        `Type: ${event.type}\n` +
                        `Date: ${formatDate(event.date)}\n\n` +
                        `${event.description || "No description"}`
                    );

                }
            );


            dayCell.appendChild(
                eventElement
            );

        });


        calendarDays.appendChild(
            dayCell
        );
    }
}


/* FORMAT DATE */

function formatDate(dateString) {

    const date =
        new Date(dateString + "T00:00:00");

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* DISPLAY EVENTS */

function displayEvents() {

    eventsList.innerHTML = "";


    if (events.length === 0) {

        eventsList.innerHTML = `
            <p class="empty-message">
                No upcoming events.
            </p>
        `;

        return;
    }


    /* Sort events by date */

    const sortedEvents =
        [...events].sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );


    sortedEvents.forEach(
        (event) => {

            const eventItem =
                document.createElement("div");

            eventItem.classList.add(
                "event-item"
            );


            eventItem.innerHTML = `

                <div class="event-info">

                    <h4>
                        ${event.title}
                    </h4>

                    <p>
                        ${event.type}
                    </p>

                    <p>
                        ${event.description || ""}
                    </p>

                </div>


                <div>

                    <span class="event-date">
                        ${formatDate(event.date)}
                    </span>

                    <button
                        class="delete-event"
                        onclick="deleteEvent('${event.id}')">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `;


            eventsList.appendChild(
                eventItem
            );
        }
    );
}


/* ADD EVENT */

eventForm.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();


        const title =
            eventTitle.value.trim();

        const date =
            eventDate.value;

        const type =
            eventType.value;

        const description =
            eventDescription.value.trim();


        /* Validation */

        if (
            title === "" ||
            date === "" ||
            type === ""
        ) {

            alert(
                "Please fill in all required fields."
            );

            return;
        }


        /* Create event */

        const newEvent = {

            title: title,

            date: date,

            type: type,

            description: description

        };


        try {

            /* Add event to JSON Server */

            const response = await fetch(
                "http://localhost:3000/events",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(newEvent)
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Unable to add event"
                );
            }


            /* Get updated events */

            await loadEvents();


            /* Reset form */

            eventForm.reset();


            alert(
                "Event added successfully!"
            );

        } catch (error) {

            console.error(error);

            alert(
                "Unable to add event. Please make sure JSON Server is running."
            );
        }
    }
);


/* DELETE EVENT */

async function deleteEvent(id) {

    const event =
        events.find(
            item => String(item.id) === String(id)
        );


    if (!event) {
        return;
    }


    const confirmation =
        confirm(
            `Are you sure you want to delete "${event.title}"?`
        );


    if (!confirmation) {
        return;
    }


    try {

        /* Delete event from JSON Server */

        const response = await fetch(
            `http://localhost:3000/events/${id}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Unable to delete event"
            );
        }


        /* Get updated events */

        await loadEvents();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete event. Please make sure JSON Server is running."
        );
    }
}


/* PREVIOUS MONTH */

prevMonth.addEventListener(
    "click",
    function () {

        currentDate.setMonth(
            currentDate.getMonth() - 1
        );

        renderCalendar();

    }
);


/* NEXT MONTH */

nextMonth.addEventListener(
    "click",
    function () {

        currentDate.setMonth(
            currentDate.getMonth() + 1
        );

        renderCalendar();

    }
);


/* INITIALIZE CALENDAR */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadEvents();

    }
);