document.getElementById("adminLoginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const loginBtn = e.target.querySelector('button[type="submit"]');

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Please enter both email and password");
        return;
    }

    await withLoader(async () => {

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

    }, loginBtn).catch((error) => {
        console.error("Login Error:", error);
        alert("Server error. Please try again later.");
    });

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

// ================= FORGOT PASSWORD (ADMIN) =================

function openAdminForgotPassword() {

    const email =
        document.getElementById("email").value.trim();

    if (!email) {
        alert("Please enter your admin email first");
        return;
    }

    sendAdminOtp(email);

}

async function sendAdminOtp(email) {

    try {

        await withLoader(async () => {

            const res = await fetch(
                CONFIG.BASE_URL + "/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email })
                }
            );

            const data = await res.json();

            if (res.ok) {

                alert("✅ OTP sent to your registered admin email");

                // Naya key naam rakha hai (adminResetEmail),
                // taaki user panel ke 'resetEmail' se conflict na ho
                localStorage.setItem("adminResetEmail", email);

                window.location.href = "admin-reset-password.html";

            } else {

                alert(data.message || "Failed to send OTP");

            }

        });

    } catch (err) {
        console.error("Send Admin OTP error:", err);
        alert("Server error. Please try again later.");
    }

}