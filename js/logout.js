async function logout() {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    const token = localStorage.getItem("adminToken");

    try {

        // Backend logout API call
        await fetch(CONFIG.BASE_URL + "/auth/logout", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }

        });

    } catch (error) {

        console.error("Logout API Error:", error);

    }

    // Token remove (important - always)
    localStorage.removeItem("adminToken");
    localStorage.removeItem("refreshToken");

    // Redirect to login page
    window.location.href = "index.html";

}
