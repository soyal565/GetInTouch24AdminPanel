// ================= INIT =================

document.addEventListener("DOMContentLoaded", () => {
    loadCourses();
    loadActivePapers();   // default: active list
});

function getToken() {
    return localStorage.getItem("adminToken");
}

// ================= LOAD PAPERS =================

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

function refreshPapers() {
    if (currentFilter === "inactive") {
        loadInactivePapers();
    } else {
        loadActivePapers();
    }
}

// ================= LOAD ACTIVE PAPERS =================

async function loadActivePapers() {
    currentFilter = "active";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/active", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("ACTIVE papers raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderPapers([]);
            return;
        }

        const papers = Array.isArray(data) ? data : data.data || [];
        renderPapers(papers);
    } catch (err) {
        console.error("Load active papers error:", err);
    }
}

// ================= LOAD INACTIVE PAPERS =================

async function loadInactivePapers() {
    currentFilter = "inactive";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/inactive", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("INACTIVE papers raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderPapers([]);
            return;
        }

        const papers = Array.isArray(data) ? data : data.data || [];
        renderPapers(papers);
    } catch (err) {
        console.error("Load inactive papers error:", err);
    }
}

// ================= RENDER PAPERS =================

function renderPapers(papers) {
    const tbody = document.getElementById("paperTableBody");
    tbody.innerHTML = "";

    if (!papers || papers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No papers found</td></tr>`;
        return;
    }

    papers.forEach(paper => {
        const isActive = paper.active === true;

        const thumbnailHtml = paper.thumbnail
            ? `<img src="${paper.thumbnail}" width="80" height="50" style="object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">`
            : `<span class="text-muted small">No image</span>`;

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        const activateBtn = !isActive
            ? `<button class="btn btn-success btn-sm" onclick="activatePaper(${paper.id})">Activate</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="deactivatePaper(${paper.id})">Deactivate</button>`;

        tbody.innerHTML += `
<tr>
    <td>${paper.id}</td>
    <td>${paper.name}</td>
    <td>${paper.paperNumber}</td>
    <td style="white-space:normal; min-width:160px;">${paper.description}</td>
    <td>${paper.courseName || "-"}</td>
    <td>${thumbnailHtml}</td>
    <td>${statusBadge}</td>
    <td>
        <div class="d-flex flex-wrap gap-1">
            <button class="btn btn-info btn-sm" onclick="viewPaper(${paper.id})">View</button>
            <button class="btn btn-warning btn-sm" onclick="openEditModal(${paper.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePaper(${paper.id})">Delete</button>
            ${activateBtn}
        </div>
    </td>
</tr>`;
    });
}

// ================= LOAD COURSES (cached) =================

// Courses ek baar fetch karke yahan store karo
let cachedCourses = [];

async function loadCourses() {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/courses", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        cachedCourses = await res.json();
        console.log("Courses:", cachedCourses);
        fillCourseDropdown("paperCourse", null);
        fillCourseDropdown("editPaperCourse", null);
    } catch (err) {
        console.error("Load Courses Error:", err);
    }
}

// Kisi bhi dropdown ko fill karo, aur chahein toh ek value selected rakho
function fillCourseDropdown(dropdownId, selectedCourseId) {
    const el = document.getElementById(dropdownId);
    if (!el) return;

    const options = cachedCourses.map(c => {
        const isSelected = selectedCourseId && Number(c.id) === Number(selectedCourseId);
        return `<option value="${c.id}" ${isSelected ? "selected" : ""}>${c.name}</option>`;
    }).join("");

    el.innerHTML = '<option value="">Select Course</option>' + options;
    console.log(`${dropdownId} set to courseId=${selectedCourseId}, result value=${el.value}`);
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
    const file = document.getElementById("editPaperThumbnailFile").files[0];
    const previewBox = document.getElementById("editThumbPreview");

    if (!file) return;

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" style="max-height:150px; border-radius:6px; object-fit:cover;">`;
}

// ================= UPLOAD THUMBNAIL =================

async function uploadThumbnail(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${CONFIG.BASE_URL}/api/papers/thumbnail`, {
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

// ================= CREATE PAPER =================

async function createPaper() {
    const name = document.getElementById("paperName").value.trim();
    const paperNumber = document.getElementById("paperNumber").value.trim();
    const description = document.getElementById("paperDescription").value.trim();
    const courseId = document.getElementById("paperCourse").value;
    const thumbnailFile = document.getElementById("paperThumbnail").files[0];

    if (!name || !paperNumber || !description || !courseId || !thumbnailFile) {
        alert("Fill all the fields and select the thumbnail");
        return;
    }

    try {
        const thumbnail = await uploadThumbnail(thumbnailFile);

        const res = await fetch(CONFIG.BASE_URL + "/api/papers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify({
                name,
                paperNumber: Number(paperNumber),
                description,
                thumbnail,
                courseId: Number(courseId)
            })
        });

        if (res.ok) {
            alert("Paper created successfully!");
            document.getElementById("paperName").value = "";
            document.getElementById("paperNumber").value = "";
            document.getElementById("paperDescription").value = "";
            document.getElementById("paperCourse").value = "";
            document.getElementById("paperThumbnail").value = "";
            document.getElementById("createThumbPreview").innerHTML =
                `<span class="placeholder-text">Thumbnail preview will appear here</span>`;
            refreshPapers();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.message || "An error occured while creating the paper");
        }

    } catch (err) {
        console.error("Create error:", err);
        alert("An error occured while creating the paper");
    }
}

// ================= SEARCH PAPER =================

async function searchPaper() {
    const keyword = document.getElementById("searchKeyword").value.trim();
    if (!keyword) { loadPapers(); return; }

    try {
        const res = await fetch(
            CONFIG.BASE_URL + "/api/papers/search?keyword=" + encodeURIComponent(keyword),
            { headers: { Authorization: "Bearer " + getToken() } }
        );
        const papers = await res.json();
        renderPapers(Array.isArray(papers) ? papers : papers.data || []);
    } catch (err) {
        console.error("Search error:", err);
    }
}

function clearSearch() {
    document.getElementById("searchKeyword").value = "";
    loadPapers();
}

// ================= VIEW PAPER =================

async function viewPaper(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const paper = await res.json();

        document.getElementById("viewId").textContent = paper.id;
        document.getElementById("viewName").textContent = paper.name;
        document.getElementById("viewNumber").textContent = paper.paperNumber;
        document.getElementById("viewCourse").textContent = paper.courseName || "-";
        document.getElementById("viewDescription").textContent = paper.description;
        document.getElementById("viewStatus").textContent = paper.active === true ? "Active" : "Inactive";

        const imgEl = document.getElementById("viewThumbnail");
        const placeholderEl = document.getElementById("viewThumbnailPlaceholder");

        if (paper.thumbnail) {
            imgEl.src = paper.thumbnail;
            imgEl.style.display = "block";
            placeholderEl.style.display = "none";
        } else {
            imgEl.style.display = "none";
            placeholderEl.style.display = "flex";
        }

        const modal = new bootstrap.Modal(document.getElementById("viewPaperModal"));
        modal.show();

    } catch (err) {
        console.error("View error:", err);
        alert("An error occured while loading the paper details");
    }
}

// ================= OPEN EDIT MODAL =================

async function openEditModal(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const paper = await res.json();
        console.log("Paper Data:", paper);

        document.getElementById("editPaperId").value = paper.id;
        document.getElementById("editPaperName").value = paper.name;
        document.getElementById("editPaperNumber").value = paper.paperNumber;
        document.getElementById("editPaperDescription").value = paper.description;
        document.getElementById("editPaperThumbnail").value = paper.thumbnail || "";

        // Course dropdown fresh fill karo with selected courseId
        // Yahi fix hai — value baad mein set karne ki jagah
        // option mein hi "selected" attribute lagate hain
        fillCourseDropdown("editPaperCourse", paper.courseId);

        // Clear previous file selection
        document.getElementById("editPaperThumbnailFile").value = "";

        // Existing thumbnail preview dikhao
        const previewBox = document.getElementById("editThumbPreview");
        if (paper.thumbnail) {
            previewBox.innerHTML = `<img src="${paper.thumbnail}" style="max-height:150px; border-radius:6px; object-fit:cover;" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>Didn't load image</span>'">`;
        } else {
            previewBox.innerHTML = `<span class="placeholder-text">There is no thumbnail</span>`;
        }

        const modal = new bootstrap.Modal(document.getElementById("editPaperModal"));
        modal.show();

    } catch (err) {
        console.error("Edit load error:", err);
        alert("An error occured while loading the paper data");
    }
}

// ================= UPDATE PAPER =================

async function updatePaper() {
    const id = document.getElementById("editPaperId").value;
    const name = document.getElementById("editPaperName").value.trim();
    const paperNumber = document.getElementById("editPaperNumber").value.trim();
    const description = document.getElementById("editPaperDescription").value.trim();
    const courseId = document.getElementById("editPaperCourse").value;
    const thumbnailFile = document.getElementById("editPaperThumbnailFile").files[0];
    let thumbnail = document.getElementById("editPaperThumbnail").value;

    console.log("Update — courseId selected:", courseId);

    if (!name || !paperNumber || !description || !courseId) {
        alert("Fill all the fields");
        return;
    }

    try {
        // Naya thumbnail select kiya hai toh upload karo
        if (thumbnailFile) {
            thumbnail = await uploadThumbnail(thumbnailFile);
            console.log("New Thumbnail URL:", thumbnail);
        }

        if (!thumbnail) {
            alert("Thumbnail is required");
            return;
        }

        const payload = {
            name,
            paperNumber: Number(paperNumber),
            description,
            thumbnail,
            courseId: Number(courseId)
        };
        console.log("Update Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Paper updated successfully !");
            bootstrap.Modal.getInstance(document.getElementById("editPaperModal")).hide();
            refreshPapers();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.message || "An error occured while updating the paper");
        }

    } catch (err) {
        console.error("Update error:", err);
        alert("An error occured while updating the paper.");
    }
}

// ================= ACTIVATE PAPER =================

async function activatePaper(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id + "/activate", {
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
            alert("Paper activated successfully !!");
            refreshPapers();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while activating the paper — " + msg);
        }
    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server, please try again later");
    }
}

// ================= DEACTIVATE PAPER =================

async function deactivatePaper(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id + "/deactivate", {
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
            alert("Paper deactivated successfully ");
            refreshPapers();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while deactivating the paper — " + msg);
        }
    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Failed to connect with server, please try again later");
    }
}

// ================= DELETE PAPER =================

async function deletePaper(id) {
    if (!confirm("This paper will be delete for permanent , are you sure that you want to delete?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/papers/" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + getToken() }
        });

        if (res.ok) {
            alert("Paper deleted successfully !");
            refreshPapers();
        } else {
            alert("An error occured while deleting the paper");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}