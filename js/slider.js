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

// ================= UPLOAD / OPTIMIZE =================
function openFilePicker() {
    document.getElementById("imageInput").click();
}

document.getElementById("imageInput").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const token = localStorage.getItem("adminToken");

    try {
        // 🔥 FIX: previously this ALWAYS force-resized every image to
        // 800px width (even upscaling small images -> blurry) and saved
        // it as JPEG at 70% quality. That's why sliders looked low-res
        // even though the originals were high quality.
        //
        // Now we only touch the file if it's genuinely huge, and even
        // then we never upscale and use a high quality setting so the
        // result is visually the same as the original.
        const fileToUpload = await optimizeImageIfNeeded(file);

        const formData = new FormData();
        formData.append("file", fileToUpload, file.name);

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

    // allow re-selecting the same file again later
    this.value = "";
});

// ================= IMAGE OPTIMIZATION (QUALITY-SAFE) =================
//
// Rules:
// 1. If the file is already reasonably small (<= 3 MB), upload it
//    AS-IS. No re-encoding at all -> zero quality loss.
// 2. If the file is larger than that, only downscale it if its width
//    is bigger than MAX_WIDTH (never upscale), and re-encode at a
//    high quality (0.95) in its ORIGINAL format (png stays png so
//    transparency/lossless quality is kept; jpeg/webp stay lossy but
//    at high quality instead of 0.7).
//
const SIZE_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_WIDTH = 1920; // plenty for any slider/banner display size
const JPEG_QUALITY = 0.95;

async function optimizeImageIfNeeded(file) {

    // Small enough already -> don't touch it, keep full original quality
    if (file.size <= SIZE_THRESHOLD_BYTES) {
        return file;
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    // Never upscale — only shrink if it's actually wider than MAX_WIDTH
    const needsResize = img.width > MAX_WIDTH;
    const targetWidth = needsResize ? MAX_WIDTH : img.width;
    const targetHeight = needsResize
        ? Math.round(img.height * (MAX_WIDTH / img.width))
        : img.height;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Keep PNG lossless if it was PNG (e.g. logos/graphics with
    // transparency); otherwise export as high-quality JPEG.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/png" ? undefined : JPEG_QUALITY;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, outputType, quality));

    // Safety net: if for some reason the "optimized" version ended up
    // bigger or failed, just fall back to the original file.
    if (!blob || blob.size >= file.size) {
        return file;
    }

    return blob;
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// ================= LOAD ON START =================
document.addEventListener("DOMContentLoaded", () => loadSliders(true)); // Admin panel