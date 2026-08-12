// ================= CREATE LOADER =================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const html = `

<div id="adminLoader">

    <div class="loader-spinner"></div>

</div>

`;

        document.body.insertAdjacentHTML(
            "beforeend",
            html
        );

    }
);


// ================= SHOW =================

function showAdminLoader() {

    const loader =
        document.getElementById(
            "adminLoader"
        );

    if (loader) {

        loader.style.display =
            "flex";

        loader.style.opacity =
            "1";

    }

}


// ================= HIDE =================

function hideAdminLoader() {

    const loader =
        document.getElementById(
            "adminLoader"
        );

    if (loader) {

        loader.style.opacity =
            "0";

        setTimeout(() => {

            loader.style.display =
                "none";

        }, 300);

    }

}