// ================= INIT =================

let notes = [];
let courses = [];
let papers = [];

// Tracks which list is currently being shown: "active" or "deactive"
let currentFilter = "active";

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadCourses();
        loadPapers();
        loadActiveNotes();
    }
);

// ================= TOKEN =================

function getToken() {
    return localStorage.getItem("adminToken");
}

// ================= LOAD COURSES =================

async function loadCourses() {

    try {

        const res = await fetch(
            `${CONFIG.BASE_URL}/api/courses`,
            {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        const data = await res.json();

        courses = Array.isArray(data)
            ? data
            : data.data || [];

        const dropdown =
            document.getElementById("courseDropdown");

        dropdown.innerHTML =
            `<option value="">Select Course</option>`;

        courses.forEach(course => {

            dropdown.innerHTML += `
                <option value="${course.id}">
                    ${course.name}
                </option>
            `;
        });

    }

    catch (err) {
        console.error("Load Courses Error:", err);
    }
}

// ================= LOAD PAPERS =================

async function loadPapers() {

    try {

        const res = await fetch(
            `${CONFIG.BASE_URL}/api/papers`,
            {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        const data = await res.json();

        papers = Array.isArray(data)
            ? data
            : data.data || [];

    }

    catch (err) {
        console.error("Load Papers Error:", err);
    }
}

// ================= FILTER PAPERS =================

function filterPapers() {

    const courseId =
        document.getElementById("courseDropdown").value;

    const paperDropdown =
        document.getElementById("paperDropdown");

    paperDropdown.innerHTML =
        `<option value="">Select Paper</option>`;

    if (!courseId) return;

    const filtered =
        papers.filter(p =>
            String(p.courseId) === String(courseId)
        );

    filtered.forEach(paper => {

        paperDropdown.innerHTML += `
            <option value="${paper.id}">
                ${paper.name}
            </option>
        `;
    });
}

// ================= UPLOAD THUMBNAIL =================

async function uploadThumbnail() {

    const fileInput =
        document.getElementById("thumbnailFile");

    if (!fileInput.files.length) {
        alert("Please select thumbnail");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/upload_thumbnail`,
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + getToken()
                },
                body: formData
            }
        );

        const url = await res.text();

        document.getElementById("thumbnailUrl").value = url;

        document.getElementById("thumbnailPreview").innerHTML =
            `<img src="${url}" style="width:100px">`;

        hideLoader();

    }

    catch (err) {
        hideLoader();
        console.error(err);
    }
}

// ================= UPLOAD PDF =================

async function uploadPdf() {

    const fileInput =
        document.getElementById("pdfFile");

    if (!fileInput.files.length) {
        alert("Please select PDF");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/upload_note`,
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + getToken()
                },
                body: formData
            }
        );

        const url = await res.text();

        document.getElementById("pdfUrl").value = url;

        document.getElementById("pdfPreview").innerHTML =
            `<a href="${url}" target="_blank">View PDF</a>`;

        hideLoader();

    }

    catch (err) {
        hideLoader();
        console.error(err);
    }
}

// ================= CREATE NOTE =================

async function createNote() {

    const body = {
        title: document.getElementById("title").value,
        price: Number(document.getElementById("price").value),
        description: document.getElementById("description").value,
        thumbnailUrl: document.getElementById("thumbnailUrl").value,
        pdfUrl: document.getElementById("pdfUrl").value,
        paperId: Number(document.getElementById("paperDropdown").value),
        active: document.getElementById("active").checked
    };

    if (!body.title || !body.paperId) {
        alert("Fill required fields");
        return;
    }

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getToken()
                },
                body: JSON.stringify(body)
            }
        );

        if (!res.ok) throw new Error("Failed");

        hideLoader();

        alert("Note created");

        resetNoteForm();

        // Refresh whichever list is currently active
        refreshNotes();

    }

    catch (err) {
        hideLoader();
        console.error(err);
    }
}

// ================= LOAD ACTIVE NOTES =================

async function loadActiveNotes() {

    currentFilter = "active";
    setFilterButtonState();

    try {

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/active`,
            {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        const data = await res.json();

        notes = Array.isArray(data)
            ? data
            : data.data || [];

        renderNotes();

    }

    catch (err) {
        console.error("Load Active Notes Error:", err);
    }
}

// ================= LOAD DEACTIVE NOTES =================

async function loadDeactiveNotes() {

    currentFilter = "deactive";
    setFilterButtonState();

    try {

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/deactive`,
            {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        const data = await res.json();

        notes = Array.isArray(data)
            ? data
            : data.data || [];

        renderNotes();

    }

    catch (err) {
        console.error("Load Deactive Notes Error:", err);
    }
}

// ================= FILTER BUTTON STATE =================

function setFilterButtonState() {

    const activeBtn = document.getElementById("btnActiveFilter");
    const deactiveBtn = document.getElementById("btnDeactiveFilter");

    if (currentFilter === "active") {

        activeBtn.classList.remove("btn-outline-success");
        activeBtn.classList.add("btn-success");

        deactiveBtn.classList.remove("btn-danger");
        deactiveBtn.classList.add("btn-outline-danger");

    } else {

        deactiveBtn.classList.remove("btn-outline-danger");
        deactiveBtn.classList.add("btn-danger");

        activeBtn.classList.remove("btn-success");
        activeBtn.classList.add("btn-outline-success");

    }
}

// ================= RENDER NOTES =================

function renderNotes() {

    const tbody =
        document.getElementById("notesTableBody");

    tbody.innerHTML = "";

    notes.forEach((note, index) => {

        tbody.innerHTML += `
            <tr>

                <td>${index + 1}</td>

                <td>
                    <img src="${note.thumbnailUrl || ''}" style="width:60px">
                </td>

                <td>${note.title || '-'}</td>

                <td>${note.paper?.name || note.paperName || '-'}</td>

                <td>₹${note.price || 0}</td>

                <td>
                    ${note.active
                ? '<span class="status-active">Active</span>'
                : '<span class="status-inactive">Inactive</span>'
            }
                </td>

                <td>
                    ${note.createdAt
                ? new Date(note.createdAt).toLocaleDateString()
                : '-'}
                </td>

                <td class="action-buttons">

    <button class="btn btn-info btn-sm"
        onclick="viewNote(${note.id})">
        View
    </button>

    <button class="btn btn-warning btn-sm"
        onclick="openEditModal(${note.id})">
        Edit
    </button>

    ${note.active
                ? `<button class="btn btn-outline-danger btn-sm" onclick="deactivateNote(${note.id})">Deactivate</button>`
                : `<button class="btn btn-outline-success btn-sm" onclick="activateNote(${note.id})">Activate</button>`
            }

    <button class="btn btn-danger btn-sm"
        onclick="deleteNote(${note.id})">
        Delete
    </button>

</td>

            </tr>
        `;
    });
}

// ================= ACTIVATE NOTE =================

async function activateNote(id) {

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/${id}/active`,
            {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        hideLoader();

        if (!res.ok) {
            alert("Failed to activate note");
            return;
        }

        alert("Note activated");

        refreshNotes();

    }

    catch (err) {
        hideLoader();
        console.error(err);
        alert("Failed to activate note");
    }
}

// ================= DEACTIVATE NOTE =================

async function deactivateNote(id) {

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/${id}/deactive`,
            {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        hideLoader();

        if (!res.ok) {
            alert("Failed to deactivate note");
            return;
        }

        alert("Note deactivated");

        refreshNotes();

    }

    catch (err) {
        hideLoader();
        console.error(err);
        alert("Failed to deactivate note");
    }
}

// ================= VIEW NOTE =================

async function viewNote(id) {

    const res = await fetch(
        `${CONFIG.BASE_URL}/admin/notes/${id}`,
        {
            headers: {
                Authorization: "Bearer " + getToken()
            }
        }
    );

    const note = await res.json();

    document.getElementById("viewNoteBody").innerHTML = `
        ${note.thumbnailUrl
            ? `<img src="${note.thumbnailUrl}" style="width:150px" class="mb-2"><br>`
            : ''}
        <h4>${note.title}</h4>
        <p>${note.description}</p>
        <a href="${note.pdfUrl}" target="_blank">Open PDF</a>
    `;

    new bootstrap.Modal(
        document.getElementById("viewNoteModal")
    ).show();
}

// ================= OPEN EDIT =================
async function openEditModal(id) {

    try {

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/${id}`,
            {
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        const note = await res.json();

        document.getElementById("editNoteId").value = note.id;
        document.getElementById("editTitle").value = note.title || "";
        document.getElementById("editPrice").value = note.price || 0;
        document.getElementById("editDescription").value = note.description || "";
        document.getElementById("editThumbnailUrl").value = note.thumbnailUrl || "";
        document.getElementById("editPdfUrl").value = note.pdfUrl || "";
        document.getElementById("editActive").checked = note.active;

        // Reset file inputs
        document.getElementById("editThumbnailFile").value = "";
        document.getElementById("editPdfFile").value = "";

        // Show existing thumbnail as image preview
        document.getElementById("editThumbnailPreview").innerHTML =
            note.thumbnailUrl
                ? `<img src="${note.thumbnailUrl}" style="width:100px">`
                : "";

        // Show existing pdf as a link preview
        document.getElementById("editPdfPreview").innerHTML =
            note.pdfUrl
                ? `<a href="${note.pdfUrl}" target="_blank">View PDF</a>`
                : "";

        populateEditPapers(note.paperId);

        new bootstrap.Modal(
            document.getElementById("editNoteModal")
        ).show();

    }

    catch (err) {

        console.error(err);
        alert("Failed to load note");

    }

}

function populateEditPapers(selectedPaperId) {

    const dropdown =
        document.getElementById("editPaperDropdown");

    dropdown.innerHTML = "";

    papers.forEach(paper => {

        dropdown.innerHTML += `
            <option value="${paper.id}">
                ${paper.name}
            </option>
        `;

    });

    dropdown.value = selectedPaperId;

}



// ================= UPLOAD EDIT THUMBNAIL =================

async function uploadEditThumbnail() {

    const fileInput =
        document.getElementById("editThumbnailFile");

    if (!fileInput.files.length) {
        alert("Please select thumbnail");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/upload_thumbnail`,
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + getToken()
                },
                body: formData
            }
        );

        const url = await res.text();

        document.getElementById("editThumbnailUrl").value = url;

        document.getElementById("editThumbnailPreview").innerHTML =
            `<img src="${url}" style="width:100px">`;

        hideLoader();

    }

    catch (err) {
        hideLoader();
        console.error(err);
    }
}

// ================= UPLOAD EDIT PDF =================

async function uploadEditPdf() {

    const fileInput =
        document.getElementById("editPdfFile");

    if (!fileInput.files.length) {
        alert("Please select PDF");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/upload_note`,
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + getToken()
                },
                body: formData
            }
        );

        const url = await res.text();

        document.getElementById("editPdfUrl").value = url;

        document.getElementById("editPdfPreview").innerHTML =
            `<a href="${url}" target="_blank">View PDF</a>`;

        hideLoader();

    }

    catch (err) {
        hideLoader();
        console.error(err);
    }
}

// ================= UPDATE NOTE =================
async function updateNote() {

    const id =
        document.getElementById("editNoteId").value;

    const body = {

        title:
            document.getElementById("editTitle").value,

        price:
            Number(document.getElementById("editPrice").value),

        description:
            document.getElementById("editDescription").value,

        thumbnailUrl:
            document.getElementById("editThumbnailUrl").value,

        pdfUrl:
            document.getElementById("editPdfUrl").value,

        paperId:
            Number(document.getElementById("editPaperDropdown").value),

        active:
            document.getElementById("editActive").checked

    };

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getToken()
                },

                body: JSON.stringify(body)
            }
        );

        if (!res.ok) {

            const error = await res.text();

            console.log(error);

            hideLoader();

            alert("Update failed");

            return;
        }

        hideLoader();

        bootstrap.Modal.getInstance(
            document.getElementById("editNoteModal")
        ).hide();

        alert("Note updated successfully");

        refreshNotes();

    }

    catch (err) {

        hideLoader();

        console.error(err);

        alert("Update failed");

    }

}



// ================= DELETE (HARD DELETE) =================

async function deleteNote(id) {

    if (!confirm("This will permanently delete the note. Continue?")) return;

    try {

        showLoader();

        const res = await fetch(
            `${CONFIG.BASE_URL}/admin/notes/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: "Bearer " + getToken()
                }
            }
        );

        hideLoader();

        if (!res.ok) {
            alert("Failed to delete note");
            return;
        }

        refreshNotes();

    }

    catch (err) {
        hideLoader();
        console.error(err);
        alert("Failed to delete note");
    }
}

// ================= RESET FORM =================

function resetNoteForm() {

    document.getElementById("title").value = "";
    document.getElementById("price").value = "";
    document.getElementById("description").value = "";
    document.getElementById("thumbnailFile").value = "";
    document.getElementById("pdfFile").value = "";
    document.getElementById("thumbnailUrl").value = "";
    document.getElementById("pdfUrl").value = "";
    document.getElementById("active").checked = true;
}

// ================= REFRESH =================

function refreshNotes() {

    if (currentFilter === "deactive") {
        loadDeactiveNotes();
    } else {
        loadActiveNotes();
    }
}