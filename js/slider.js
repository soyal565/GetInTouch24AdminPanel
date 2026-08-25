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

// ================= UPLOAD (AUTO-SHRINK UNTIL SERVER ACCEPTS) =================
function openFilePicker() {
    document.getElementById("imageInput").click();
}

document.getElementById("imageInput").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    console.log("Selected file:", file.name, file.type, (file.size / 1024 / 1024).toFixed(2) + " MB");

    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("❌ Please login first");
        this.value = "";
        return;
    }

    try {
        const result = await uploadWithAutoShrink(file, token);

        if (result.ok) {
            loadSliders(true);
        } else if (result.sizeLimitExhausted) {
            alert(
                "❌ This image is too large for the server to accept, even after " +
                "compressing it multiple times. Please try a smaller image " +
                "(roughly under 1 MB), or ask whoever manages the backend to " +
                "raise the upload size limit."
            );
        } else if (result.status === 415) {
            alert("❌ Upload failed: this file type isn't accepted by the server.");
        } else if (result.status === 401 || result.status === 403) {
            alert("❌ Not authorized. Please login again.");
        } else {
            alert("❌ Upload failed: " + (result.data?.message || result.raw || `Server error (${result.status})`));
        }

    } catch (err) {
        // Network failure, CORS block, etc.
        console.error("Upload Error:", err);
        alert("❌ Upload failed: could not reach the server. Check your connection and try again.");
    }

    // allow re-selecting the same file again later
    this.value = "";
});

// We don't know the backend's exact max-upload-size (no access to that
// config), so instead of guessing a number, we just try the ORIGINAL
// file first (best possible quality) and only shrink it — a little bit
// at a time — if the server specifically rejects it for being too big.
// Each attempt is generated fresh from the original file (never from an
// already-shrunk copy), so quality never compounds/degrades more than
// necessary for that one attempt.
async function uploadWithAutoShrink(file, token) {

    // Attempt 0: the original file, completely untouched.
    let result = await tryUploadBlob(file, file.name, token);

    if (result.ok || !isSizeLimitError(result.status, result.raw)) {
        return result; // either it worked, or it failed for an unrelated reason
    }

    console.log(`Original file (${(file.size / 1024 / 1024).toFixed(2)}MB) was rejected as too large. Shrinking...`);

    // Progressively smaller / more compressed attempts. The last two
    // force a conversion to JPEG (dropping transparency) because PNG's
    // lossless compression often can't shrink enough on its own.
    const attempts = [
        { maxWidth: 1600, quality: 0.9,  forceJpeg: false },
        { maxWidth: 1200, quality: 0.85, forceJpeg: false },
        { maxWidth: 1000, quality: 0.8,  forceJpeg: true  },
        { maxWidth: 800,  quality: 0.7,  forceJpeg: true  },
    ];

    for (const cfg of attempts) {

        const blob = await shrinkImage(file, cfg.maxWidth, cfg.quality, cfg.forceJpeg);
        if (!blob) continue;

        let name = file.name;
        if (cfg.forceJpeg) {
            name = name.replace(/\.[^/.]+$/, "") + ".jpg";
        }

        console.log(`Retrying at max ${cfg.maxWidth}px, quality ${cfg.quality} -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

        result = await tryUploadBlob(blob, name, token);

        if (result.ok) return result;
        if (!isSizeLimitError(result.status, result.raw)) return result; // different failure, stop retrying
    }

    return { ok: false, sizeLimitExhausted: true };
}

// Performs one upload attempt and returns a normalized result object.
async function tryUploadBlob(blob, filename, token) {
    const formData = new FormData();
    formData.append("file", blob, filename);

    const res = await fetch(CONFIG.BASE_URL + "/api/public/sliders", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: formData
    });

    // Read as raw text first — if the backend returns an error page
    // (e.g. a 413 HTML page instead of JSON), res.json() would throw
    // and swallow the real reason. This way we always see what came back.
    const raw = await res.text();
    console.log("UPLOAD STATUS:", res.status);
    console.log("UPLOAD RAW RESPONSE:", raw);

    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch (e) { /* response wasn't JSON, `raw` still has the message */ }

    return { ok: res.ok, status: res.status, raw, data };
}

// Detects a "too large" rejection regardless of how the backend reports
// it — some return 413, others return 500/400 with a message like
// "Maximum upload size exceeded" (Spring's default wording).
function isSizeLimitError(status, raw) {
    if (status === 413) return true;
    if (!raw) return false;
    const lower = raw.toLowerCase();
    return (
        lower.includes("maximum upload size") ||
        lower.includes("maxuploadsizeexceeded") ||
        lower.includes("file too large") ||
        lower.includes("file size exceeds")
    );
}

// ================= IMAGE SHRINKING =================
// Redraws the image at a smaller width (never upscales) and re-encodes
// it. If forceJpeg is true, transparency is flattened onto a white
// background first (JPEG has no alpha channel).
async function shrinkImage(file, maxWidth, quality, forceJpeg) {
    try {
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);

        const targetWidth = Math.min(maxWidth, img.width); // never upscale
        const scale = targetWidth / img.width;
        const targetHeight = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (forceJpeg) {
            // Flatten transparency onto white so it doesn't turn black in JPEG
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputType = forceJpeg
            ? "image/jpeg"
            : (file.type === "image/png" ? "image/png" : "image/jpeg");
        const q = outputType === "image/png" ? undefined : quality;

        return await new Promise(resolve => canvas.toBlob(resolve, outputType, q));

    } catch (err) {
        console.error("Shrink attempt failed:", err);
        return null;
    }
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