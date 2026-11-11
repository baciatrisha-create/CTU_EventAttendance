
// =====================================
// CTU-DAANBANTAYAN EVENT ATTENDANCE SYSTEM
// CLEANED AND CONSOLIDATED JAVASCRIPT
// =====================================

const $ = (id) => document.getElementById(id);

const departments = {
    "Department of Education": [
        "BSED-MATH",
        "BEED",
        "BTLED"
    ],
    "Department of Technology and Engineering": [
        "BSIT",
        "BIT-Automotive",
        "BIT-Electronic",
        "BIT-Computer Technology",
        "BSHM",
        "BSFI",
        "BSIE"
    ]
};

let accounts = [
    {
        id: "ADMIN-001",
        name: "Administrator",
        email: "admin@ctu.demo",
        role: "admin",
        department: "Administration",
        program: "—",
        year: "—",
        section: "—"
    }
];

let selectedAccount = "user";
let events = [];
let records = [];
let currentUser = null;
let calendarDate = new Date();
let filteredRecords = [];

let projectorWindow = null;
let html5QrCode = null;
let scannerRunning = false;
let processingQR = false;


// =====================================
// HELPER FUNCTIONS
// =====================================

function on(id, event, callback) {
    const element = $(id);
    if (element) {
        element.addEventListener(event, callback);
    }
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

function today() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function pretty(date) {
    if (!date) return "—";

    return new Date(date + "T00:00:00").toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function showPage(page) {
    ["loginPage", "registerPage", "appPage"].forEach(id => {
        if ($(id)) $(id).classList.add("hidden");
    });

    if ($(page)) {
        $(page).classList.remove("hidden");
    }
}

function showMessage(id, message) {
    if ($(id)) {
        $(id).textContent = message;
    }
}

async function apiRequest(url, method = "GET", body = null) {
    const options = {
        method,
        credentials: "same-origin",
        headers: {}
    };

    if (body !== null) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("Invalid server response. Check your PHP files.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}


// =====================================
// REGISTRATION
// =====================================

function populatePrograms(department, select) {
    if (!select) return;

    select.innerHTML =
        '<option value="">Select program</option>' +
        (departments[department] || []).map(program =>
            `<option value="${safe(program)}">${safe(program)}</option>`
        ).join("");
}

on("regDepartment", "change", event => {
    populatePrograms(event.target.value, $("regProgram"));
});

function updateRegistrationType() {
    if (!$("regUserType")) return;

    const faculty = $("regUserType").value === "faculty";

    if ($("regIdLabel")) {
        $("regIdLabel").textContent = faculty ? "Faculty ID" : "Student ID";
    }

    if ($("regId")) {
        $("regId").placeholder = faculty
            ? "Enter Faculty ID"
            : "Enter Student ID";
    }

    if ($("regYearWrap")) {
        $("regYearWrap").classList.toggle("hidden", faculty);
    }

    if ($("regSectionWrap")) {
        $("regSectionWrap").classList.toggle("hidden", faculty);
    }

    if ($("regYear")) {
        $("regYear").required = !faculty;
    }

    if ($("regSection")) {
        $("regSection").required = !faculty;
    }
}

on("regUserType", "change", updateRegistrationType);

updateRegistrationType();

function setAccountSelection(type) {
    selectedAccount = type;

    document.querySelectorAll(".account-toggle-btn").forEach(button => {
        const active = button.dataset.account === type;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    const isUser = type === "user";

    if ($("userTypeGroup")) {
        $("userTypeGroup").classList.toggle("hidden", !isUser);
    }

    if ($("registerLine")) {
        $("registerLine").classList.toggle("hidden", !isUser);
    }

    if ($("loginHeading")) {
        $("loginHeading").textContent = isUser
            ? "Welcome Back!"
            : "Administrator Login";
    }

    if ($("loginPassword")) {
        $("loginPassword").value = "";
    }
}

document.querySelectorAll(".account-toggle-btn").forEach(button => {
    button.addEventListener("click", () => {
        setAccountSelection(button.dataset.account);
    });
});

on("showRegister", "click", event => {
    event.preventDefault();
    showPage("registerPage");
});

on("backToLogin", "click", () => {
    showPage("loginPage");
});

on("registerForm", "submit", async event => {
    event.preventDefault();

    const password = $("regPassword").value;
    const confirmPassword = $("regConfirmPassword").value;
    const faculty = $("regUserType").value === "faculty";

    if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Password and confirmation do not match.");
        return;
    }

    const registrationData = {
        school_id: $("regId").value.trim(),
        full_name: $("regName").value.trim(),
        email: $("regEmail").value.trim().toLowerCase(),
        password,
        user_type: faculty ? "faculty" : "student",
        department: $("regDepartment").value,
        program: $("regProgram").value,
        year_level: faculty ? "" : $("regYear").value,
        section: faculty ? "" : $("regSection").value.trim()
    };

    try {
        const data = await apiRequest(
            "api/auth.php?action=register",
            "POST",
            registrationData
        );

        alert(data.message || "Account created successfully!");

        $("registerForm").reset();

        updateRegistrationType();
        setAccountSelection("user");
        showPage("loginPage");

    } catch (error) {
        console.error("Registration error:", error);
        alert(error.message);
    }
});


// =====================================
// SHOW / HIDE PASSWORD
// =====================================

document.addEventListener("click", event => {
    const button = event.target.closest(".password-toggle");

    if (!button) return;

    const input = $(button.dataset.target);

    if (!input) return;

    const show = input.type === "password";

    input.type = show ? "text" : "password";
    button.innerHTML = show ? "🙈" : "👁";

    button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
    );
});


// =====================================
// LOGIN
// =====================================

on("loginForm", "submit", async event => {
    event.preventDefault();

    const email = $("loginEmail").value.trim().toLowerCase();
    const password = $("loginPassword").value;

    const expectedRole = selectedAccount === "admin"
        ? "admin"
        : "user";

    try {
        const data = await apiRequest(
            "api/auth.php?action=login",
            "POST",
            {
                email,
                password,
                role: expectedRole
            }
        );

        const user = data.user;

        currentUser = {
            ...user,
            id: user.school_id || user.user_id,
            name: user.full_name || user.name,
            year: user.year_level || "—"
        };

        await openApp();

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
    }
});


// =====================================
// OPEN APPLICATION
// =====================================

async function openApp() {
    showPage("appPage");

    const isAdmin = currentUser.role === "admin";
    const isFaculty = currentUser.role === "faculty";

    const name = currentUser.name ||
        (isFaculty ? "Faculty" : "Student");

    if ($("pageTitle")) {
        $("pageTitle").textContent = isAdmin
            ? "Admin Dashboard"
            : "Hello, " + name + "!";
    }

    if ($("topbarSubtitle")) {
        $("topbarSubtitle").textContent = isAdmin
            ? "System Administrator"
            : isFaculty
                ? "Faculty Dashboard"
                : "Student Dashboard";
    }

    if ($("userDisplay")) {
        $("userDisplay").textContent = isAdmin
            ? "System Administrator"
            : name;
    }

    updateUserAvatar();

    const userInfo = document.querySelector(".user-info");
    const userChip = document.querySelector(".user-chip");

    if (userInfo) {
        userInfo.classList.toggle("hidden", !isAdmin);
    }

    if (userChip) {
        userChip.classList.toggle("avatar-only", !isAdmin);
    }

    if ($("studentBanner")) {
        $("studentBanner").classList.toggle("hidden", isAdmin);
    }

    if ($("dashboardBannerTitle") && !isAdmin) {
        $("dashboardBannerTitle").textContent =
            "Learn Today, Lead Tomorrow.";
    }

    document.querySelectorAll(".admin-only").forEach(element => {
        element.classList.toggle("hidden", !isAdmin);
    });

    try {
    await loadEvents();
    await loadAttendanceRecords();
    } catch (error) {
    console.error("Application loading error:", error);
    alert("Unable to load application data: " + error.message);
    }

renderAll();
renderNotifications();
showView("dashboard");

    renderAll();
    renderNotifications();
    showView("dashboard");
}


// =====================================
// LOGOUT
// =====================================

on("logoutBtn", "click", async () => {
    await stopCameraScanner();

    if (projectorWindow && !projectorWindow.closed) {
        projectorWindow.close();
    }

    currentUser = null;
    records = [];

    if ($("loginForm")) {
        $("loginForm").reset();
    }

    showPage("loginPage");
});

// =====================================
// MOBILE MENU
// =====================================

const menuToggle = $("menuToggle");
const appPage = $("appPage");
const sidebar = document.querySelector(".sidebar");

function closeMobileMenu() {
    if (!appPage || !menuToggle) return;

    appPage.classList.remove("menu-open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    menuToggle.textContent = "☰";
}

function toggleMobileMenu() {
    if (!appPage || !menuToggle) return;

    const isOpen = appPage.classList.toggle("menu-open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
    );

    menuToggle.textContent = isOpen ? "✕" : "☰";
}

on("menuToggle", "click", toggleMobileMenu);

// Close when clicking outside the sidebar
on("appPage", "click", event => {
    if (
        appPage.classList.contains("menu-open") &&
        !event.target.closest(".sidebar") &&
        !event.target.closest("#menuToggle")
    ) {
        closeMobileMenu();
    }
});

// Close using Escape key
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMobileMenu();
    }
});
// =====================================
// NAVIGATION
// =====================================

on("navigation", "click", event => {
    const button = event.target.closest("[data-view]");

    if (button) {
        showView(button.dataset.view);
    }
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.go);
    });
});

function showView(view) {
    if (!currentUser) return;

    if (
        ["events", "reports", "users"].includes(view) &&
        currentUser.role !== "admin"
    ) {
        view = "dashboard";
    }

    document.querySelectorAll(".view").forEach(element => {
        element.classList.add("hidden");
    });

    if ($(view + "View")) {
        $(view + "View").classList.remove("hidden");
    }

    if (view === "qr") {
        const isAdmin = currentUser.role === "admin";

        if ($("adminQRSection")) {
            $("adminQRSection").classList.toggle("hidden", !isAdmin);
        }

        if ($("studentQRSection")) {
            $("studentQRSection").classList.toggle("hidden", isAdmin);
        }

        if (isAdmin) {
            renderQREventOptions();
        }
    }
    closeMobileMenu();

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    const names = {
        dashboard: currentUser.role === "admin"
            ? "Admin Dashboard"
            : "Hello, " + currentUser.name + "!",
        calendar: "Event Calendar",
        events: "Event Management",
        qr: "QR Attendance",
        records: "Attendance Records",
        reports: "Attendance Reports",
        users: "User Management",
        profile: "My Profile"
    };

    if ($("pageTitle")) {
        $("pageTitle").textContent = names[view] || "Dashboard";
    }

    if (view === "calendar") renderCalendar();
    if (view === "records") renderRecords();
    if (view === "users") renderUsers();
    if (view === "profile") renderProfile();
}


// =====================================
// LOAD EVENTS FROM DATABASE
// =====================================

async function loadEvents() {
    const data = await apiRequest("api/events.php?action=list");

    events = (data.events || []).map(event => ({
    event_id: Number(event.event_id),
    title: event.title,
    date: event.event_date,
    venue: event.venue,
    target: event.target_group,

    attendance_closed: Number(event.attendance_closed),
    attendance_closed_at: event.attendance_closed_at,

    latitude: null,
    longitude: null,
    radius: null
}));
    renderAll();
    renderNotifications();
    renderQREventOptions();

    return events;
}


// =====================================
// GET EVENT VENUE GPS LOCATION
// =====================================

on("getEventLocationBtn", "click", () => {
    const message = $("eventLocationMessage");

    if (!navigator.geolocation) {
        showMessage(
            "eventLocationMessage",
            "GPS location is not supported by this browser."
        );
        return;
    }

    showMessage(
        "eventLocationMessage",
        "Getting event venue location..."
    );

    navigator.geolocation.getCurrentPosition(
        position => {
            $("eventLatitude").value = position.coords.latitude;
            $("eventLongitude").value = position.coords.longitude;

            showMessage(
                "eventLocationMessage",
                "Event location captured successfully!"
            );
        },
        error => {
            console.error(error);

            showMessage(
                "eventLocationMessage",
                "Unable to get location. Please allow location permission."
            );
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
});


// =====================================
// CREATE EVENT
// =====================================

on("eventForm", "submit", async event => {
    event.preventDefault();

    const title = $("eventTitle").value.trim();
    const date = $("eventDate").value;
    const venue = $("eventVenue").value.trim();
    const target = $("eventTarget").value;

    if (!title || !date || !venue || !target) {
        alert("Please complete all event details.");
        return;
    }

    try {
        const data = await apiRequest(
            "api/events.php?action=create",
            "POST",
            {
                title,
                event_date: date,
                venue,
                target_group: target
            }
        );

        $("eventForm").reset();

        showMessage(
            "eventLocationMessage",
            "Get the GPS location for your next event."
        );

        await loadEvents();

        alert(data.message || "Event saved successfully!");

    } catch (error) {
        console.error("Create event error:", error);
        alert(error.message);
    }
});


// =====================================
// EVENT STATUS
// =====================================

function getEventStatus(date) {
    if (date < today()) return "Completed";
    if (date === today()) return "Ongoing";
    return "Upcoming";
}


// =====================================
// EVENT MANAGEMENT DISPLAY
// =====================================

function renderManagedEvents() {
    const container = $("managedEvents");
    if (!container) return;

    container.innerHTML = events.map(event => {
        const closed = Number(event.attendance_closed) === 1;

        return `
            <div class="managed-event">
                <div class="event-actions">

                    <span class="event-status">
                        ${getEventStatus(event.date)}
                    </span>

                    <button
                        class="edit-btn"
                        data-edit="${event.event_id}"
                        type="button"
                        ${closed ? "disabled" : ""}
                    >Edit</button>

                    <button
                        class="delete-btn"
                        data-delete="${event.event_id}"
                        type="button"
                    >Delete</button>

                    <button
                        class="attendance-close-btn"
                        data-close="${event.event_id}"
                        type="button"
                        ${closed ? "disabled" : ""}
                    >
                        ${closed ? "Attendance Closed" : "Close Attendance"}
                    </button>

                </div>

                <div class="event-details">
                    <strong>${safe(event.title)}</strong>
                    <small>
                        ${pretty(event.date)} ·
                        ${safe(event.venue)} ·
                        ${safe(event.target)}
                    </small>
                </div>
            </div>
        `;
    }).join("") || '<p class="muted">No events yet.</p>';
}
async function closeEventAttendance(eventId) {
    const confirmed = confirm(
        "Are you sure you want to close attendance for this event? Users who did not scan will be marked Absent."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            "api/attendance.php?action=close",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    event_id: eventId
                })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "Unable to close attendance.");
            return;
        }

        alert(
            result.message +
            "\nNew Absent records: " +
            result.absent_count
        );

        await loadEvents();
        await loadAttendanceRecords();

    } catch (error) {
        console.error("Close attendance error:", error);
        alert("Something went wrong while closing attendance.");
    }
}

// =====================================
// EDIT AND DELETE EVENTS
// =====================================

on("managedEvents", "click", async event => {
    const closeButton = event.target.closest(".attendance-close-btn");

if (closeButton) {
    const eventId = Number(closeButton.dataset.close);
    await closeEventAttendance(eventId);
    return;
}

    const editButton = event.target.closest(".edit-btn");

    if (editButton) {
        const eventId = Number(editButton.dataset.edit);

        const selectedEvent = events.find(item =>
            Number(item.event_id) === eventId
        );

        if (!selectedEvent) {
            alert("Event not found.");
            return;
        }

        const newTitle = prompt(
            "Edit event title:",
            selectedEvent.title
        );

        if (newTitle === null) return;

        const newDate = prompt(
            "Edit event date (YYYY-MM-DD):",
            selectedEvent.date
        );

        if (newDate === null) return;

        const newVenue = prompt(
            "Edit venue:",
            selectedEvent.venue
        );

        if (newVenue === null) return;

        const newTarget = prompt(
            "Edit target group:",
            selectedEvent.target
        );

        if (newTarget === null) return;

        if (
            !newTitle.trim() ||
            !/^\d{4}-\d{2}-\d{2}$/.test(newDate.trim()) ||
            !newVenue.trim() ||
            !newTarget.trim()
        ) {
            alert("Please enter valid and complete event details.");
            return;
        }

        try {
            const data = await apiRequest(
                "api/events.php?action=update",
                "POST",
                {
                    event_id: eventId,
                    title: newTitle.trim(),
                    event_date: newDate.trim(),
                    venue: newVenue.trim(),
                    target_group: newTarget.trim()
                }
            );

            await loadEvents();

            alert(data.message || "Event updated successfully!");

        } catch (error) {
            console.error("Update event error:", error);
            alert(error.message);
        }

        return;
    }

    const deleteButton = event.target.closest(".delete-btn");

    if (deleteButton) {
        const eventId = Number(deleteButton.dataset.delete);

        const selectedEvent = events.find(item =>
            Number(item.event_id) === eventId
        );

        if (!selectedEvent) {
            alert("Event not found.");
            return;
        }

        if (!confirm(
            `Are you sure you want to delete "${selectedEvent.title}"?`
        )) {
            return;
        }

        try {
            const data = await apiRequest(
                "api/events.php?action=delete",
                "POST",
                {
                    event_id: eventId
                }
            );

            await loadEvents();

            alert(data.message || "Event deleted successfully!");

        } catch (error) {
            console.error("Delete event error:", error);
            alert(error.message);
        }
    }
});


// =====================================
// QR EVENT DROPDOWN
// =====================================

function renderQREventOptions() {
    const select = $("qrEventSelect");

    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
        <option value="">Choose an event</option>
    `;

    if (events.length === 0) {
        select.innerHTML += `
            <option value="" disabled>No events available</option>
        `;
        return;
    }

    events.forEach(event => {
        const option = document.createElement("option");

        option.value = event.event_id;
        option.textContent = `${event.title} - ${event.date}`;

        select.appendChild(option);
    });

    if (events.some(event =>
        String(event.event_id) === previousValue
    )) {
        select.value = previousValue;
    }
}


// =====================================
// GENERATE EVENT QR CODE
// =====================================

on("generateQRBtn", "click", () => {
    const selectedId = $("qrEventSelect").value;

    if (!selectedId) {
        alert("Please select an event first.");
        return;
    }

    const event = events.find(item =>
        Number(item.event_id) === Number(selectedId)
    );

    if (!event) {
        alert("Event not found.");
        return;
    }

    if (typeof QRCode === "undefined") {
        alert("QR Code library not loaded. Check your internet connection.");
        return;
    }

    const output = $("qrCodeOutput");

    if (!output) return;

    output.innerHTML = "";

    // QR contains the database event ID.
    const qrContent = JSON.stringify({
        system: "CTU Event Attendance",
        event_id: event.event_id,
        event_title: event.title,
        event_date: event.date
    });

    new QRCode(output, {
        text: qrContent,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    showMessage("qrEventTitle", event.title);

    if ($("adminQRDisplay")) {
        $("adminQRDisplay").classList.remove("hidden");
    }

    showMessage(
        "adminQRMessage",
        "QR Code generated successfully!"
    );
});


// =====================================
// PROJECTOR DISPLAY
// =====================================

on("projectorBtn", "click", () => {
    const output = $("qrCodeOutput");
    const selectedId = $("qrEventSelect").value;

    if (!output || !output.innerHTML.trim()) {
        alert("Please generate a QR code first.");
        return;
    }

    const event = events.find(item =>
        Number(item.event_id) === Number(selectedId)
    );

    if (!event) {
        alert("Event not found.");
        return;
    }

    const canvas = output.querySelector("canvas");
    const image = output.querySelector("img");

    let qrImage = "";

    if (canvas) {
        qrImage = canvas.toDataURL("image/png");
    } else if (image) {
        qrImage = image.src;
    }

    if (!qrImage) {
        alert("QR image not found. Generate it again.");
        return;
    }

    projectorWindow = window.open(
        "",
        "CTU_QR_Projector",
        "width=1100,height=800"
    );

    if (!projectorWindow) {
        alert("Please allow pop-ups for localhost.");
        return;
    }

    projectorWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CTU Event QR Attendance</title>

            <style>
                * { box-sizing: border-box; }

                body {
                    margin: 0;
                    min-height: 100vh;
                    background: #f8f0df;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }

                .projector-card {
                    background: white;
                    border-radius: 20px;
                    padding: 35px;
                    width: 90%;
                    max-width: 650px;
                    box-shadow: 0 5px 25px #0002;
                }

                .header {
                    background: #07502f;
                    color: white;
                    padding: 22px;
                    border-radius: 12px;
                }

                h1 { font-size: 30px; }

                .qr-image {
                    width: 300px;
                    height: 300px;
                    object-fit: contain;
                    margin: 25px auto;
                    display: block;
                }

                .instruction {
                    color: #07502f;
                    font-size: 21px;
                    font-weight: bold;
                }

                .details {
                    color: #766b58;
                    line-height: 1.7;
                }
            </style>
        </head>

        <body>
            <div class="projector-card">

                <div class="header">
                    <h1>${safe(event.title)}</h1>
                    <p>CTU-Daanbantayan Campus</p>
                </div>

                <img
                    class="qr-image"
                    src="${qrImage}"
                    alt="Event QR Code">

                <p class="instruction">
                    SCAN TO RECORD YOUR ATTENDANCE
                </p>

                <div class="details">
                    <p>Event Date: ${safe(event.date)}</p>
                    <p>Location: ${safe(event.venue)}</p>
                </div>

            </div>
        </body>
        </html>
    `);

    projectorWindow.document.close();
});


// =====================================
// CLOSE QR DISPLAY
// =====================================

on("closeQRBtn", "click", () => {
    if (!confirm(
        "Are you sure you want to close the QR attendance display?"
    )) {
        return;
    }

    if (projectorWindow && !projectorWindow.closed) {
        projectorWindow.close();
    }

    if ($("qrCodeOutput")) {
        $("qrCodeOutput").innerHTML = "";
    }

    if ($("adminQRDisplay")) {
        $("adminQRDisplay").classList.add("hidden");
    }

    showMessage("qrExpiration", "");

    showMessage(
        "adminQRMessage",
        "QR attendance display has been closed."
    );

    projectorWindow = null;
});


// =====================================
// NOTIFICATIONS
// =====================================

function renderNotifications() {
    const list = $("notificationList");
    const dot = $("notificationDot");

    if (!list || !dot) return;

    const notifications = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    events.forEach(event => {
        const eventDate = new Date(event.date + "T00:00:00");

        const daysLeft = Math.ceil(
            (eventDate - now) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft >= 0 && daysLeft <= 7) {
            notifications.push({
                title: "Upcoming Event: " + event.title,
                message: daysLeft === 0
                    ? "This event is scheduled for today."
                    : "This event is in " + daysLeft + " day(s).",
                date: event.date
            });
        }
    });

    dot.classList.toggle("hidden", notifications.length === 0);

    if (notifications.length === 0) {
        list.innerHTML = '<p class="muted">No notifications yet.</p>';
        return;
    }

    list.innerHTML = notifications.map(item => `
        <div class="notification-item">
            <strong>${safe(item.title)}</strong>
            <p>${safe(item.message)}</p>
            <small>${pretty(item.date)}</small>
        </div>
    `).join("");
}

on("notificationBtn", "click", () => {
    renderNotifications();

    if ($("notificationPanel")) {
        $("notificationPanel").classList.toggle("hidden");
    }
});

on("closeNotifications", "click", () => {
    if ($("notificationPanel")) {
        $("notificationPanel").classList.add("hidden");
    }
});


// =====================================
// DASHBOARD
// =====================================

function renderAll() {
    renderStats();
    renderMiniCalendar();
    renderRecent();
    renderManagedEvents();
    renderRecords();
    renderReport();
}

function renderStats() {
    const upcoming = events.filter(event =>
        event.date >= today()
    ).length;

    const present = records.filter(record =>
        record.status === "Present"
    ).length;

    const absent = records.filter(record =>
        record.status === "Absent"
    ).length;

    if ($("upcomingCount")) $("upcomingCount").textContent = upcoming;
    if ($("totalCount")) $("totalCount").textContent = records.length;
    if ($("presentCount")) $("presentCount").textContent = present;
    if ($("absentCount")) $("absentCount").textContent = absent;

    if ($("legendPresent")) $("legendPresent").textContent = present;
    if ($("legendAbsent")) $("legendAbsent").textContent = absent;
    if ($("legendUpcoming")) $("legendUpcoming").textContent = upcoming;

    const percentage = records.length
        ? Math.round(present / records.length * 100)
        : 0;

    if ($("donutPercent")) {
        $("donutPercent").textContent = percentage + "%";

        const parent = $("donutPercent").parentElement?.parentElement;

        if (parent) {
            parent.style.background =
                `conic-gradient(#4285ed 0 ${percentage}%,#a887ed ${percentage}% 100%)`;
        }
    }
}

function renderMiniCalendar() {
    const container = $("miniCalendar");

    if (!container) return;

    const date = new Date();

    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    let output = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        .map(day => `<span class="day-name">${day}</span>`)
        .join("");

    for (let index = 0; index < firstDay; index++) {
        output += "<span></span>";
    }

    for (let day = 1; day <= days; day++) {
        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const hasEvent = events.some(event =>
            event.date === dateString
        );

        output += `
            <span class="${hasEvent ? "has-event" : ""}">
                ${day}
            </span>
        `;
    }

    container.innerHTML = output;
}

function renderRecent() {
    const container = $("recentEvents");

    if (!container) return;

    const recent = [...events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4);

    container.innerHTML = recent.length
        ? recent.map(event => `
            <div class="event-item">
                <strong>${safe(event.title)}</strong>
                <small>
                    ${pretty(event.date)} · ${safe(event.venue)}
                </small>
            </div>
        `).join("")
        : '<p class="muted">No events yet.</p>';
}


// =====================================
// EVENT CALENDAR
// =====================================

function renderCalendar() {
    const container = $("fullCalendar");

    if (!container) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    if ($("monthLabel")) {
        $("monthLabel").textContent =
            calendarDate.toLocaleDateString("en", {
                month: "long",
                year: "numeric"
            });
    }

    let output = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        .map(day => `<div class="cal-head">${day}</div>`)
        .join("");

    for (let index = 0; index < firstDay; index++) {
        output += "<div></div>";
    }

    for (let day = 1; day <= days; day++) {
        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const dayEvents = events.filter(event =>
            event.date === date
        );

        output += `
            <div>
                <b>${day}</b>
                ${dayEvents.map(event => `
                    <span class="cal-event">${safe(event.title)}</span>
                `).join("")}
            </div>
        `;
    }

    container.innerHTML = output;
}

on("prevMonth", "click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});

on("nextMonth", "click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});


// =====================================
// ATTENDANCE RECORDS
// =====================================

// =====================================
// LOAD ATTENDANCE FROM DATABASE
// =====================================

async function loadAttendanceRecords() {
    try {
        const data = await apiRequest(
            "api/attendance.php?action=list"
        );

        records = (data.records || []).map(record => ({
            attendance_id: Number(record.attendance_id),
            event_id: Number(record.event_id),

            account: {
                id: record.school_id || record.user_id,
                user_id: Number(record.user_id),
                name: record.full_name,
                email: record.email,
                role: "user",
                department: record.department,
                program: record.program,
                year: record.year_level || "—",
                section: record.section || "—"
            },

            event: {
                event_id: Number(record.event_id),
                title: record.event_title,
                date: record.event_date
            },

            status: record.status,
            attended_at: record.attended_at
        }));

        renderAll();

        console.log("Attendance records loaded:", records);

    } catch (error) {
        console.error("Attendance loading error:", error);
        alert("Unable to load attendance records: " + error.message);
    }
}


function renderRecords() {
    const body = $("recordsBody");

    if (!body) return;

    const rows = records.filter(record =>
        currentUser?.role === "admin" ||
        record.account.email === currentUser?.email
    );

    body.innerHTML = rows.map(record => `
        <tr>
            <td>
                ${safe(record.account.name)} /
                ${safe(record.account.id)}
            </td>
            <td>${safe(record.account.department)}</td>
            <td>${safe(record.account.program)}</td>
            <td>${safe(record.event.title)}</td>
            <td>${safe(record.status)}</td>
        </tr>
    `).join("") || `
        <tr>
            <td colspan="5">No attendance records yet.</td>
        </tr>
    `;
}


// =====================================
// USER MANAGEMENT
// =====================================

async function renderUsers() {
    const body = $("usersBody");

    if (!body) return;

    body.innerHTML =
        '<tr><td colspan="6">Loading users...</td></tr>';

    try {
        const data = await apiRequest("api/users.php");

        const users = data.users || [];

        body.innerHTML = users.map(user => `
            <tr>
                <td>${safe(user.school_id)}</td>
                <td>${safe(user.full_name)}</td>
                <td>${safe(user.department)}</td>
                <td>${safe(user.program)}</td>
                <td>${safe(user.year_level || "—")}</td>
                <td>${safe(user.email)}</td>
            </tr>
        `).join("") || `
            <tr>
                <td colspan="6">No registered users yet.</td>
            </tr>
        `;

    } catch (error) {
        console.error("Load users error:", error);

        body.innerHTML = `
            <tr>
                <td colspan="6">${safe(error.message)}</td>
            </tr>
        `;
    }
}


// =====================================
// PROFILE AVATAR
// =====================================

function updateUserAvatar() {
    const avatar = document.querySelector(".user-avatar");

    if (!avatar || !currentUser) return;

    if (currentUser.profile_picture) {
        avatar.innerHTML = `
            <img
                src="${safe(currentUser.profile_picture)}"
                alt="Profile picture">
        `;
    } else {
        avatar.textContent =
            (currentUser.name || "U").charAt(0).toUpperCase();
    }
}


// =====================================
// PROFILE
// =====================================

function renderProfile() {
    const container = $("profileDetails");

    if (!container || !currentUser) return;

    const picture = currentUser.profile_picture || "";
    const initial = (currentUser.name || "U").charAt(0).toUpperCase();

    container.innerHTML = `
        <div class="profile-picture-section">

            <div class="profile-image-wrapper">

                <div class="profile-picture-placeholder">
                    ${safe(initial)}
                </div>

                <img
                    id="profilePicturePreview"
                    class="profile-picture"
                    src="${safe(picture)}"
                    alt="Profile picture"
                    style="${picture ? "" : "display:none;"}"
                >

            </div>

            <div>
                <h3>${safe(currentUser.name || "User")}</h3>

                <label
                    for="profilePictureInput"
                    class="change-picture-btn">
                    Change Profile Picture
                </label>

                <input
                    type="file"
                    id="profilePictureInput"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                >

                <p id="profilePictureMessage" class="muted">
                    JPG, PNG, or WEBP. Maximum 2 MB.
                </p>
            </div>

        </div>

        <div class="profile-information">

            ${[
                ["Name", currentUser.name],
                ["ID", currentUser.id],
                ["Email", currentUser.email],
                ["Department", currentUser.department],
                ["Program", currentUser.program],
                ["Year level", currentUser.year],
                ["Section", currentUser.section]
            ].map(([key, value]) => `
                <div class="profile-detail">
                    <b>${key}:</b> ${safe(value || "—")}
                </div>
            `).join("")}

        </div>
    `;

    const input = $("profilePictureInput");

    if (!input) return;

    input.addEventListener("change", async function () {
        const file = this.files[0];

        if (!file) return;

        const message = $("profilePictureMessage");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            message.textContent =
                "Please select a JPG, PNG, or WEBP image.";

            this.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            message.textContent =
                "Image must not exceed 2 MB.";

            this.value = "";
            return;
        }

        message.textContent = "Uploading picture...";

        const formData = new FormData();

        formData.append("profile_picture", file);

        try {
            const response = await fetch(
                "api/upload_profile_picture.php",
                {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Upload failed."
                );
            }

            currentUser.profile_picture = result.profile_picture;

            renderProfile();
            updateUserAvatar();

            showMessage(
                "profilePictureMessage",
                "Profile picture updated successfully!"
            );

        } catch (error) {
            message.textContent = error.message;
        }
    });
}


// =====================================
// ATTENDANCE REPORT
// =====================================

function renderReport() {
    const body = $("reportBody");

    if (!body) return;

    const list = records.filter(record =>
        record.account.role !== "admin"
    );

    filteredRecords = list;

    body.innerHTML = list.map(record => `
        <tr>
            <td>${safe(record.account.name)}</td>
            <td>${safe(record.account.department)}</td>
            <td>${safe(record.account.program)}</td>
            <td>${safe(record.account.year)}</td>
            <td>${safe(record.account.section)}</td>
            <td>${safe(record.event.title)}</td>
            <td>${safe(record.status)}</td>
        </tr>
    `).join("") || `
        <tr>
            <td colspan="7">No report data yet.</td>
        </tr>
    `;

    showMessage(
        "reportSummary",
        `Showing ${list.length} attendance record(s).`
    );
}


// =====================================
// REPORT FILTERS
// =====================================

on("filterDepartment", "change", () => {
    const department = $("filterDepartment").value;

    const programs = departments[department] ||
        Object.values(departments).flat();

    if ($("filterProgram")) {
        $("filterProgram").innerHTML =
            '<option value="">All programs</option>' +
            programs.map(program =>
                `<option value="${safe(program)}">${safe(program)}</option>`
            ).join("");
    }
});

on("applyFilters", "click", () => {
    filteredRecords = records.filter(record => {
        const department = $("filterDepartment")?.value || "";
        const program = $("filterProgram")?.value || "";
        const year = $("filterYear")?.value || "";
        const section = $("filterSection")?.value.trim().toLowerCase() || "";

        return (
            (!department || record.account.department === department) &&
            (!program || record.account.program === program) &&
            (!year || record.account.year === year) &&
            (
                !section ||
                String(record.account.section || "").toLowerCase() === section
            )
        );
    });

    if ($("reportBody")) {
        $("reportBody").innerHTML = filteredRecords.map(record => `
            <tr>
                <td>${safe(record.account.name)}</td>
                <td>${safe(record.account.department)}</td>
                <td>${safe(record.account.program)}</td>
                <td>${safe(record.account.year)}</td>
                <td>${safe(record.account.section)}</td>
                <td>${safe(record.event.title)}</td>
                <td>${safe(record.status)}</td>
            </tr>
        `).join("") || `
            <tr>
                <td colspan="7">No matching records.</td>
            </tr>
        `;
    }

    showMessage(
        "reportSummary",
        `Found ${filteredRecords.length} matching record(s).`
    );
});


// =====================================
// CSV EXPORT
// =====================================

function downloadCSV(filename, headers, rows) {
    const csv = [headers, ...rows].map(row =>
        row.map(value =>
            '"' + String(value ?? "").replaceAll('"', '""') + '"'
        ).join(",")
    ).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

on("exportReport", "click", () => {
    downloadCSV(
        "attendance-report.csv",
        [
            "Name",
            "Department",
            "Program",
            "Year",
            "Section",
            "Event",
            "Status"
        ],
        filteredRecords.map(record => [
            record.account.name,
            record.account.department,
            record.account.program,
            record.account.year,
            record.account.section,
            record.event.title,
            record.status
        ])
    );
});

on("exportRecords", "click", () => {
    downloadCSV(
        "attendance-records.csv",
        [
            "Name",
            "ID",
            "Department",
            "Program",
            "Event",
            "Status"
        ],
        records.map(record => [
            record.account.name,
            record.account.id,
            record.account.department,
            record.account.program,
            record.event.title,
            record.status
        ])
    );
});


// =====================================
// STUDENT AND FACULTY QR SCANNER
// =====================================

on("startScannerBtn", "click", async () => {
    if (typeof Html5Qrcode === "undefined") {
        showMessage(
            "studentScanMessage",
            "QR Scanner library not loaded. Check your internet connection."
        );
        return;
    }

    if (scannerRunning) return;

    try {
        html5QrCode = new Html5Qrcode("qrReader");

        showMessage(
            "studentScanMessage",
            "Opening camera. Please allow camera permission."
        );

        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: {
                    width: 250,
                    height: 250
                }
            },
            async decodedText => {
                if (processingQR) return;

                processingQR = true;

                try {
                    await processScannedQR(decodedText);
                } finally {
                    processingQR = false;
                }
            },
            () => {}
        );

        scannerRunning = true;

        if ($("startScannerBtn")) {
            $("startScannerBtn").classList.add("hidden");
        }

        if ($("stopScannerBtn")) {
            $("stopScannerBtn").classList.remove("hidden");
        }

        showMessage(
            "studentScanMessage",
            "Camera is active. Point it at the event QR code."
        );

    } catch (error) {
        console.error("Camera error:", error);

        showMessage(
            "studentScanMessage",
            "Unable to open camera. Allow camera permission and try again."
        );
    }
});


// =====================================
// PROCESS SCANNED QR
// =====================================

async function processScannedQR(decodedText) {
    console.log("Scanned QR content:", decodedText);

    // 1. Check if QR contains valid JSON
    let qrData;

    try {
        qrData = JSON.parse(decodedText);
    } catch (error) {
        console.error("QR JSON error:", error);

        showMessage(
            "studentScanMessage",
            "Invalid QR format. Please scan the QR displayed by the organizer."
        );
        return;
    }

    // 2. Validate QR information
    if (
        qrData.system !== "CTU Event Attendance" ||
        !qrData.event_id
    ) {
        console.error("Invalid QR data:", qrData);

        showMessage(
            "studentScanMessage",
            "Invalid event QR code."
        );
        return;
    }

    // 3. Find the event
    const event = events.find(item =>
        Number(item.event_id) === Number(qrData.event_id)
    );

    if (!event) {
        showMessage(
            "studentScanMessage",
            "Event not found. Please refresh the application."
        );
        return;
    }

    // 4. Check logged-in user
    if (!currentUser || currentUser.role === "admin") {
        showMessage(
            "studentScanMessage",
            "Only students and faculty can record attendance."
        );
        return;
    }

    // 5. Send attendance to PHP
    try {
        const response = await fetch(
            "api/attendance.php?action=checkin",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    event_id: event.event_id
                })
            }
        );

        const responseText = await response.text();

        console.log("Attendance API response:", responseText);

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (error) {
            throw new Error(
                "Invalid response from attendance API. Check api/attendance.php."
            );
        }

        if (!response.ok || !result.success) {
            showMessage(
                "studentScanMessage",
                result.message || "Unable to record attendance."
            );
            return;
        }

        // 6. Successful attendance
       showMessage(
       "studentScanMessage",
       "Attendance successfully recorded for " +
       event.title + "!"
       );

       // Refresh attendance records from database
       await loadAttendanceRecords();

       await stopCameraScanner();

    } catch (error) {
        console.error("QR processing error:", error);

        showMessage(
            "studentScanMessage",
            error.message || "Unable to process QR code. Please try again."
        );
    }
}


// =====================================
// STOP CAMERA
// =====================================

on("stopScannerBtn", "click", async () => {
    await stopCameraScanner();
});

async function stopCameraScanner() {
    if (!html5QrCode || !scannerRunning) return;

    try {
        await html5QrCode.stop();
        html5QrCode.clear();

        scannerRunning = false;

        if ($("startScannerBtn")) {
            $("startScannerBtn").classList.remove("hidden");
        }

        if ($("stopScannerBtn")) {
            $("stopScannerBtn").classList.add("hidden");
        }

    } catch (error) {
        console.error("Scanner stop error:", error);
    }
}


// =====================================
// INITIAL PAGE
// =====================================

showPage("loginPage");
