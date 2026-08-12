document.getElementById("adminLoginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {

        const response = await fetch(CONFIG.BASE_URL + "/auth/login/admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {

            // ✅ SAVE TOKEN + EMAIL + ROLE
            localStorage.setItem("adminToken", data.accessToken);
            localStorage.setItem("adminEmail", data.email || email);
            localStorage.setItem("adminRole", data.role);

            window.location.href = "dashboard.html";

        } else {
            alert(data.message || "Invalid email or password");
        }

    } catch (error) {
        console.error("Login Error:", error);
        alert("Server error. Please try again later.");
    }
});

document.getElementById("togglePassword").addEventListener("click", function () {

    const passwordInput = document.getElementById("password");
    const icon = document.getElementById("toggleIcon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }

});