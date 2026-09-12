document.getElementById("adminResetForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const email = localStorage.getItem("adminResetEmail");
    const otp = document.getElementById("otp").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const errorMsg = document.getElementById("errorMsg");
    errorMsg.innerText = "";

    if (!email) {
        alert("Session expired. Please try 'Forgot Password' again.");
        window.location.href = "AdminLogin.html";
        return;
    }

    // ✅ VALIDATION (user wale reset-password.js jaisa hi)
    if (!otp) {
        errorMsg.innerText = "Enter OTP";
        return;
    }

    if (newPassword.length < 8) {
        errorMsg.innerText = "Password must be at least 8 characters";
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMsg.innerText = "Passwords do not match";
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {

        await withLoader(async () => {

            const res = await fetch(CONFIG.BASE_URL + "/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {

                alert("✅ Password reset successful. Please login again.");

                localStorage.removeItem("adminResetEmail");

                window.location.href = "AdminLogin.html";

            } else {

                alert("❌ " + (data.message || "Invalid OTP / Expired OTP"));

            }

        }, submitBtn);

    } catch (err) {
        console.error("Admin Reset Password error:", err);
        alert("Server error ❌");
    }

});

// ================= PASSWORD SHOW/HIDE =================

function setupPasswordToggle(buttonId, inputId, iconId) {

    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (!btn || !input || !icon) return;

    btn.addEventListener("click", function () {

        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }

    });

}

setupPasswordToggle("toggleNewPassword", "newPassword", "toggleNewPasswordIcon");
setupPasswordToggle("toggleConfirmPassword", "confirmPassword", "toggleConfirmPasswordIcon");