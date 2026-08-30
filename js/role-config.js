// ================= SUPER ADMIN CONFIG =================

// Here is the trusted admin emails 
const SUPER_ADMIN_EMAILS = [
    "srajendra790@gmail.com", "shahsoyal37@gmail.com"
    // we can add more admin emails here
];

function getCurrentAdminEmail() {
    return localStorage.getItem("adminEmail");
}

function isSuperAdmin() {
    const email = getCurrentAdminEmail();
    return SUPER_ADMIN_EMAILS.includes(email);
}

// Add the file names here , which can be acccessible by only SUPER_ADMIN
const RESTRICTED_PAGES = [
    "marquee.html","message.html","notes.html", "slider.html","user.html"
    
];