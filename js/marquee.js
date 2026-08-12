// ================= ADD FIELD =================
function addField(text = "", url = "") {

    const container =
        document.getElementById("marqueeFields");

    const div = document.createElement("div");

    div.className = "marquee-row mb-3";

    div.innerHTML = `
        <input type="text"
        class="form-control mb-2 marquee-text"
        placeholder="Enter marquee text"
        value="${text}">

        <input type="text"
        class="form-control mb-2 marquee-url"
        placeholder="Enter URL (optional)"
        value="${url}">

        <button class="btn btn-danger btn-sm"
        onclick="removeField(this)">
        Delete
        </button>
    `;

    container.appendChild(div);
}


// ================= REMOVE FIELD =================
function removeField(btn) {

    btn.parentElement.remove();

}


// ================= LOAD EXISTING =================
document.addEventListener("DOMContentLoaded", async () => {

try {

const token = localStorage.getItem("adminToken");

const res = await fetch(
CONFIG.BASE_URL + "/api/public/marquee/admin",
{
headers: {
"Authorization": "Bearer " + token
}
}
);

const data = await res.json();

document.getElementById("marqueeStatus").checked =
data.active || false;

document.getElementById("marqueeHistory").innerText =
data.text || "";


// 🔥 Split Existing Data
if (data.text) {

const items = data.text.split("||");

const container =
document.getElementById("marqueeFields");

container.innerHTML = "";

items.forEach(item => {

const parts = item.split("|");

const text =
parts[0]?.trim() || "";

const url =
parts[1]?.trim() || "";

addField(text, url);

});

}

}

catch (err) {

console.error(err);

}

});


// ================= UPDATE =================
async function updateMarquee() {

const active =
document.getElementById("marqueeStatus").checked;

const token =
localStorage.getItem("adminToken");

const textFields =
document.querySelectorAll(".marquee-text");

const urlFields =
document.querySelectorAll(".marquee-url");

let items = [];

textFields.forEach((textField, index) => {

let text =
textField.value.trim();

let url =
urlFields[index].value.trim();

if (text) {

// Auto https
if (url && !url.startsWith("http")) {

url = "https://" + url;

}

if (url) {

items.push(`${text}|${url}`);

}
else {

items.push(text);

}

}

});

if (items.length === 0) {

alert("Enter at least one marquee item");
return;

}

const finalText =
items.join(" || ");

try {

const res = await fetch(
CONFIG.BASE_URL + "/api/public/marquee/admin",
{
method: "PUT",

headers: {
"Content-Type": "application/json",
"Authorization": "Bearer " + token
},

body: JSON.stringify({
text: finalText,
active,
url: null
})
}
);

const data = await res.json();

if (res.ok) {

alert("✅ Marquee updated successfully");

document.getElementById("marqueeHistory").innerText =
finalText;

}

else {

alert("❌ " + (data.message || "Failed"));

}

}

catch (err) {

console.error(err);

}

}