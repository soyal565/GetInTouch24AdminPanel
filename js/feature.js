// ================= INIT =================

document.addEventListener("DOMContentLoaded", () => {
    loadActiveFeatures();   // default: active list
});

function getToken() {
    return localStorage.getItem("adminToken");
}

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

function refreshFeatures() {
    if (currentFilter === "inactive") {
        loadInactiveFeatures();
    } else {
        loadActiveFeatures();
    }
}

// ================= LOAD ACTIVE FEATURES =================

async function loadActiveFeatures() {
    currentFilter = "active";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/active", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("ACTIVE features raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderFeatures([]);
            return;
        }

        renderFeatures(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Load active features error:", err);
    }
}

// ================= LOAD INACTIVE FEATURES =================

async function loadInactiveFeatures() {
    currentFilter = "inactive";
    setFilterButtonState();

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/inactive", {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const raw = await res.text();
        console.log("INACTIVE features raw:", raw);

        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            console.error("Invalid JSON:", raw);
            renderFeatures([]);
            return;
        }

        renderFeatures(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
        console.error("Load inactive features error:", err);
    }
}

// ================= RENDER FEATURES =================

function renderFeatures(features) {
    const tbody = document.getElementById("featureTableBody");
    tbody.innerHTML = "";

    // Lower displayOrder first, same order the home page will show them in
    features.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    if (!features || features.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No features found</td></tr>`;
        return;
    }

    features.forEach(feature => {
        // Active status: check boolean true strictly
        const isActive = feature.active === true;

        const thumbnailHtml = feature.imageUrl
            ? `<img src="${feature.imageUrl}" width="80" height="50" style="object-fit:cover; border-radius:4px;" onerror="this.style.display='none'">`
            : `<span class="text-muted small">No image</span>`;

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        // Activate / Deactivate toggle button
        const toggleBtn = isActive
            ? `<button class="btn btn-secondary btn-sm" onclick="deactivateFeature(${feature.id})">Deactivate</button>`
            : `<button class="btn btn-success btn-sm" onclick="activateFeature(${feature.id})">Activate</button>`;

        tbody.innerHTML += `
<tr>
    <td class="col-id">${feature.id}</td>
    <td class="col-title">${feature.title}</td>
    <td class="col-description">${feature.description}</td>
    <td class="col-order">${feature.displayOrder}</td>
    <td class="col-thumbnail">${thumbnailHtml}</td>
    <td class="col-status">${statusBadge}</td>
    <td class="col-actions">
        <div class="action-btns">
            <button class="btn btn-info btn-sm" onclick="viewFeature(${feature.id})">View</button>
            <button class="btn btn-warning btn-sm" onclick="openEditModal(${feature.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteFeature(${feature.id})">Delete</button>
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
    const file = document.getElementById("editFeatureThumbnailFile").files[0];
    const previewBox = document.getElementById("editThumbPreview");

    if (!file) return;

    const url = URL.createObjectURL(file);
    previewBox.innerHTML = `<img src="${url}" style="max-height:150px; border-radius:6px; object-fit:cover;">`;
}

// ================= UPLOAD THUMBNAIL =================
// Reuses the same generic thumbnail-upload endpoint the courses admin
// page uses — it just takes a file and hands back a URL, nothing
// course-specific about it, so features can use it too.

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

// ================= CREATE FEATURE =================

async function createFeature() {
    const title        = document.getElementById("featureTitle").value.trim();
    const description  = document.getElementById("featureDescription").value.trim();
    const displayOrder = document.getElementById("featureDisplayOrder").value.trim();
    const thumbnailFile = document.getElementById("featureThumbnail").files[0];

    if (!title || !description || !displayOrder || !thumbnailFile) {
        alert("Fill all the fields and select the thumbnail");
        return;
    }

    try {
        const imageUrl = await uploadThumbnail(thumbnailFile);
        console.log("Thumbnail URL:", imageUrl);

        const payload = { title, description, imageUrl, displayOrder: Number(displayOrder) };
        console.log("Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/public/features", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + getToken()
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert("Feature created successfully !");
            document.getElementById("featureTitle").value = "";
            document.getElementById("featureDescription").value = "";
            document.getElementById("featureDisplayOrder").value = "";
            document.getElementById("featureThumbnail").value = "";
            document.getElementById("createThumbPreview").innerHTML =
                `<span class="placeholder-text">Thumbnail preview will appear here</span>`;
            refreshFeatures();
        } else {
            alert(data.message || "An error occured while creating feature");
        }

    } catch (err) {
        console.error("Create error:", err);
        alert("An error occured while creating feature");
    }
}

// ================= DELETE FEATURE =================

async function deleteFeature(id) {
    if (!confirm("This feature will be delete permanently , are you sure that you want to delete?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + getToken() }
        });

        if (res.ok) {
            alert("Feature deleted successfully !");
            refreshFeatures();
        } else {
            alert("An error occured while deleting");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// ================= ACTIVATE FEATURE =================

async function activateFeature(id) {
    if (!confirm("Do you want to activate this feature?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id + "/activate", {
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
            alert(`"${data?.title || "Feature"}" activated!`);
            refreshFeatures();
        } else {
            const msg = data?.message || `Error: ${res.status}`;
            alert("An error occured while activating — " + msg);
        }
    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server, try again later");
    }
}

// ================= DEACTIVATE FEATURE =================

async function deactivateFeature(id) {
    if (!confirm("Do you want to deactivate this feature?")) return;

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id + "/deactivate", {
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
            alert(`"${data?.title || "Feature"}" feature deactvated successfully !!`);
            refreshFeatures();
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
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const feature = await res.json();
        console.log("Feature Data:", feature);

        document.getElementById("editFeatureId").value          = feature.id;
        document.getElementById("editFeatureTitle").value       = feature.title;
        document.getElementById("editFeatureDescription").value = feature.description;
        document.getElementById("editFeatureDisplayOrder").value = feature.displayOrder;
        document.getElementById("editFeatureImageUrl").value    = feature.imageUrl || "";

        // Clear previous file selection
        document.getElementById("editFeatureThumbnailFile").value = "";

        // Show existing thumbnail in preview
        const previewBox = document.getElementById("editThumbPreview");
        if (feature.imageUrl) {
            previewBox.innerHTML = `<img src="${feature.imageUrl}" style="max-height:150px; border-radius:6px; object-fit:cover;" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>Could not load image</span>'">`;
        } else {
            previewBox.innerHTML = `<span class="placeholder-text">There is no thumbnail</span>`;
        }

        const modal = new bootstrap.Modal(document.getElementById("editFeatureModal"));
        modal.show();

    } catch (err) {
        console.error("Edit load error:", err);
        alert("An error occured while loading the feature data");
    }
}

// ================= UPDATE FEATURE =================

async function updateFeature() {
    const id          = document.getElementById("editFeatureId").value;
    const title       = document.getElementById("editFeatureTitle").value.trim();
    const description = document.getElementById("editFeatureDescription").value.trim();
    const displayOrder = document.getElementById("editFeatureDisplayOrder").value.trim();
    const thumbnailFile = document.getElementById("editFeatureThumbnailFile").files[0];
    let imageUrl        = document.getElementById("editFeatureImageUrl").value;

    if (!title || !description || !displayOrder) {
        alert("Title, description aur order fill karo.");
        return;
    }

    try {
        // Agar naya thumbnail select kiya hai toh pehle upload karo
        if (thumbnailFile) {
            imageUrl = await uploadThumbnail(thumbnailFile);
            console.log("New Thumbnail URL:", imageUrl);
        }

        if (!imageUrl) {
            alert("Thumbnail is required !.");
            return;
        }

        const payload = {
            title,
            description,
            imageUrl,
            displayOrder: Number(displayOrder)
        };
        console.log("Update Payload:", payload);

        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id, {
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
            alert("Feature updated successfully !");
            bootstrap.Modal.getInstance(document.getElementById("editFeatureModal")).hide();
            refreshFeatures();
        } else {
            alert(data.message || "An error occured while updating.");
        }

    } catch (err) {
        console.error("Update error:", err);
        alert("An error occured while updating feature ");
    }
}

// ================= VIEW FEATURE =================

async function viewFeature(id) {
    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/features/" + id, {
            headers: { Authorization: "Bearer " + getToken() }
        });
        const feature = await res.json();

        document.getElementById("viewId").textContent          = feature.id;
        document.getElementById("viewTitle").textContent       = feature.title;
        document.getElementById("viewDescription").textContent = feature.description;
        document.getElementById("viewDisplayOrder").textContent = feature.displayOrder;
        document.getElementById("viewStatus").textContent      = feature.active === true ? "Active" : "Inactive";
        document.getElementById("viewCreatedAt").textContent   = feature.createdAt ? new Date(feature.createdAt).toLocaleString() : "-";
        document.getElementById("viewUpdatedAt").textContent   = feature.updatedAt ? new Date(feature.updatedAt).toLocaleString() : "-";

        const imgEl          = document.getElementById("viewThumbnail");
        const placeholderEl  = document.getElementById("viewThumbnailPlaceholder");

        if (feature.imageUrl) {
            imgEl.src           = feature.imageUrl;
            imgEl.style.display = "block";
            placeholderEl.style.display = "none";
        } else {
            imgEl.style.display = "none";
            placeholderEl.style.display = "flex";
        }

        const modal = new bootstrap.Modal(document.getElementById("viewFeatureModal"));
        modal.show();

    } catch (err) {
        console.error("View error:", err);
        alert("An error occured while loading the feature detail");
    }
}