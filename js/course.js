// ================= INIT =================

document.addEventListener("DOMContentLoaded", () => {
    loadActiveCourses();   // default: active list
});

function getToken() {
    return localStorage.getItem("adminToken");
}

// ================= LOAD COURSES =================

// ================= FILTER STATE =================

let currentFilter = "active";

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

function refreshCourses() {
    if (currentFilter === "inactive") {
        loadInactiveCourses();
    } else {
        loadActiveCourses();
    }
}

// ================= LOAD ACTIVE COURSES =================

async function loadActiveCourses() {
    currentFilter = "active";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/active", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("ACTIVE courses raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderCourses([]);
            return;
        }

        renderCourses(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Load active courses error:", err);
    }
}

// ================= LOAD INACTIVE COURSES =================

async function loadInactiveCourses() {
    currentFilter = "inactive";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/inactive", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("INACTIVE courses raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderCourses([]);
            return;
        }

        renderCourses(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Load inactive courses error:", err);
    }
}

// ================= RENDER COURSES =================

function renderCourses(courses) {
    const tbody = document.getElementById("courseTableBody");
    tbody.innerHTML = "";

    if (!courses || courses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No courses found</td></tr>`;
        return;
    }

    courses.forEach(course => {
        // Active status: check boolean true strictly
        const isActive = course.active === true;

        const thumbnailHtml = course.thumbnail
            ? `<img src="${course.thumbnail}" width="80" height="50" style="object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">`
            : `<span class="text-muted small">No image</span>`;

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        // Activate / Deactivate toggle button
        const toggleBtn = isActive
            ? `<button class="btn btn-secondary btn-sm" onclick="deactivateCourse(${course.id})">Deactivate</button>`
            : `<button class="btn btn-success btn-sm" onclick="activateCourse(${course.id})">Activate</button>`;

        tbody.innerHTML += `
<tr>
    <td>${course.id}</td>
    <td>${course.name}</td>
    <td>${course.courseNumber}</td>
    <td style="white-space:normal; min-width:160px;">${course.description}</td>
    <td>${thumbnailHtml}</td>
    <td>${statusBadge}</td>
    <td>
        <div class="d-flex flex-wrap gap-1">
            <button class="btn btn-info btn-sm" onclick="viewCourse(${course.id})">View</button>
            <button class="btn btn-warning btn-sm" onclick="openEditModal(${course.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCourse(${course.id})">Delete</button>
            ${toggleBtn}
        </div>
    </td>
</tr>`;
    });
}

// ================= THUMBNAIL PREVIEW (shared) =================

function previewThumbnail(inputId, previewId) {
    const file = document.getElementById(inputId).files[0];
    const previewBox = document.getElementById(previewId);

    if (!file) {
        previewBox.innerHTML = `<span class="placeholder-text">Thumbnail preview will appear here</span>`;
        return;
    }

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" style="max-height:150px; border-radius:6px; object-fit:cover;">`;
}

// ================= EDIT THUMBNAIL CHANGE =================

function handleEditThumbnailChange() {
    const file = document.getElementById("editCourseThumbnailFile").files[0];
    const previewBox = document.getElementById("editThumbPreview");

    if (!file) return;

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" style="max-height:150px; border-radius:6px; object-fit:cover;">`;
}

// ================= CREATE COURSE =================

async function createCourse() {
    const name        = document.getElementById("courseName").value.trim();
    const courseNumber = document.getElementById("courseNumber").value.trim();
    const description = document.getElementById("courseDescription").value.trim();
    const thumbnailFile = document.getElementById("courseThumbnail").files[0];

    if (!name || !courseNumber || !description || !thumbnailFile) {
        alert("Fill all the fields and select the thumbnail");
        return;
    }

    try {
        const thumbnail = await uploadThumbnail(thumbnailFile);
        console.log("Thumbnail URL:", thumbnail);

        const payload = { name, courseNumber: Number(courseNumber), description, thumbnail };
        console.log("Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/courses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert("Course created successfully !");
            document.getElementById("courseName").value = "";
            document.getElementById("courseNumber").value = "";
            document.getElementById("courseDescription").value = "";
            document.getElementById("courseThumbnail").value = "";
            document.getElementById("createThumbPreview").innerHTML =
                `<span class="placeholder-text">Thumbnail preview will appear here</span>`;
            refreshCourses();
        } else {
            alert(data.message || "An error occured while creating course");
        }

    } catch (err) {
        console.error("Create error:", err);
        alert("An error occured while creating course");
    }
}

// ================= SEARCH COURSE =================

async function searchCourse() {
    const keyword = document.getElementById("searchKeyword").value.trim();
    if (!keyword) { loadCourses(); return; }

    try {
        const res = await fetch(
            CONFIG.BASE_URL + "/api/courses/search?keyword=" + encodeURIComponent(keyword),
            { headers: { Authorization: "Bearer " + getToken() } }
        );
        const data = await res.json();
        renderCourses(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Search error:", err);
    }
}

function clearSearch() {
    document.getElementById("searchKeyword").value = "";
    loadCourses();
}

// ================= DELETE COURSE =================

async function deleteCourse(id) {
    if (!confirm("This course will be delete permanently , are you sure that you want to delete?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + getToken() }
        });

        if (res.ok) {
            alert("Course deleted successfully !");
            refreshCourses();
        } else {
            alert("An error occured while deleting");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// ================= ACTIVATE COURSE =================

async function activateCourse(id) {
    if (!confirm("Do you want to activate this course?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id + "/activate", {
            method: "PATCH",
            headers: { Authorization: "Bearer " + getToken() }
        });

        let data = null;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        }
        console.log("Activate response:", res.status, data);

        if (res.ok) {
            alert(`"${data?.name || "Course"}" activated!`);
            refreshCourses();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while activating — " + msg);
        }
    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server, try again later");
    }
}

// ================= DEACTIVATE COURSE =================

async function deactivateCourse(id) {
    if (!confirm("Do you want to deactivate this course?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id + "/deactivate", {
            method: "PATCH",
            headers: { Authorization: "Bearer " + getToken() }
        });

        let data = null;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        }
        console.log("Deactivate response:", res.status, data);

        if (res.ok) {
            alert(`"${data?.name || "Course"}" Course deactvated successfully !!`);
            refreshCourses();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while deactivating — " + msg);
        }
    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Failed to connect with server, please try again later");
    }
}

// ================= OPEN EDIT MODAL =================

async function openEditModal(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const course = await res.json();
        console.log("Course Data:", course);

        document.getElementById("editCourseId").value          = course.id;
        document.getElementById("editCourseName").value        = course.name;
        document.getElementById("editCourseNumber").value      = course.courseNumber;
        document.getElementById("editCourseDescription").value = course.description;
        document.getElementById("editCourseThumbnail").value   = course.thumbnail || "";

        // Clear previous file selection
        document.getElementById("editCourseThumbnailFile").value = "";

        // Show existing thumbnail in preview
        const previewBox = document.getElementById("editThumbPreview");
        if (course.thumbnail) {
            previewBox.innerHTML = `<img src="${course.thumbnail}" style="max-height:150px; border-radius:6px; object-fit:cover;" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>Didn't load image</span>'">`;
        } else {
            previewBox.innerHTML = `<span class="placeholder-text">There is no thumbnail</span>`;
        }

        const modal = new bootstrap.Modal(document.getElementById("editCourseModal"));
        modal.show();

    } catch (err) {
        console.error("Edit load error:", err);
        alert("An error occured while loading the course data");
    }
}

// ================= UPDATE COURSE =================

async function updateCourse() {
    const id          = document.getElementById("editCourseId").value;
    const name        = document.getElementById("editCourseName").value.trim();
    const courseNumber = document.getElementById("editCourseNumber").value.trim();
    const description = document.getElementById("editCourseDescription").value.trim();
    const thumbnailFile = document.getElementById("editCourseThumbnailFile").files[0];
    let thumbnail       = document.getElementById("editCourseThumbnail").value;

    if (!name || !courseNumber || !description) {
        alert("Name, number aur description fill karo.");
        return;
    }

    try {
        // Agar naya thumbnail select kiya hai toh pehle upload karo
        if (thumbnailFile) {
            thumbnail = await uploadThumbnail(thumbnailFile);
            console.log("New Thumbnail URL:", thumbnail);
        }

        if (!thumbnail) {
            alert("Thumbnail is required !.");
            return;
        }

        const payload = {
            name,
            courseNumber: Number(courseNumber),
            description,
            thumbnail
        };
        console.log("Update Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Update Response:", data);

        if (res.ok) {
            alert("Course updated successfully !");
            bootstrap.Modal.getInstance(document.getElementById("editCourseModal")).hide();
            refreshCourses();
        } else {
            alert(data.message || "An error occured while updating.");
        }

    } catch (err) {
        console.error("Update error:", err);
        alert("An error occured while updating course ");
    }
}

// ================= UPLOAD THUMBNAIL =================

async function uploadThumbnail(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${CONFIG.BASE_URL}/api/courses/thumbnail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
    });

    if (!response.ok) {
        throw new Error("Thumbnail upload failed");
    }

    const url = await response.text();
    console.log("Uploaded Thumbnail URL:", url);
    return url;
}

// ================= VIEW COURSE =================

async function viewCourse(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const course = await res.json();

        document.getElementById("viewId").textContent          = course.id;
        document.getElementById("viewName").textContent        = course.name;
        document.getElementById("viewNumber").textContent      = course.courseNumber;
        document.getElementById("viewDescription").textContent = course.description;
        document.getElementById("viewStatus").textContent      = course.active === true ? "Active" : "Inactive";

        const imgEl          = document.getElementById("viewThumbnail");
        const placeholderEl  = document.getElementById("viewThumbnailPlaceholder");

        if (course.thumbnail) {
            imgEl.src           = course.thumbnail;
            imgEl.style.display = "block";
            placeholderEl.style.display = "none";
        } else {
            imgEl.style.display = "none";
            placeholderEl.style.display = "flex";
        }

        const modal = new bootstrap.Modal(document.getElementById("viewCourseModal"));
        modal.show();

    } catch (err) {
        console.error("View error:", err);
        alert("An error occured while loading the course detail");
    }
}