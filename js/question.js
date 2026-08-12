// ================= PAGE LOAD =================

// EDIT GLOBAL STORAGE

let currentEditOptions = [];
let currentEditCorrect = [];
let currentEditChapterId = null;
let currentQuestions = [];

// Tracks which list is currently being shown when no chapter filter is
// active: "active" or "inactive"
let currentFilter = "active";

// Backend kabhi 'img' field bhejta hai, kabhi 'isImg' — dono handle karo
function optIsImage(opt) {
    if (opt.img === true || opt.isImg === true) return true;
    if (opt.img === false || opt.isImg === false) return false;
    // Fallback for old/ambiguous entries — check whichever field looks like an image URL
    return looksLikeImageUrl(opt.url) || looksLikeImageUrl(opt.textOrUrl);
}

// NEW: gives the actual image URL, handles both new (opt.url) and old (opt.textOrUrl) formats
function getOptionImageUrl(opt) {
    return opt.url || opt.textOrUrl || "";
}

// URL image jaisa dikhta hai ya nahi — extension ya storage domain se check
function looksLikeImageUrl(str) {
    if (!str || typeof str !== "string") return false;
    if (!/^https?:\/\//i.test(str)) return false;
    if (/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(str)) return true;
    if (/r2\.dev|cloudinary|imgur|amazonaws|storage\.googleapis/i.test(str)) return true;
    return false;
}

// 'active' field ab backend se seedha aata hai GET response mein.
// Fallback tracking bas safety ke liye rakha hai (agar kabhi field missing aaye).
const localActiveStatus = {};

function getQuestionActiveStatus(q) {
    if (typeof q.active === "boolean") return q.active;
    if (localActiveStatus.hasOwnProperty(q.id)) return localActiveStatus[q.id];
    return true; // default: naya/unknown question ko Active maan lo
}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCourses();
        loadActiveQuestions();

        // Default options

        addOptionField();
        addOptionField();
        // Paper Change
        document
            .getElementById(
                "paperDropdown"
            )
            .addEventListener(
                "change",
                function () {

                    loadChapters(
                        this.value
                    );

                }
            );

        // Chapter Change
        document
            .getElementById(
                "chapterDropdown"
            )
            .addEventListener(
                "change",
                function () {

                    loadQuestionsByChapter(
                        this.value
                    );

                }
            );

        // ================= SEARCH =================
        document
            .getElementById("searchQuestionInput")
            .addEventListener(
                "input",
                applyQuestionSearch
            );


        // ================= MODAL FOCUS FIX =================

        const editModal =
            document.getElementById(
                "editQuestionModal"
            );

        editModal.addEventListener(
            "hidden.bs.modal",
            () => {

                document.activeElement.blur();

            }
        );


        const viewModal =
            document.getElementById(
                "viewQuestionModal"
            );

        viewModal.addEventListener(
            "hidden.bs.modal",
            () => {

                document.activeElement.blur();

            }
        );
        document
            .getElementById("questionMode")
            .addEventListener(
                "change",
                toggleQuestionMode
            );

        document
            .getElementById("editQuestionMode")
            .addEventListener(
                "change",
                toggleEditQuestionMode
            );

        document.addEventListener(
            "change",
            function (e) {

                if (
                    e.target.classList.contains(
                        "option-type"
                    )
                ) {

                    const row =
                        e.target.closest(
                            ".option-row"
                        );

                    row.querySelector(
                        ".option-text"
                    ).style.display =
                        e.target.value === "text"
                            ? "block"
                            : "none";

                    row.querySelector(
                        ".option-image"
                    ).style.display =
                        e.target.value === "image"
                            ? "block"
                            : "none";

                    row.querySelector(
                        ".option-caption"
                    ).style.display =
                        e.target.value === "image"
                            ? "block"
                            : "none";

                    const previewBoxOnToggle =
                        row.querySelector(
                            ".option-preview-box"
                        );

                    if (e.target.value === "image") {
                        previewBoxOnToggle.style.display = "flex";
                        if (!previewBoxOnToggle.innerHTML.trim()) {
                            previewBoxOnToggle.innerHTML =
                                `<span class="placeholder-text">Image preview will apperar here</span>`;
                        }
                    } else {
                        previewBoxOnToggle.style.display = "none";
                    }

                    updateCorrectDropdown();

                }

                // Option image preview (create form)
                if (
                    e.target.classList.contains(
                        "option-image"
                    )
                ) {

                    const row =
                        e.target.closest(
                            ".option-row"
                        );

                    const previewBox =
                        row.querySelector(
                            ".option-preview-box"
                        );

                    const file = e.target.files[0];

                    if (file) {
                        const url = URL.createObjectURL(file);
                        previewBox.innerHTML = `<img src="${url}">`;
                    }

                }

                // Option image preview (edit form)
                if (
                    e.target.classList.contains(
                        "edit-option-image"
                    )
                ) {

                    const wrapper =
                        e.target.closest(
                            ".edit-option-image-wrapper"
                        );

                    const previewBox =
                        wrapper.querySelector(
                            ".option-preview-box"
                        );

                    const file = e.target.files[0];

                    if (file) {
                        const url = URL.createObjectURL(file);
                        previewBox.innerHTML = `<img src="${url}">`;
                    }

                }

            }
        );

    }

);



// ================= IMAGE PREVIEW (shared, for question thumbnail) =================

function previewImage(inputId, boxId) {

    const file =
        document.getElementById(inputId).files[0];

    const box =
        document.getElementById(boxId);

    if (!file) {
        box.innerHTML = `<span class="placeholder-text">No image</span>`;
        return;
    }

    const url = URL.createObjectURL(file);

    box.innerHTML = `<img src="${url}">`;

}

// ================= SEARCH (client-side over currently loaded list) =================

function applyQuestionSearch() {

    const keyword =
        document.getElementById("searchQuestionInput")
            .value
            .trim()
            .toLowerCase();

    const source = window.currentQuestions || [];

    if (!keyword) {
        renderQuestions(source);
        return;
    }

    const filtered = source.filter(q => {
        const questionText = (q.question || "").toLowerCase();
        const chapterName = (q.chapterName || "").toLowerCase();
        return questionText.includes(keyword) || chapterName.includes(keyword);
    });

    renderQuestions(filtered);
}

function clearQuestionSearch() {
    const input = document.getElementById("searchQuestionInput");
    if (input) input.value = "";
}



// ================= OPTIONS =================

// HANDLE TYPE CHANGE

function handleTypeChange() {

    updateCorrectDropdown();

}

// ADD OPTION

function addOptionField() {

    const container =
        document.getElementById(
            "optionsContainer"
        );

    const index =
        container.children.length;

    const div =
        document.createElement("div");

    div.className =
        "option-row border p-2 mb-2";

    div.innerHTML = `

<select class="form-control option-type mb-2">

    <option value="text">
        Text Option
    </option>

    <option value="image">
        Image Option
    </option>

</select>

<input
    type="text"
    class="form-control option-text"
    placeholder="Option ${index + 1}">

<input
    type="file"
    class="form-control option-image mt-2"
    accept="image/*"
    style="display:none">

<div class="option-preview-box" style="display:none;"></div>

<input
    type="text"
    class="form-control option-caption mt-2"
    placeholder="Image description (optional)"
    style="display:none">

<button
    class="btn btn-danger btn-sm mt-2"
    onclick="removeOption(this)">
    Delete
</button>

`;

    container.appendChild(div);

    updateCorrectDropdown();
}



// REMOVE OPTION

function removeOption(btn) {

    btn.parentElement.remove();

    updateCorrectDropdown();

}



// UPDATE CORRECT DROPDOWN

function updateCorrectDropdown() {

    const options =
        document.querySelectorAll(
            ".option-row"
        );

    const container =
        document.getElementById(
            "correctAnswer"
        );

    const type =
        document.getElementById(
            "questionType"
        ).value;

    container.innerHTML = "";

    options.forEach((row, index) => {

        const optionType =
            row.querySelector(
                ".option-type"
            ).value;

        const labelText =
            optionType === "image"
                ? `Option ${index + 1} (Image)`
                : `Option ${index + 1} (Text)`;

        if (type === "SINGLE") {

            container.innerHTML += `

<label>

<input type="radio"
name="correctOption"
value="${index}">

${labelText}

</label><br>

`;

        }

        else {

            container.innerHTML += `

<label>

<input type="checkbox"
class="correct-checkbox"
value="${index}">

${labelText}

</label><br>

`;

        }

    });

}

// ================= EDIT TYPE CHANGE =================

function handleEditTypeChange() {

    updateEditCorrectDropdown(
        currentEditOptions,
        currentEditCorrect
    );

}

function updateEditCorrectDropdown(
    options,
    correctIndexes = []
) {

    const container =
        document.getElementById(
            "editCorrectAnswer"
        );

    const type =
        document.getElementById(
            "editQuestionType"
        ).value;

    container.innerHTML = "";

    options.forEach((opt, index) => {

        if (type === "SINGLE") {

            container.innerHTML += `

<label>

<input type="radio"
name="editCorrectOption"
value="${index}"
${correctIndexes.includes(index) ? "checked" : ""}>

Option ${index + 1}

</label><br>

`;

        }

        else {

            container.innerHTML += `

<label>

<input type="checkbox"
class="edit-correct-checkbox"
value="${index}"
${correctIndexes.includes(index) ? "checked" : ""}>

Option ${index + 1}

</label><br>

`;

        }

    });

}

// ================= LOAD COURSES =================

async function loadCourses() {

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/courses",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const data =
            await res.json();

        const courses =
            Array.isArray(data)
                ? data
                : data.data || [];

        const dropdown =
            document.getElementById(
                "courseDropdown"
            );

        dropdown.innerHTML =
            '<option value="">Select Course</option>';

        courses.forEach(course => {

            dropdown.innerHTML += `

<option value="${course.id}">
${course.name}
</option>

`;

        });
        dropdown.addEventListener(
            "change",
            function () {

                loadPapers(
                    this.value
                );

            }
        );

    }

    catch (err) {

        console.error(err);

    }

}



// ================= LOAD ACTIVE QUESTIONS =================

async function loadActiveQuestions() {

    currentFilter = "active";
    setFilterButtonState();
    document.getElementById("chapterDropdown").value = "";
    clearQuestionSearch();

    try {
        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/active",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const raw = await res.text();
        console.log("ACTIVE raw response:", raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Response JSON nahi hai:", raw);
            alert("An invalid response came from the backend.");
            return;
        }

        // Har possible shape handle karo
        const questions =
            Array.isArray(data) ? data :
                Array.isArray(data.data) ? data.data :
                    Array.isArray(data.questions) ? data.questions :
                        Array.isArray(data.result) ? data.result :
                            [];

        console.log("Parsed active questions:", questions);

        window.currentQuestions = questions;
        renderQuestions(questions);

    } catch (err) {
        console.error("loadActiveQuestions error:", err);
        alert("Failed to load active list.");
    }
}


// ================= LOAD INACTIVE QUESTIONS =================

async function loadInactiveQuestions() {

    currentFilter = "inactive";
    setFilterButtonState();
    document.getElementById("chapterDropdown").value = "";
    clearQuestionSearch();

    try {
        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/inactive",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const raw = await res.text();
        console.log("INACTIVE raw response:", raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Response JSON nahi hai:", raw);
            alert("Invalid response came from the backend.");
            return;
        }

        // Har possible shape handle karo
        const questions =
            Array.isArray(data) ? data :
                Array.isArray(data.data) ? data.data :
                    Array.isArray(data.questions) ? data.questions :
                        Array.isArray(data.result) ? data.result :
                            [];

        console.log("Parsed inactive questions:", questions);

        window.currentQuestions = questions;
        renderQuestions(questions);

    } catch (err) {
        console.error("loadInactiveQuestions error:", err);
        alert("Failed to load inactive list.");
    }
}


// ================= FILTER BUTTON STATE =================

function setFilterButtonState() {

    const activeBtn = document.getElementById("btnActiveFilter");
    const inactiveBtn = document.getElementById("btnInactiveFilter");

    if (currentFilter === "active") {

        activeBtn.classList.remove("btn-outline-success");
        activeBtn.classList.add("btn-success");

        inactiveBtn.classList.remove("btn-danger");
        inactiveBtn.classList.add("btn-outline-danger");

    } else {

        inactiveBtn.classList.remove("btn-outline-danger");
        inactiveBtn.classList.add("btn-danger");

        activeBtn.classList.remove("btn-success");
        activeBtn.classList.add("btn-outline-success");

    }
}


// ================= REFRESH (respects chapter filter or active/inactive filter) =================

function refreshQuestions() {

    const chapterId =
        document.getElementById("chapterDropdown").value;

    if (chapterId) {
        loadQuestionsByChapter(chapterId);
    } else if (currentFilter === "inactive") {
        loadInactiveQuestions();
    } else {
        loadActiveQuestions();
    }

}



// ================= RENDER QUESTIONS (shared) =================

function renderQuestions(questions) {

    const tbody =
        document.getElementById(
            "questionTableBody"
        );

    tbody.innerHTML = "";

    if (!questions || questions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No questions found</td></tr>`;
        return;
    }

    questions.forEach((q, index) => {

        const isActive = getQuestionActiveStatus(q);

        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        const activateBtn = !isActive
            ? `<button class="btn btn-success btn-sm me-1" onclick="activateQuestion(${q.id})">Activate</button>`
            : `<button class="btn btn-secondary btn-sm me-1" onclick="deactivateQuestion(${q.id})">Deactivate</button>`;

        tbody.innerHTML += `

<tr>

<td>${index + 1}</td>

<td>${q.id}</td>

<td>
${q.imageQuestion
                ? "🖼️ " + (q.question || "Image Question")
                : q.question}
</td>

<td>${q.chapterName}</td>

<td>${q.difficulty}</td>

<td>${statusBadge}</td>

<td>
<div class="d-flex flex-wrap gap-1">

<button
class="btn btn-info btn-sm"
onclick='viewQuestion(${JSON.stringify(q)})'>

View

</button>

<button
class="btn btn-warning btn-sm"
onclick='openEditModal(${JSON.stringify(q)})'>

Edit

</button>

<button
class="btn btn-danger btn-sm"
onclick="deleteQuestion(${q.id})">

Delete

</button>

${activateBtn}

</div>
</td>

</tr>

`;

    });

}



// ================= CREATE =================

async function createQuestion() {

    let question = "";
    let imageQuestion = false;
    let imageUrl = "";

    const questionMode =
        document.getElementById(
            "questionMode"
        ).value;

    if (questionMode === "image") {

        imageQuestion = true;
        question =
            document.getElementById(
                "imageQuestionTitle"
            ).value.trim();

        if (!question) {

            alert(
                "Question Title is required for image questions."
            );

            return;

        }

        const file =
            document.getElementById(
                "questionImage"
            ).files[0];


        if (!file) {

            alert(
                "Select question image"
            );

            return;
        }

        imageUrl =
            await uploadQuestionImage(
                file
            );

    }
    else {

        question =
            document.getElementById(
                "questionText"
            ).value.trim();

    }

    const chapterId =
        document.getElementById(
            "chapterDropdown"
        ).value;

    if (!chapterId) {

        alert(
            "Please select chapter"
        );

        return;

    }

    const explanation =
        document.getElementById(
            "explanation"
        ).value;

    const difficulty =
        document.getElementById(
            "difficulty"
        ).value;

    const marks =
        document.getElementById(
            "marks"
        ).value;


    let options = [];

    const rows =
        document.querySelectorAll(
            ".option-row"
        );

    for (const row of rows) {

        const type =
            row.querySelector(
                ".option-type"
            ).value;

        if (type === "text") {

            options.push({

                textOrUrl:
                    row.querySelector(
                        ".option-text"
                    ).value.trim(),

                url: null,

                img: false   // ✅ isImg ki jagah img

            });

        }
        else {

            const file =
                row.querySelector(
                    ".option-image"
                ).files[0];

            const uploadedUrl =
                await uploadQuestionImage(
                    file
                );

            const caption =
                row.querySelector(
                    ".option-caption"
                ).value.trim();

            options.push({

                textOrUrl: caption,

                url: uploadedUrl,

                img: true   // ✅ isImg ki jagah img

            });

        }

    }



    if (options.length < 2) {

        alert(
            "Minimum 2 options required"
        );

        return;

    }



    const type =
        document.getElementById(
            "questionType"
        ).value;

    let correctIndexes = [];

    if (type === "SINGLE") {

        const selected =
            document.querySelector(
                "input[name='correctOption']:checked"
            );

        if (!selected) {

            alert(
                "Select correct answer"
            );
            return;

        }

        correctIndexes.push(
            Number(selected.value)
        );

    }

    else {

        const checkboxes =
            document.querySelectorAll(
                ".correct-checkbox:checked"
            );

        if (checkboxes.length === 0) {

            alert(
                "Select at least one correct answer"
            );
            return;

        }

        checkboxes.forEach(cb => {

            correctIndexes.push(
                Number(cb.value)
            );

        });

    }



    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const payload = {

            question: question,

            options: options,

            correct: correctIndexes,

            imageQuestion: imageQuestion,

            imageUrl: imageUrl,

            explanation: explanation,

            chapterId: Number(chapterId),

            type: type,

            difficulty: difficulty,

            marks: Number(marks),

            active: true

        };

        console.log(
            "PAYLOAD =>",
            JSON.stringify(payload, null, 2)
        );
        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/questions",
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token

                },

                body: JSON.stringify(payload)

            }
        );
        const responseText =
            await res.text();

        console.log(
            "Create Response:",
            responseText
        );

        if (!res.ok) {

            alert(responseText);

            return;

        }

        if (res.ok) {
            alert("Question added successfully !!")
            resetQuestionForm();

            loadQuestionsByChapter(
                chapterId
            );

        }

    }

    catch (err) {

        console.error(err);

    }

}



// ================= DELETE (HARD) =================

async function deleteQuestion(id) {

    if (!confirm(
        "This question will be deleted permanently, are you sure that you want to delete?"
    ))
        return;

    const token =
        localStorage.getItem(
            "adminToken"
        );

    try {

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/questions/" +
            id,
            {
                method: "DELETE",

                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        if (res.ok) {
            alert("Question deleted successfully.");
            refreshQuestions();
        } else {
            alert("An error occured while deleting the question");
        }

    } catch (err) {
        console.error("Delete error:", err);
    }

}



// ================= ACTIVATE / DEACTIVATE =================

async function activateQuestion(id) {

    const token =
        localStorage.getItem("adminToken");

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/" + id + "/activate",
            {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            }
        );

        if (res.ok) {
            alert("Question is activated ");
            localActiveStatus[id] = true;
        } else {
            const text = await res.text().catch(() => "");
            alert("An error occured during activation — " + text);
        }

    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server.");
    }

    refreshQuestions();

}

async function deactivateQuestion(id) {

    const token =
        localStorage.getItem("adminToken");

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/" + id + "/deactivate",
            {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            }
        );

        if (res.ok) {
            alert("Question is deactivated !");
            localActiveStatus[id] = false;
        } else {
            const text = await res.text().catch(() => "");
            alert("An error occured during deactivation — " + text);
        }

    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Failed to connect with server");
    }

    refreshQuestions();

}



// ================= EDIT MODAL =================

function openEditModal(q) {
    console.log("EDIT DATA", q);

    console.log(q);
    currentEditChapterId =
        q.chapterId;
    console.log("OPTIONS =>", q.options);

    console.log(
        "Current Chapter:",
        currentEditChapterId
    );
    document.getElementById(
        "editQuestionId"
    ).value = q.id;

    if (q.imageQuestion) {

        document.getElementById(
            "editQuestionMode"
        ).value = "image";

        document.getElementById(
            "editTextQuestionWrapper"
        ).style.display = "none";

        document.getElementById(
            "editImageQuestionWrapper"
        ).style.display = "block";

        document.getElementById(
            "editImageQuestionTitle"
        ).value = q.question || "";

        const previewBox =
            document.getElementById(
                "editQuestionPreviewBox"
            );

        if (q.imageUrl) {
            previewBox.innerHTML = `<img src="${q.imageUrl}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-text\\'>Image load nahi hui</span>'">`;
        } else {
            previewBox.innerHTML = `<span class="placeholder-text">No image</span>`;
        }

        // Clear previous file selection
        document.getElementById("editQuestionImage").value = "";

    }
    else {

        document.getElementById(
            "editQuestionMode"
        ).value = "text";

        document.getElementById(
            "editTextQuestionWrapper"
        ).style.display = "block";

        document.getElementById(
            "editImageQuestionWrapper"
        ).style.display = "none";

        document.getElementById(
            "editQuestionText"
        ).value = q.question;

    }

    document.getElementById(
        "editExplanation"
    ).value = q.explanation;

    document.getElementById(
        "editDifficulty"
    ).value = q.difficulty;

    document.getElementById(
        "editMarks"
    ).value = q.marks;
    document.getElementById("editActiveStatus").checked =
        getQuestionActiveStatus(q);

    const container =
        document.getElementById(
            "editOptionsContainer"
        );

    container.innerHTML = "";

    q.options.forEach((opt, index) => {

        if (optIsImage(opt)) {

            container.innerHTML += `

<div class="border rounded p-2 mb-2 edit-option-image-wrapper">

    <label class="form-label">Option ${index + 1} (Image)</label>

    <div class="option-preview-box">
        <img
            src="${getOptionImageUrl(opt)}"
            onerror="this.parentElement.innerHTML='<span class=&quot;placeholder-text&quot;>Image didn't get load</span>'">
    </div>

    <input
        type="file"
        class="form-control edit-option-image mt-2"
        data-index="${index}"
        accept="image/*">

    <div class="form-text">Select new image for changing the previous one</div>

    <label class="form-label mt-2">Image Description</label>

    <input
        type="text"
        class="form-control edit-option-caption mt-1"
        value="${opt.textOrUrl || ""}"
        placeholder="Image description (optional)">

</div>

`;

        }
        else {

            container.innerHTML += `

<div class="mb-2">

    <label class="form-label">Option ${index + 1} (Text)</label>

    <input
        type="text"
        class="form-control edit-option-input"
        value="${opt.textOrUrl}">

</div>

`;

        }

    });

    currentEditOptions =
        q.options;

    currentEditCorrect =
        q.correct;

    document.getElementById(
        "editQuestionType"
    ).value = q.type;

    updateEditCorrectDropdown(
        q.options,
        q.correct
    );

    new bootstrap.Modal(
        document.getElementById(
            "editQuestionModal"
        )
    ).show();

}



// ================= UPDATE =================

async function updateQuestion() {

    const id =
        document.getElementById(
            "editQuestionId"
        ).value;

    let question = "";
    let imageQuestion = false;
    let imageUrl = "";

    const mode =
        document.getElementById(
            "editQuestionMode"
        ).value;


    let options = [];

    const textInputs =
        document.querySelectorAll(
            ".edit-option-input"
        );

    const imageInputs =
        document.querySelectorAll(
            ".edit-option-image"
        );

    const captionInputs =
        document.querySelectorAll(
            ".edit-option-caption"
        );

    let textIndex = 0;
    let imageIndex = 0;

    for (const oldOption of currentEditOptions) {

        if (optIsImage(oldOption)) {

            const imageInput =
                imageInputs[imageIndex];

            const captionInput =
                captionInputs[imageIndex];

            imageIndex++;

            const caption =
                captionInput
                    ? captionInput.value.trim()
                    : (oldOption.textOrUrl || "");

            if (
                imageInput &&
                imageInput.files &&
                imageInput.files[0]
            ) {

                const newUrl =
                    await uploadQuestionImage(
                        imageInput.files[0]
                    );

                options.push({

                    textOrUrl: caption,

                    url: newUrl,

                    img: true

                });

            }
            else {

                options.push({

                    textOrUrl: caption,

                    url: getOptionImageUrl(oldOption),

                    img: true

                });

            }

        }
        else {

            const textInput =
                textInputs[textIndex++];

            options.push({

                textOrUrl:
                    textInput.value.trim(),

                url: null,

                img: false

            });

        }

    }

    if (mode === "image") {

        imageQuestion = true;

        question =
            document.getElementById(
                "editImageQuestionTitle"
            ).value.trim();

        const newImage =
            document.getElementById(
                "editQuestionImage"
            ).files[0];

        if (newImage) {

            imageUrl =
                await uploadQuestionImage(
                    newImage
                );

        }
        else {

            // Purana image rakho (preview box ki img se URL lo)
            const previewImg =
                document.querySelector(
                    "#editQuestionPreviewBox img"
                );

            imageUrl =
                previewImg ? previewImg.src : "";

        }

    }
    else {

        question =
            document.getElementById(
                "editQuestionText"
            ).value.trim();

    }



    const type =
        document.getElementById(
            "editQuestionType"
        ).value;

    let correctIndexes = [];

    if (type === "SINGLE") {

        const selected =
            document.querySelector(
                "input[name='editCorrectOption']:checked"
            );

        if (!selected) {

            alert(
                "Select correct answer"
            );

            return;

        }

        correctIndexes.push(
            Number(selected.value)
        );

    }

    else {

        const checkboxes =
            document.querySelectorAll(
                ".edit-correct-checkbox:checked"
            );

        if (checkboxes.length === 0) {

            alert(
                "Select at least one correct answer"
            );

            return;

        }

        checkboxes.forEach(cb => {

            correctIndexes.push(
                Number(cb.value)
            );

        });

    }


    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const payload = {
            question: question,
            options: options,
            imageQuestion: imageQuestion,
            imageUrl: imageUrl,
            correct: correctIndexes,
            explanation: document.getElementById("editExplanation").value,
            chapterId:
                Number(
                    currentEditChapterId
                ),
            type: type,
            active: document.getElementById("editActiveStatus").checked,
            difficulty: document.getElementById("editDifficulty").value,
            marks: Number(
                document.getElementById("editMarks").value
            )
        };

        console.log("UPDATE PAYLOAD =>", payload);

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/questions/" +
            id,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(payload)
            }
        );

        const responseText = await res.text();

        console.log("Status:", res.status);
        console.log("Response:", responseText);

        if (!res.ok) {
            alert(responseText);
            return;
        }

        const updatedData = JSON.parse(responseText);
        localActiveStatus[updatedData.id] = updatedData.active;

        refreshQuestions();

        const modalEl =
            document.getElementById(
                "editQuestionModal"
            );

        document.activeElement.blur();

        bootstrap.Modal
            .getInstance(modalEl)
            .hide();

        alert("Question updated successfully!");

    }

    catch (err) {

        console.error(err);

    }

}

function viewQuestion(q) {

    let optionsHTML = "";

    q.options.forEach(
        (opt, index) => {

            let optionContent;

            if (optIsImage(opt)) {

                const imgUrl = getOptionImageUrl(opt);

                const captionHTML =
                    opt.textOrUrl
                        ? `<div><small class="text-muted">${opt.textOrUrl}</small></div>`
                        : "";

                optionContent = `
<img src="${imgUrl}"
     class="img-thumbnail"
     style="max-height:120px;"
     onerror="this.style.display='none'">
${captionHTML}
`;

            }
            else {

                optionContent = opt.textOrUrl;

            }

            optionsHTML += `
<li>
${optionContent}
${q.correct.includes(index)
                    ? "<b>(Correct)</b>"
                    : ""}
</li>
`;

        }
    );

    const statusText = getQuestionActiveStatus(q) ? "Active" : "Inactive";

    document.getElementById(
        "viewQuestionBody"
    ).innerHTML = `

${q.imageQuestion
            ? `
    <p><b>Question Title:</b> ${q.question}</p>

    <img
        src="${q.imageUrl}"
        class="img-thumbnail mb-3"
        style="max-height:250px;"
        onerror="this.style.display='none'">
    `
            : `
    <p><b>Question:</b> ${q.question}</p>
    `
        }

<p><b>Chapter:</b> ${q.chapterName}</p>

<p><b>Type:</b> ${q.type}</p>

<p><b>Difficulty:</b> ${q.difficulty}</p>

<p><b>Marks:</b> ${q.marks}</p>

<p><b>Status:</b> ${statusText}</p>

<p><b>Explanation:</b>
${q.explanation || "-"}
</p>

<hr>

<ul>
${optionsHTML}
</ul>

`;

    new bootstrap.Modal(
        document.getElementById(
            "viewQuestionModal"
        )
    ).show();

}

function resetQuestionForm() {

    // FORM RESET
    document
        .getElementById("questionForm")
        .reset();

    // REMOVE OLD OPTIONS
    document
        .getElementById("optionsContainer")
        .innerHTML = "";

    // REMOVE OLD CORRECT ANSWERS
    document
        .getElementById("correctAnswer")
        .innerHTML = "";

    // RESET PREVIEWS
    document.getElementById("questionPreviewBox").innerHTML =
        `<span class="placeholder-text">Image preview yahan dikhega</span>`;

    document.getElementById("questionTextWrapper").style.display = "block";
    document.getElementById("questionImageWrapper").style.display = "none";
    document.getElementById("questionMode").value = "text";

    // ADD DEFAULT 2 OPTIONS AGAIN
    addOptionField();
    addOptionField();

}

async function loadPapers(courseId) {

    if (!courseId) return;

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/papers/course/" +
            courseId,
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const papers =
            await res.json();

        const dropdown =
            document.getElementById(
                "paperDropdown"
            );

        dropdown.innerHTML =
            '<option value="">Select Paper</option>';

        papers.forEach(paper => {

            dropdown.innerHTML += `
                <option value="${paper.id}">
                    ${paper.name}
                </option>
            `;

        });

    }

    catch (err) {

        console.error(err);

    }

}

async function loadChapters(paperId) {

    if (!paperId) return;

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/chapters/paper/" +
            paperId,
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const chapters =
            await res.json();

        const dropdown =
            document.getElementById(
                "chapterDropdown"
            );

        dropdown.innerHTML =
            '<option value="">Select Chapter</option>';

        chapters.forEach(chapter => {

            dropdown.innerHTML += `
                <option value="${chapter.id}">
                    ${chapter.title}
                </option>
            `;

        });

    }

    catch (err) {

        console.error(err);

    }

}
async function loadQuestionsByChapter(
    chapterId
) {
    console.log(
        "loadQuestionsByChapter called",
        chapterId
    );

    if (!chapterId)
        return;

    clearQuestionSearch();

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res =
            await fetch(

                CONFIG.BASE_URL +
                "/api/questions/chapter/" +
                chapterId,

                {
                    headers: {
                        Authorization:
                            "Bearer " + token
                    }
                }

            );

        const questions =
            await res.json();
        console.log("RAW API RESPONSE =", questions);
        window.currentQuestions = questions;

        console.log(
            "Questions Response:",
            questions
        );

        renderQuestions(questions);

    }

    catch (err) {

        console.error(err);

    }

}

function toggleQuestionMode() {

    const mode =
        document.getElementById(
            "questionMode"
        ).value;

    document
        .getElementById(
            "questionTextWrapper"
        )
        .style.display =
        mode === "text"
            ? "block"
            : "none";

    document
        .getElementById(
            "questionImageWrapper"
        )
        .style.display =
        mode === "image"
            ? "block"
            : "none";

}

function toggleEditQuestionMode() {

    const mode =
        document.getElementById(
            "editQuestionMode"
        ).value;

    document
        .getElementById(
            "editTextQuestionWrapper"
        )
        .style.display =
        mode === "text"
            ? "block"
            : "none";

    document
        .getElementById(
            "editImageQuestionWrapper"
        )
        .style.display =
        mode === "image"
            ? "block"
            : "none";

}

async function uploadQuestionImage(file) {

    const token =
        localStorage.getItem(
            "adminToken"
        );

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    const res =
        await fetch(
            CONFIG.BASE_URL +
            "/api/questions/img",
            {
                method: "POST",
                headers: {
                    Authorization:
                        "Bearer " + token
                },
                body: formData
            }
        );

    return await res.text();
}





async function viewQuestionById(id) {

    const token =
        localStorage.getItem(
            "adminToken"
        );

    const res = await fetch(
        CONFIG.BASE_URL +
        "/api/questions/" +
        id,
        {
            headers: {
                Authorization:
                    "Bearer " + token
            }
        }
    );

    const q =
        await res.json();

    viewQuestion(q);

}

async function openEditModalById(id) {

    const token =
        localStorage.getItem(
            "adminToken"
        );

    const res = await fetch(
        CONFIG.BASE_URL +
        "/api/questions/" +
        id,
        {
            headers: {
                Authorization:
                    "Bearer " + token
            }
        }
    );

    const q =
        await res.json();

    openEditModal(q);

}