// ================= STATE =================

let currentFilter = "active";   // "active" | "inactive"
let currentPage = 0;
const pageSize = 10;

document.addEventListener(
    "DOMContentLoaded",
    () => loadActiveUsers(0)
);



// ================= FILTER BUTTON STATE =================

function setFilterButtonState() {

    const activeBtn = document.getElementById("btnActiveFilter");
    const inactiveBtn = document.getElementById("btnInactiveFilter");

    if (currentFilter === "active") {

        activeBtn.classList.remove("btn-outline-success");
        activeBtn.classList.add("btn-success");

        inactiveBtn.classList.remove("btn-danger");
        inactiveBtn.classList.add("btn-outline-danger");

    } else {

        inactiveBtn.classList.remove("btn-outline-danger");
        inactiveBtn.classList.add("btn-danger");

        activeBtn.classList.remove("btn-success");
        activeBtn.classList.add("btn-outline-success");

    }
}



// ================= LOAD ACTIVE USERS =================

async function loadActiveUsers(page = 0) {

    currentFilter = "active";
    currentPage = page;
    setFilterButtonState();

    await fetchAndRenderUsers(
        "/api/users/active",
        page
    );

}



// ================= LOAD INACTIVE USERS =================

async function loadInactiveUsers(page = 0) {

    currentFilter = "inactive";
    currentPage = page;
    setFilterButtonState();

    await fetchAndRenderUsers(
        "/api/users/inactive",
        page
    );

}



// ================= SHARED FETCH =================

async function fetchAndRenderUsers(endpoint, page) {

    try {

        const token =
            localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL +
            endpoint +
            "?page=" + page +
            "&size=" + pageSize,
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const raw = await res.text();
        console.log(endpoint + " raw response:", raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Response is not valid JSON:", raw);
            renderUsers([]);
            renderPagination(null);
            return;
        }

        // Handle both shapes: a Page object (with content array) or a plain array
        const users = Array.isArray(data)
            ? data
            : Array.isArray(data.content)
                ? data.content
                : [];

        renderUsers(users);
        renderPagination(Array.isArray(data) ? null : data);

    }

    catch (err) {

        console.error("Load users error:", err);

    }

}



// ================= REFRESH (current filter + current page ke sath) =================

function refreshUsers() {

    if (currentFilter === "inactive") {
        loadInactiveUsers(currentPage);
    } else {
        loadActiveUsers(currentPage);
    }

}



// ================= RENDER USERS =================

function renderUsers(users) {

    const tbody =
        document.getElementById(
            "userTableBody"
        );

    tbody.innerHTML = "";

    if (!users || users.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="10" class="text-center text-muted">No users found</td></tr>`;
        return;
    }

    users.forEach((u, index) => {

        const role = String(u.role || "").toUpperCase().trim();
        const isActive = u.enabled === true;

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        const toggleStatusBtn = isActive
            ? `<button class="btn btn-secondary btn-sm me-1" onclick="deactivateUser(${u.id})">Deactivate</button>`
            : `<button class="btn btn-success btn-sm me-1" onclick="activateUser(${u.id})">Activate</button>`;

        const roleToggleBtn = role === "ADMIN"
            ? `<button class="btn btn-outline-secondary btn-sm me-1" onclick="removeAdmin(${u.id})">Remove Admin</button>`
            : `<button class="btn btn-outline-primary btn-sm me-1" onclick="promoteAdmin(${u.id})">Make Admin</button>`;

        tbody.innerHTML += `

<tr>

<td>${(currentPage * pageSize) + index + 1}</td>

<td>${u.id}</td>

<td>${u.username}</td>

<td>${u.email}</td>

<td>${u.fullName}</td>

<td>${u.phone}</td>

<td>

<span class="badge bg-info">
${u.role}
</span>

</td>

<td>
${statusBadge}
</td>

<td>
${formatDate(u.createdAt)}
</td>

<td>

<div class="d-flex flex-wrap gap-1">

<button
class="btn btn-warning btn-sm"
onclick='openEditUser(${JSON.stringify(u)})'>
Edit
</button>

<button
class="btn btn-danger btn-sm"
onclick="deleteUser(${u.id})">
Delete
</button>

${toggleStatusBtn}

${roleToggleBtn}

</div>

</td>

</tr>

`;

    });

}



// ================= RENDER PAGINATION =================

function renderPagination(pageData) {

    const infoEl = document.getElementById("paginationInfo");
    const controlsEl = document.getElementById("paginationControls");

    controlsEl.innerHTML = "";

    if (!pageData) {
        infoEl.textContent = "";
        return;
    }

    const totalPages = pageData.totalPages || 1;
    const totalElements = pageData.totalElements || 0;
    const number = pageData.number || 0; // current page (0-indexed)
    const isFirst = pageData.first;
    const isLast = pageData.last;

    infoEl.textContent =
        totalElements > 0
            ? `Page ${number + 1} of ${totalPages} — ${totalElements} total users`
            : "";

    if (totalPages <= 1) return;

    // Previous button
    controlsEl.innerHTML += `
<li class="page-item ${isFirst ? "disabled" : ""}">
    <button class="page-link" onclick="goToPage(${number - 1})">Previous</button>
</li>`;

    // Page number buttons (simple range, max 5 visible around current)
    const startPage = Math.max(0, number - 2);
    const endPage = Math.min(totalPages - 1, number + 2);

    for (let i = startPage; i <= endPage; i++) {
        controlsEl.innerHTML += `
<li class="page-item ${i === number ? "active" : ""}">
    <button class="page-link" onclick="goToPage(${i})">${i + 1}</button>
</li>`;
    }

    // Next button
    controlsEl.innerHTML += `
<li class="page-item ${isLast ? "disabled" : ""}">
    <button class="page-link" onclick="goToPage(${number + 1})">Next</button>
</li>`;

}

function goToPage(page) {

    if (page < 0) return;

    if (currentFilter === "inactive") {
        loadInactiveUsers(page);
    } else {
        loadActiveUsers(page);
    }

}



// ================= CREATE USER =================

async function createUser() {

    const body = {

        username:
            document.getElementById("username").value,

        email:
            document.getElementById("email").value,

        password:
            document.getElementById("password").value,

        fullName:
            document.getElementById("fullName").value,

        phone:
            document.getElementById("phone").value,

        role:
            document.getElementById("role").value

    };

    try {

        const token =
            localStorage.getItem("adminToken");

        const res =
            await fetch(
                CONFIG.BASE_URL +
                "/api/users/registerByAdmin",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify(body)

                }
            );

        if (res.ok) {

            alert("User created successfully!");

            refreshUsers();

        }

    }
    catch (err) {

        console.error(err);

    }

}



// ================= DELETE =================

async function deleteUser(id) {

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone."))
        return;

    const token =
        localStorage.getItem("adminToken");

    await fetch(
        CONFIG.BASE_URL +
        "/api/users/" + id,
        {
            method: "DELETE",

            headers: {
                "Authorization":
                    "Bearer " + token
            }
        }
    );

    refreshUsers();

}



// ================= ACTIVATE / DEACTIVATE =================

async function activateUser(id) {

    if (!confirm("Activate this user?")) return;

    try {

        const token =
            localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/users/" + id + "/activate",
            {
                method: "PUT",
                headers: { "Authorization": "Bearer " + token }
            }
        );

        const data = await res.text();
        console.log("ACTIVATE STATUS:", res.status, data);

        if (res.ok) {
            alert("User activated successfully!");
        } else {
            alert("Something went wrong while activating the user.");
        }

    } catch (err) {
        console.error("Activate error:", err);
        alert("Could not connect to the server. Please try again.");
    }

    refreshUsers();

}

async function deactivateUser(id) {

    if (!confirm("Deactivate this user?")) return;

    try {

        const token =
            localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/users/" + id + "/deactivate",
            {
                method: "PUT",
                headers: { "Authorization": "Bearer " + token }
            }
        );

        const data = await res.text();
        console.log("DEACTIVATE STATUS:", res.status, data);

        if (res.ok) {
            alert("User deactivated successfully!");
        } else {
            alert("Something went wrong while deactivating the user.");
        }

    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Could not connect to the server. Please try again.");
    }

    refreshUsers();

}



// ================= OPEN EDIT =================

function openEditUser(u) {

    document.getElementById(
        "editUserId"
    ).value = u.id;

    document.getElementById(
        "editUsername"
    ).value = u.username;

    document.getElementById(
        "editEmail"
    ).value = u.email;

    document.getElementById(
        "editFullName"
    ).value = u.fullName;

    document.getElementById(
        "editPhone"
    ).value = u.phone;

    document.getElementById(
        "editEnabled"
    ).checked = u.enabled === true;

    new bootstrap.Modal(
        document.getElementById(
            "editUserModal"
        )
    ).show();

}



// ================= UPDATE =================

async function updateUser() {

    const id =
        document.getElementById(
            "editUserId"
        ).value;

    const body = {

        username:
            document.getElementById(
                "editUsername"
            ).value,

        email:
            document.getElementById(
                "editEmail"
            ).value,

        fullName:
            document.getElementById(
                "editFullName"
            ).value,

        phone:
            document.getElementById(
                "editPhone"
            ).value,

        enabled:
            document.getElementById(
                "editEnabled"
            ).checked

    };

    const token =
        localStorage.getItem("adminToken");

    await fetch(
        CONFIG.BASE_URL +
        "/api/users/" + id,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json",
                "Authorization":
                    "Bearer " + token
            },

            body: JSON.stringify(body)

        }
    );

    bootstrap.Modal
        .getInstance(
            document.getElementById(
                "editUserModal"
            )
        ).hide();

    refreshUsers();

}



// ================= PROMOTE =================

async function promoteAdmin(id) {

    if (!confirm("Promote this user to Admin?")) return;

    const token = localStorage.getItem("adminToken");

    const res = await fetch(
        CONFIG.BASE_URL + "/api/users/" + id + "/role/admin",
        {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        }
    );

    const data = await res.text(); // response is plain text, not JSON

    console.log("PROMOTE STATUS:", res.status);
    console.log("PROMOTE RESPONSE:", data);

    if (res.ok) {
        alert("User promoted to ADMIN successfully!");
        refreshUsers();
    } else {
        alert("Failed to promote user.");
    }
}



// ================= DATE FORMAT =================

function formatDate(dateString) {

    const d =
        new Date(dateString);

    return d.toLocaleDateString();

}

// ================= REMOVE ADMIN =================

async function removeAdmin(id) {

    if (!confirm("Remove Admin role from this user?")) return;

    const token = localStorage.getItem("adminToken");

    const res = await fetch(
        CONFIG.BASE_URL + "/api/users/" + id + "/role/user",
        {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        }
    );

    const data = await res.text(); // response is plain text, not JSON

    console.log("REMOVE STATUS:", res.status);
    console.log("REMOVE RESPONSE:", data);

    if (res.ok) {
        alert("User downgraded to USER role successfully!");
        refreshUsers();
    } else {
        alert("Failed to remove admin role.");
    }
}

// ================= PASSWORD SHOW/HIDE (Create User form) =================

document.addEventListener("DOMContentLoaded", () => {

    const toggleBtn = document.getElementById("toggleCreatePassword");
    const icon = document.getElementById("toggleCreatePasswordIcon");
    const passwordInput = document.getElementById("password");

    if (toggleBtn) {

        toggleBtn.addEventListener("click", function () {

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }

        });

    }

});