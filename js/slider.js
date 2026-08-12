console.log("slider.js loaded");

// ================= LOAD SLIDERS =================
async function loadSliders(isAdmin = true) { // ✅ isAdmin param
    const token = localStorage.getItem("adminToken");

    if (isAdmin && !token) {
        alert("❌ Please login first");
        return;
    }

    try {
        //  Decide endpoint based on admin or public
        const url = isAdmin ? CONFIG.BASE_URL + "/api/public/sliders" 
                            : CONFIG.BASE_URL + "/api/public/sliders/active";

        const res = await fetch(url, {
            headers: isAdmin ? { "Authorization": "Bearer " + token } : {}
        });

        console.log("STATUS:", res.status);
        const data = await res.json();
        console.log("RESPONSE:", data);

        let html = "";
        const sliders = Array.isArray(data) ? data : [data];

        sliders.forEach(slide => {
            // ✅ Variable isActive for each slide
            const isActive = slide.active;

            html += `
            <div class="col-md-3 mb-3">
                <div class="card p-2">
                    <img src="${slide.imageUrl}" class="img-fluid mb-2">
                    
                    ${isAdmin ? `
                        <button class="btn btn-danger btn-sm mb-1"
                            onclick="deleteSlider('${slide.id}')">
                            Delete
                        </button>
                        <button class="btn btn-warning btn-sm"
                            onclick="toggleSlider('${slide.id}', ${isActive}, '${slide.imageUrl}')">
                            ${isActive ? "Deactivate" : "Activate"}
                        </button>
                    ` : ""}
                </div>
            </div>
            `;
        });

        document.getElementById("sliderList").innerHTML = html;

    } catch (err) {
        console.error("Load Error:", err);
    }
}

// ================= DELETE SLIDER =================
async function deleteSlider(id) {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("❌ Please login first");
        return;
    }

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/sliders/" + id, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        console.log("STATUS:", res.status);
        loadSliders(true); // Admin reload
    } catch (err) {
        console.error("Delete Error:", err);
    }
}

// ================= TOGGLE ACTIVE =================
async function toggleSlider(id, currentStatus, imageUrl) {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("❌ Please login first");
        return;
    }

    try {
        const res = await fetch(CONFIG.BASE_URL + "/api/public/sliders/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                imageUrl: imageUrl,
                active: !currentStatus, // ✅ toggle status
                displayOrder: 1
            })
        });

        console.log("STATUS:", res.status);
        const data = await res.json();
        console.log("RESPONSE:", data);

        if (res.ok) {
            alert("✅ Status updated");
        } else {
            alert("❌ " + (data.message || "Failed"));
        }

        loadSliders(true);

    } catch (err) {
        console.error("Toggle Error:", err);
    }
}

// ================= UPLOAD / COMPRESS =================
function openFilePicker() {
    document.getElementById("imageInput").click();
}

document.getElementById("imageInput").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const token = localStorage.getItem("adminToken");

    try {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressedFile);

        const res = await fetch(CONFIG.BASE_URL + "/api/public/sliders", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
        });

        const data = await res.json();
        console.log("UPLOAD RESPONSE:", data);

        if (res.ok) loadSliders(true);
        else alert("❌ Upload failed: " + (data.message || ""));

    } catch (err) {
        console.error("Upload Error:", err);
    }
});

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;

            img.onload = function () {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const maxWidth = 800;
                const scaleSize = maxWidth / img.width;

                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, "image/jpeg", 0.7);
            };
        };

        reader.readAsDataURL(file);
    });
}

// ================= LOAD ON START =================
document.addEventListener("DOMContentLoaded", () => loadSliders(true)); // Admin panel