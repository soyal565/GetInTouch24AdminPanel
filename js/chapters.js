// ================= INIT =================

// Tracks which list is currently being shown: "active" or "inactive"
let currentFilter = "active";

document.addEventListener("DOMContentLoaded", () => {
    loadCoursesAndPapers();
    loadActiveChapters();
});

function getToken() {
    return localStorage.getItem("adminToken");
}

// ================= LOAD COURSES + PAPERS (cached) =================

let cachedCourses = [];
let cachedPapers = [];

async function loadCoursesAndPapers() {
    try {
        const [coursesRes, papersRes] = await Promise.all([
            fetch(CONFIG.BASE_URL + "/api/courses/active", {
                headers: { Authorization: "Bearer " + getToken() }
            }),
            fetch(CONFIG.BASE_URL + "/api/papers/active", {
                headers: { Authorization: "Bearer " + getToken() }
            })
        ]);

        const coursesData = await coursesRes.json();
        const papersData = await papersRes.json();

        cachedCourses = Array.isArray(coursesData) ? coursesData : coursesData.data || [];
        cachedPapers = Array.isArray(papersData) ? papersData : papersData.data || [];

        fillCourseDropdown("courseDropdown", null);
        fillCourseDropdown("editCourseDropdown", null);

        // No course selected yet on initial load -> paper dropdowns start empty
        setPaperDropdownEmpty("paperDropdown");
        setPaperDropdownEmpty("editPaperDropdown");

    } catch (err) {
        console.error("Course/Paper load error:", err);
    }
}

function fillCourseDropdown(dropdownId, selectedCourseId) {
    const el = document.getElementById(dropdownId);
    if (!el) return;

    const options = cachedCourses.map(c => {
        const isSelected = selectedCourseId && Number(c.id) === Number(selectedCourseId);
        return `<option value="${c.id}" ${isSelected ? "selected" : ""}>${c.name}</option>`;
    }).join("");

    el.innerHTML = '<option value="">Select Course</option>' + options;
}

function setPaperDropdownEmpty(dropdownId) {
    const el = document.getElementById(dropdownId);
    if (!el) return;
    el.innerHTML = '<option value="">Select a course first</option>';
    el.disabled = true;
}

// Fills a paper dropdown, filtered to only papers belonging to courseId.
// If courseId is falsy, the dropdown is left empty/disabled.
function fillPaperDropdown(dropdownId, selectedPaperId, courseId) {
    const el = document.getElementById(dropdownId);
    if (!el) return;

    if (!courseId) {
        setPaperDropdownEmpty(dropdownId);
        return;
    }

    const filteredPapers = cachedPapers.filter(p => Number(p.courseId) === Number(courseId));

    const options = filteredPapers.map(p => {
        const isSelected = selectedPaperId && Number(p.id) === Number(selectedPaperId);
        return `<option value="${p.id}" ${isSelected ? "selected" : ""}>${p.name}</option>`;
    }).join("");

    el.disabled = false;
    el.innerHTML = '<option value="">Select Paper</option>' + options;
    console.log(`${dropdownId} filtered by courseId=${courseId}, set to paperId=${selectedPaperId}, result value=${el.value}`);
}

// Called when a course dropdown changes — re-fills the linked paper dropdown
function onCourseChange(courseDropdownId, paperDropdownId) {
    const courseId = document.getElementById(courseDropdownId).value;
    fillPaperDropdown(paperDropdownId, null, courseId);
}

// ================= LOAD ACTIVE CHAPTERS =================

async function loadActiveChapters() {

    currentFilter = "active";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/active", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const chapters = await res.json();
        console.log("Active Chapters Response:", chapters);
        renderChapters(Array.isArray(chapters) ? chapters : chapters.data || []);
    } catch (err) {
        console.error("Load error:", err);
    }
}

// ================= LOAD INACTIVE CHAPTERS =================

async function loadInactiveChapters() {

    currentFilter = "inactive";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/inactive", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const chapters = await res.json();
        console.log("Inactive Chapters Response:", chapters);
        renderChapters(Array.isArray(chapters) ? chapters : chapters.data || []);
    } catch (err) {
        console.error("Load error:", err);
    }
}

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

// ================= REFRESH =================

function refreshChapters() {

    if (currentFilter === "inactive") {
        loadInactiveChapters();
    } else {
        loadActiveChapters();
    }
}

// ================= RENDER CHAPTERS =================

function renderChapters(chapters) {
    const tbody = document.getElementById("chapterTableBody");
    tbody.innerHTML = "";

    if (!chapters || chapters.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No chapters found</td></tr>`;
        return;
    }

    chapters.forEach(chapter => {
        const isActive = chapter.active === true;

        const thumbnailHtml = chapter.thumbnail
            ? `<img src="${chapter.thumbnail}" width="80" height="50" style="object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">`
            : `<span class="text-muted small">No image</span>`;

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        const activateBtn = !isActive
            ? `<button class="btn btn-success btn-sm" onclick="activateChapter(${chapter.id})">Activate</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="deactivateChapter(${chapter.id})">Deactivate</button>`;

        tbody.innerHTML += `
<tr>
    <td>${chapter.id}</td>
    <td>${thumbnailHtml}</td>
    <td>${chapter.title}</td>
    <td>${chapter.chapterNumber}</td>
    <td>${chapter.paperName || "-"}</td>
    <td>${statusBadge}</td>
    <td>
        <div class="d-flex flex-wrap gap-1">
            <button class="btn btn-info btn-sm" onclick="viewChapter(${chapter.id})">View</button>
            <button class="btn btn-warning btn-sm" onclick="openEditModal(${chapter.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteChapter(${chapter.id})">Delete</button>
            ${activateBtn}
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
    const file = document.getElementById("editChapterThumbnailFile").files[0];
    const previewBox = document.getElementById("editThumbPreview");
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" style="max-height:150px; border-radius:6px; object-fit:cover;">`;
}

// ================= UPLOAD THUMBNAIL =================

async function uploadThumbnail(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(CONFIG.BASE_URL + "/api/chapters/thumbnail", {
        method: "POST",
        headers: { Authorization: "Bearer " + getToken() },
        body: formData
    });

    if (!response.ok) throw new Error("Thumbnail upload failed");
    const url = await response.text();
    console.log("Uploaded Thumbnail URL:", url);
    return url;
}

// ================= CREATE CHAPTER =================

async function createChapter() {
    const title         = document.getElementById("chapterTitle").value.trim();
    const chapterNumber = document.getElementById("chapterNumber").value.trim();
    const description   = document.getElementById("chapterDescription").value.trim();
    const courseId      = document.getElementById("courseDropdown").value;
    const paperId       = document.getElementById("paperDropdown").value;
    const thumbnailFile = document.getElementById("chapterThumbnail").files[0];

    if (!title || !chapterNumber || !description || !courseId || !paperId || !thumbnailFile) {
        alert("Fill all the fields, select course & paper, and select the thumbnail");
        return;
    }

    try {
        const thumbnail = await uploadThumbnail(thumbnailFile);

        const res = await fetch(CONFIG.BASE_URL + "/api/chapters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify({
                title,
                chapterNumber: Number(chapterNumber),
                description,
                thumbnail,
                paperId: Number(paperId)
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Chapter created successfully !");
            document.getElementById("chapterTitle").value       = "";
            document.getElementById("chapterNumber").value      = "";
            document.getElementById("chapterDescription").value = "";
            document.getElementById("courseDropdown").value     = "";
            setPaperDropdownEmpty("paperDropdown");
            document.getElementById("chapterThumbnail").value   = "";
            document.getElementById("createThumbPreview").innerHTML =
                `<span class="placeholder-text">Thumbnail preview will appear here</span>`;
            refreshChapters();
        } else {
            alert(data.message || "An error occured while creating the chapter");
        }

    } catch (err) {
        console.error("Create error:", err);
        alert("An error occured while creating the chapter");
    }
}

// ================= SEARCH CHAPTER =================

async function searchChapter() {
    const keyword = document.getElementById("searchKeyword").value.trim();
    if (!keyword) { refreshChapters(); return; }

    try {
        const res = await fetch(
            CONFIG.BASE_URL + "/api/chapters/search?keyword=" + encodeURIComponent(keyword),
            { headers: { Authorization: "Bearer " + getToken() } }
        );
        const data = await res.json();
        renderChapters(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Search error:", err);
    }
}

function clearSearch() {
    document.getElementById("searchKeyword").value = "";
    refreshChapters();
}

// ================= VIEW CHAPTER =================

async function viewChapter(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const chapter = await res.json();

        document.getElementById("viewId").textContent            = chapter.id;
        document.getElementById("viewTitle").textContent         = chapter.title;
        document.getElementById("viewChapterNumber").textContent = chapter.chapterNumber;
        document.getElementById("viewPaperName").textContent     = chapter.paperName || "-";
        document.getElementById("viewDescription").textContent   = chapter.description;
        document.getElementById("viewStatus").textContent        = chapter.active === true ? "Active" : "Inactive";
        document.getElementById("viewCreatedAt").textContent     = chapter.createdAt || "-";
        document.getElementById("viewUpdatedAt").textContent     = chapter.updatedAt || "-";

        const imgEl         = document.getElementById("viewThumbnail");
        const placeholderEl = document.getElementById("viewThumbnailPlaceholder");

        if (chapter.thumbnail) {
            imgEl.src           = chapter.thumbnail;
            imgEl.style.display = "block";
            placeholderEl.style.display = "none";
        } else {
            imgEl.style.display         = "none";
            placeholderEl.style.display = "flex";
        }

        const modal = new bootstrap.Modal(document.getElementById("viewChapterModal"));
        modal.show();

    } catch (err) {
        console.error("View error:", err);
        alert("An error occured while loading the chapter details");
    }
}

// ================= OPEN EDIT MODAL =================

async function openEditModal(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const chapter = await res.json();
        console.log("Chapter Data:", chapter);

        document.getElementById("editChapterId").value          = chapter.id;
        document.getElementById("editChapterTitle").value       = chapter.title;
        document.getElementById("editChapterNumber").value      = chapter.chapterNumber;
        document.getElementById("editChapterDescription").value = chapter.description;
        document.getElementById("editChapterThumbnail").value   = chapter.thumbnail || "";

        // Figure out which course this chapter's paper belongs to, so the
        // course dropdown can be pre-selected and the paper dropdown
        // filtered correctly before selecting the actual paper.
        const paperObj = cachedPapers.find(p => Number(p.id) === Number(chapter.paperId));
        const courseId = paperObj ? paperObj.courseId : null;

        fillCourseDropdown("editCourseDropdown", courseId);
        fillPaperDropdown("editPaperDropdown", chapter.paperId, courseId);

        // Clear previous file
        document.getElementById("editChapterThumbnailFile").value = "";

        // Existing thumbnail preview
        const previewBox = document.getElementById("editThumbPreview");
        if (chapter.thumbnail) {
            previewBox.innerHTML = `<img src="${chapter.thumbnail}" style="max-height:150px; border-radius:6px; object-fit:cover;" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>Didn't load image</span>'">`;
        } else {
            previewBox.innerHTML = `<span class="placeholder-text">There is no thumbnail</span>`;
        }

        const modal = new bootstrap.Modal(document.getElementById("editChapterModal"));
        modal.show();

    } catch (err) {
        console.error("Edit load error:", err);
        alert("An error occured while loading the chapter data");
    }
}

// ================= UPDATE CHAPTER =================

async function updateChapter() {
    const id            = document.getElementById("editChapterId").value;
    const title         = document.getElementById("editChapterTitle").value.trim();
    const chapterNumber = document.getElementById("editChapterNumber").value.trim();
    const description   = document.getElementById("editChapterDescription").value.trim();
    const courseId      = document.getElementById("editCourseDropdown").value;
    const paperId       = document.getElementById("editPaperDropdown").value;
    const thumbnailFile = document.getElementById("editChapterThumbnailFile").files[0];
    let thumbnail       = document.getElementById("editChapterThumbnail").value;

    if (!title || !chapterNumber || !description || !courseId || !paperId) {
        alert("Fill all the fields, including course & paper");
        return;
    }

    try {
        if (thumbnailFile) {
            thumbnail = await uploadThumbnail(thumbnailFile);
            console.log("New Thumbnail URL:", thumbnail);
        }

        if (!thumbnail) {
            alert("Thumbnail is required");
            return;
        }

        const payload = {
            title,
            chapterNumber: Number(chapterNumber),
            description,
            thumbnail,
            paperId: Number(paperId)
        };
        console.log("Update Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Chapter updated successfully!");
            bootstrap.Modal.getInstance(document.getElementById("editChapterModal")).hide();
            refreshChapters();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.message || "An error occured while updating the chapter");
        }

    } catch (err) {
        console.error("Update error:", err);
        alert("An error occured while updating the chapter");
    }
}

// ================= ACTIVATE CHAPTER =================

async function activateChapter(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id + "/activate", {
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
            alert("Chapter activated successfully !");
            refreshChapters();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while activating the chapter — " + msg);
        }
    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server, please try again later");
    }
}

// ================= DEACTIVATE CHAPTER =================

async function deactivateChapter(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id + "/deactivate", {
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
            alert("Chapter deactivated successfuly !");
            refreshChapters();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while deactivating the chapter — " + msg);
        }
    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Failed to connect with server, please try again later");
    }
}

// ================= DELETE CHAPTER (HARD) =================

async function deleteChapter(id) {
    if (!confirm("This chapter will be delete for permanent , are you sure that you want to delete?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/chapters/" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + getToken() }
        });

        if (res.ok) {
            alert("Chapter deleted successfully .");
            refreshChapters();
        } else {
            alert("An error occured while deleting the chapter");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}