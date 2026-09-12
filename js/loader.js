// ================= CREATE LOADER =================

document.addEventListener("DOMContentLoaded", () => {
    const html = `
<div id="globalLoader">
    <div class="loader-spinner"></div>
</div>
`;
    document.body.insertAdjacentHTML("beforeend", html);
    showLoader();
});

// ================= SHOW / HIDE =================

let activeRequests = 0;
let loaderShownAt = 0;

const MIN_LOADER_TIME = 400;

function showLoader() {

    activeRequests++;

    if (activeRequests === 1) {

        loaderShownAt = Date.now();

        const loader = document.getElementById("globalLoader");
        if (loader) {
            loader.style.display = "flex";
            loader.style.opacity = "1";
        }

    }

}

function hideLoader() {

    activeRequests = Math.max(0, activeRequests - 1);

    if (activeRequests === 0) {

        const elapsed = Date.now() - loaderShownAt;
        const remaining = Math.max(0, MIN_LOADER_TIME - elapsed);

        setTimeout(() => {

            if (activeRequests === 0) {

                const loader = document.getElementById("globalLoader");
                if (loader) {
                    loader.style.opacity = "0";

                    setTimeout(() => {
                        if (activeRequests === 0) {
                            loader.style.display = "none";
                        }
                    }, 300);
                }

            }

        }, remaining);

    }

}

// ================= FORCE BROWSER TO PAINT THE SPINNER =================
// Ye function browser ko ek frame ka wait force karta hai,
// taaki spinner screen par turant dikh jaaye, chahe baaki kaam kitna bhi fast ho.

function waitForPaint() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

// ================= GENERIC WRAPPER (use this everywhere) =================
// Kisi bhi async kaam ke liye use karo — button click, login, data fetch, kuch bhi.

async function withLoader(asyncFn, button = null) {

    if (button) {
        button.disabled = true;
        button.dataset.originalText = button.dataset.originalText || button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Please wait...`;
    }

    showLoader();

    // Yahan ruk kar browser ko spinner paint karne do, uske baad hi asli kaam shuru karo
    await waitForPaint();

    try {
        return await asyncFn();
    } finally {
        hideLoader();
        if (button) {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// ================= FETCH TRACKER (backup, auto-catches raw fetch calls) =================

const originalFetch = window.fetch;

window.fetch = async (...args) => {

    const isFirstRequest = activeRequests === 0;

    showLoader();

    // Sirf pehli request pe paint force karo, taaki baar-baar fetches pe delay na ho
    if (isFirstRequest) {
        await waitForPaint();
    }

    try {
        return await originalFetch(...args);
    } finally {
        hideLoader();
    }
};

// ================= INITIAL PAGE LOAD =================

window.addEventListener("load", () => {
    hideLoader();
});