// Tracks which list is currently being shown: "active" or "inactive"
let currentFilter = "active";

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCourses();
        loadActiveQuizzes();
        // DEFAULT SHOW
        handleQuizTypeChange();

    }
);



// ================= LOAD COURSES =================

async function loadCourses() {

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res =
            await fetch(
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

        const editDropdown =
            document.getElementById(
                "editCourseDropdown"
            );

        dropdown.innerHTML =
            '<option value="">Select Course</option>';

        editDropdown.innerHTML =
            '<option value="">Select Course</option>';

        courses.forEach(course => {

            dropdown.innerHTML += `

<option value="${course.id}">
${course.name}
</option>

`;

            editDropdown.innerHTML += `

<option value="${course.id}">
${course.name}
</option>

`;

        });

    }

    catch (err) {

        console.error(err);

    }

}



// ================= LOAD QUESTIONS =================

// ================= LOAD PAPERS =================

async function loadPapers() {

    const courseId =
        document.getElementById("courseDropdown").value;

    document.getElementById("chapterDropdown").innerHTML =
        '<option value="">Select Chapter</option>';

    document.getElementById("questionDropdown").innerHTML = "";

    const dropdown =
        document.getElementById("paperDropdown");

    dropdown.innerHTML =
        '<option value="">Select Paper</option>';

    if (!courseId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/papers/active",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        const papers =
            data.filter(p => p.courseId === Number(courseId));

        papers.forEach(paper => {

            dropdown.innerHTML += `
<option value="${paper.id}">${paper.name}</option>
`;

        });

    }
    catch (err) {
        console.error(err);
    }

}


// ================= LOAD CHAPTERS =================

async function loadChapters() {

    const paperId =
        document.getElementById("paperDropdown").value;

    document.getElementById("questionDropdown").innerHTML = "";

    const dropdown =
        document.getElementById("chapterDropdown");

    dropdown.innerHTML =
        '<option value="">Select Chapter</option>';

    if (!paperId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/chapters/active",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        const chapters =
            data.filter(c => c.paperId === Number(paperId));

        chapters.forEach(chapter => {

            dropdown.innerHTML += `
<option value="${chapter.id}">${chapter.title}</option>
`;

        });

    }
    catch (err) {
        console.error(err);
    }

}


// ================= LOAD QUESTIONS (BY CHAPTER) =================

async function loadQuestionsByChapter() {

    const chapterId =
        document.getElementById("chapterDropdown").value;

    const dropdown =
        document.getElementById("questionDropdown");

    dropdown.innerHTML = "";
    // Select All reset
    const selectAllBox = document.getElementById("selectAllQuestions");
    if (selectAllBox) selectAllBox.checked = false;

    if (!chapterId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/chapter/" + chapterId,
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        data.forEach(q => {

            dropdown.innerHTML += `

<div class="form-check">

<input
class="form-check-input"
type="checkbox"
value="${q.id}"
id="q_${q.id}">

<label
class="form-check-label"
for="q_${q.id}">

${q.question}

</label>

</div>

`;

        });

    }
    catch (err) {
        console.error(err);
    }

}


// ================= CREATE =================

async function createQuiz() {

    const questionIds =
        Array.from(
            document.querySelectorAll(
                "#questionDropdown input[type='checkbox']:checked"
            )
        ).map(cb => Number(cb.value));


    const type =
        document.getElementById(
            "quizType"
        ).value;


    const startInput =
        document.getElementById(
            "startTime"
        ).value;

    const endInput =
        document.getElementById(
            "endTime"
        ).value;


    //   VALIDATION

    if (type !== "PRACTICE") {

        if (!startInput || !endInput) {

            alert("⚠️ Please enter start and end date/time");

            return;

        }

    }


    //    SAFE TIME HANDLING

    let startTime = null;
    let endTime = null;

    if (type !== "PRACTICE") {

        startTime =
            convertToUTCZ(startInput);

        endTime =
            convertToUTCZ(endInput);

    }
    const chapterId =
        document.getElementById("chapterDropdown").value;

    if (!chapterId) {

        alert("⚠️ Please select chapter");

        return;

    }


    const body = {

        title:
            document.getElementById(
                "quizTitle"
            ).value,

        description:
            document.getElementById(
                "quizDescription"
            ).value,

        timeLimit:
            Number(
                document.getElementById(
                    "timeLimit"
                ).value
            ),

        active:
            document.getElementById(
                "quizActive"
            ).checked,

        showResult: document.getElementById("showResult").checked,

        type: type,

        chapterId:
            Number(
                document.getElementById(
                    "chapterDropdown"
                ).value
            ),

        passingMarks:
            Number(
                document.getElementById(
                    "passingMarks"
                ).value
            ),

        startTime: startTime,
        endTime: endTime,

        questionIds: questionIds

    };

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res =
            await fetch(
                CONFIG.BASE_URL +
                "/api/quizzes",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body: JSON.stringify(body)

                }
            );

        const data =
            await res.json();

        if (res.ok) {

            alert("Quiz Created Successfully ✅");

            resetQuizForm();

            refreshQuizzes();

        }
        else {

            alert(
                data.message ||
                "Failed to create quiz"
            );

        }

    }

    catch (err) {

        console.error(err);

    }

}

function resetQuizForm() {

    // FORM RESET
    document
        .getElementById("quizForm")
        .reset();

    // COURSE RESET
    document.getElementById(
        "courseDropdown"
    ).selectedIndex = 0;

    // QUESTION CHECKBOXES CLEAR
    document.getElementById(
        "questionDropdown"
    ).innerHTML = "";

    const selectAllBox = document.getElementById("selectAllQuestions");
    if (selectAllBox) selectAllBox.checked = false;

    // PAPER/CHAPTER RESET
    document.getElementById(
        "paperDropdown"
    ).innerHTML = '<option value="">Select Paper</option>';

    document.getElementById(
        "chapterDropdown"
    ).innerHTML = '<option value="">Select Chapter</option>';

    // DEFAULT VALUES
    document.getElementById(
        "timeLimit"
    ).value = 30;

    document.getElementById(
        "passingMarks"
    ).value = 1;

    document.getElementById(
        "quizActive"
    ).checked = true;

    document.getElementById(
        "showResult"
    ).checked = true;

    // DEFAULT QUIZ TYPE
    document.getElementById(
        "quizType"
    ).value = "PRACTICE";

    // START/END TIME CLEAR
    document.getElementById(
        "startTime"
    ).value = "";

    document.getElementById(
        "endTime"
    ).value = "";

    // PRACTICE TYPE UI HANDLE
    handleQuizTypeChange();

}



// ================= LOAD ACTIVE QUIZZES =================

async function loadActiveQuizzes() {

    currentFilter = "active";
    setFilterButtonState();

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(CONFIG.BASE_URL + "/api/quizzes/active", {
            headers: { "Authorization": "Bearer " + token }
        });

        const data = await res.json();

        const quizzes = Array.isArray(data) ? data : data.data || [];

        // Frontend-side safety filter: sirf active === true wale hi dikhao
        const filtered = quizzes.filter(q => q.active === true);

        renderQuizzes(filtered);

    } catch (err) {
        console.error(err);
    }
}


// ================= LOAD INACTIVE QUIZZES =================

async function loadInactiveQuizzes() {

    currentFilter = "inactive";
    setFilterButtonState();

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(CONFIG.BASE_URL + "/api/quizzes/inactive", {
            headers: { "Authorization": "Bearer " + token }
        });

        const data = await res.json();

        const quizzes = Array.isArray(data) ? data : data.data || [];

        // Frontend-side safety filter: sirf active === false wale hi dikhao
        const filtered = quizzes.filter(q => q.active === false);

        renderQuizzes(filtered);

    } catch (err) {
        console.error(err);
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


// ================= REFRESH =================

function refreshQuizzes() {

    if (currentFilter === "inactive") {
        loadInactiveQuizzes();
    } else {
        loadActiveQuizzes();
    }
}


// ================= RENDER QUIZZES =================

async function renderQuizzes(data) {

    const tbody = document.getElementById("quizTableBody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No quizzes found</td></tr>`;
        return;
    }

    const token = localStorage.getItem("adminToken");

    for (const [index, q] of data.entries()) {

        // Chapter ke total questions ki jagah is QUIZ ke actual
        // assigned questions ka count lo
        let totalQuestions = q.totalQuestions ?? q.questions?.length ?? 0;

        if (!totalQuestions && q.id) {

            try {

                const quizRes = await fetch(
                    CONFIG.BASE_URL + "/api/quizzes/" + q.id,
                    { headers: { "Authorization": "Bearer " + token } }
                );

                const quizData = await quizRes.json();
                const quizDetail = quizData.data ? quizData.data : quizData;

                totalQuestions = quizDetail.questions?.length ?? 0;

            } catch (e) {
                console.error("Quiz detail fetch error:", e);
            }

        }

        const isActive = q.active === true;


        const statusBadge = isActive
            ? `<span class="badge bg-success">Active</span>`
            : `<span class="badge bg-secondary">Inactive</span>`;

        const activateBtn = !isActive
            ? `<button class="btn btn-success btn-sm me-1" onclick="activateQuiz(${q.id})">Activate</button>`
            : `<button class="btn btn-secondary btn-sm me-1" onclick="deactivateQuiz(${q.id})">Deactivate</button>`;

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${q.id}</td>
                <td>${q.title}</td>
                <td>${q.chapter?.title || "-"}</td>
                <td><span class="badge bg-info">${q.type}</span></td>
                <td>${statusBadge}</td>
                <td>${totalQuestions}</td>
                <td>${q.totalMarks}</td>
                <td>
                    <div class="d-flex flex-wrap gap-1">
                        <button class="btn btn-info btn-sm" onclick="viewQuiz(${q.id})">View</button>
                        <button class="btn btn-warning btn-sm" onclick="openEditQuiz(${q.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteQuiz(${q.id})">Delete</button>
                        ${activateBtn}
                    </div>
                </td>
            </tr>
        `;
    }

}



// ================= DELETE (HARD DELETE) =================

async function deleteQuiz(id) {

    if (!confirm("This will permanently delete the quiz. This action cannot be undone. Continue?"))
        return;

    const token =
        localStorage.getItem(
            "adminToken"
        );

    try {

        const res = await fetch(
            CONFIG.BASE_URL +
            "/api/quizzes/" +
            id,
            {
                method: "DELETE",

                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (res.ok) {
            alert("Quiz is deleted !");
        } else {
            const text = await res.text().catch(() => "");
            alert("An error occured while deleting — " + text);
        }

    } catch (err) {
        console.error("Delete error:", err);
        alert("An error occured while deleting");
    }

    refreshQuizzes();

}



// ================= ACTIVATE / DEACTIVATE =================

async function activateQuiz(id) {

    const token = localStorage.getItem("adminToken");

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/quizzes/" + id + "/activate",
            {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            }
        );

        if (res.ok) {
            alert("Quiz activated successfully !");
        } else {
            const text = await res.text().catch(() => "");
            alert("An error occured while activation — " + text);
        }

    } catch (err) {
        console.error("Activate error:", err);
        alert("Failed to connect with server");
    }

    refreshQuizzes();

}

async function deactivateQuiz(id) {

    const token = localStorage.getItem("adminToken");

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/quizzes/" + id + "/deactivate",
            {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            }
        );

        if (res.ok) {
            alert("Quiz is deactivated !");
        } else {
            const text = await res.text().catch(() => "");
            alert("An error occured while deactivation — " + text);
        }

    } catch (err) {
        console.error("Deactivate error:", err);
        alert("Failed to connect with server");
    }

    refreshQuizzes();

}



function handleQuizTypeChange() {

    const type =
        document.getElementById(
            "quizType"
        ).value;

    const startDiv =
        document.getElementById(
            "startTime"
        ).parentElement;

    const endDiv =
        document.getElementById(
            "endTime"
        ).parentElement;


    if (type === "PRACTICE") {

        startDiv.style.display = "none";
        endDiv.style.display = "none";

    }
    else {

        startDiv.style.display = "block";
        endDiv.style.display = "block";

    }

}



// ================= EDIT =================

// ================= UTC → LOCAL TIME CONVERTER =================

function convertUTCToLocal(datetime) {

    if (!datetime) return "";

    const d = new Date(datetime);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function convertToUTCZ(dateTimeString) {

    if (!dateTimeString)
        return null;

    const localDate =
        new Date(dateTimeString);

    // convert to exact UTC Z format
    return new Date(
        localDate.getTime()
    ).toISOString();

}

function handleEditQuizTypeChange() {

    const type =
        document.getElementById(
            "editQuizType"
        ).value;

    const startDiv =
        document.getElementById(
            "editStartTime"
        ).parentElement;

    const endDiv =
        document.getElementById(
            "editEndTime"
        ).parentElement;

    if (type === "PRACTICE") {

        startDiv.style.display = "none";
        endDiv.style.display = "none";

    }
    else {

        startDiv.style.display = "block";
        endDiv.style.display = "block";

    }

}

//open edit quiz function
async function openEditQuiz(id) {

    const token = localStorage.getItem("adminToken");

    const res = await fetch(
        CONFIG.BASE_URL + "/api/quizzes/" + id,
        {
            headers: {
                "Authorization": "Bearer " + token
            }
        }
    );

    const response = await res.json();
    const q = response.data ? response.data : response;

    window.currentEditQuiz = q;

    document.getElementById("editQuizId").value = q.id;
    document.getElementById("editQuizTitle").value = q.title || "";
    document.getElementById("editQuizDescription").value = q.description || "";
    document.getElementById("editQuizType").value = q.type;

    document.getElementById("editTimeLimit").value = q.timeLimit || 0;
    document.getElementById("editPassingMarks").value = q.passingMarks || 0;
    document.getElementById("editActive").checked = q.active;
    document.getElementById(
        "editShowResult"
    ).checked = q.showResult;

    if (q.startTime) {
        document.getElementById("editStartTime").value =
            convertUTCToLocal(q.startTime);
    }

    if (q.endTime) {
        document.getElementById("editEndTime").value =
            convertUTCToLocal(q.endTime);
    }

    handleEditQuizTypeChange();

    if (q.chapter) {

        try {

            const token = localStorage.getItem("adminToken");

            // Paper dhundo, taaki uska courseId mil jaaye
            const paperRes = await fetch(
                CONFIG.BASE_URL + "/api/papers/active",
                { headers: { "Authorization": "Bearer " + token } }
            );

            const papers = await paperRes.json();

            const matchedPaper =
                papers.find(p => p.id === q.chapter.paperId);

            if (matchedPaper) {

                // Course set karo
                document.getElementById("editCourseDropdown").value =
                    matchedPaper.courseId;

                // Papers load karo us course ke
                await loadEditPapers();

                // Paper set karo
                document.getElementById("editPaperDropdown").value =
                    matchedPaper.id;

                // Chapters load karo us paper ke
                await loadEditChapters();

                // Chapter set karo
                document.getElementById("editChapterDropdown").value =
                    q.chapter.id;

                // Questions load karo, purani selected wali checked ho jaayengi
                await loadEditQuestionsByChapter(q);

            }

        }
        catch (err) {
            console.error(err);
        }

    }

    new bootstrap.Modal(
        document.getElementById("editQuizModal")
    ).show();

}



// ================= LOAD EDIT QUESTIONS =================
// ================= LOAD EDIT PAPERS =================

async function loadEditPapers() {

    const courseId =
        document.getElementById("editCourseDropdown").value;

    document.getElementById("editChapterDropdown").innerHTML =
        '<option value="">Select Chapter</option>';

    document.getElementById("editQuestionDropdown").innerHTML = "";

    const dropdown =
        document.getElementById("editPaperDropdown");

    dropdown.innerHTML =
        '<option value="">Select Paper</option>';

    if (!courseId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/papers/active",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        const papers =
            data.filter(p => p.courseId === Number(courseId));

        papers.forEach(paper => {

            dropdown.innerHTML += `
<option value="${paper.id}">${paper.name}</option>
`;

        });

    }
    catch (err) {
        console.error(err);
    }

}


// ================= LOAD EDIT CHAPTERS =================

async function loadEditChapters() {

    const paperId =
        document.getElementById("editPaperDropdown").value;

    document.getElementById("editQuestionDropdown").innerHTML = "";

    const dropdown =
        document.getElementById("editChapterDropdown");

    dropdown.innerHTML =
        '<option value="">Select Chapter</option>';

    if (!paperId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/chapters/active",
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        const chapters =
            data.filter(c => c.paperId === Number(paperId));

        chapters.forEach(chapter => {

            dropdown.innerHTML += `
<option value="${chapter.id}">${chapter.title}</option>
`;

        });

    }
    catch (err) {
        console.error(err);
    }

}


// ================= LOAD EDIT QUESTIONS (BY CHAPTER) =================

async function loadEditQuestionsByChapter(q = null) {

    const chapterId =
        document.getElementById("editChapterDropdown").value;

    const container =
        document.getElementById("editQuestionDropdown");

    container.innerHTML = "";
    // Select All reset
    const selectAllBox = document.getElementById("selectAllEditQuestions");
    if (selectAllBox) selectAllBox.checked = false;

    if (!chapterId) return;

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/questions/chapter/" + chapterId,
            { headers: { "Authorization": "Bearer " + token } }
        );

        const data = await res.json();

        const quizToCheck = q || window.currentEditQuiz;

        data.forEach(question => {

            let checked = "";

            if (quizToCheck && quizToCheck.questions) {

                const exists =
                    quizToCheck.questions.find(oldQ => oldQ.id === question.id);

                if (exists) checked = "checked";

            }

            container.innerHTML += `
<div class="form-check">
<input type="checkbox"
class="form-check-input edit-question-checkbox"
value="${question.id}"
id="editq_${question.id}"
${checked}>
<label class="form-check-label" for="editq_${question.id}">
${question.question}
</label>
</div>
`;

        });

    }
    catch (err) {
        console.error(err);
    }

}

// ================= UPDATE =================
async function updateQuiz() {

    const id = document.getElementById("editQuizId").value;
    const type = document.getElementById("editQuizType").value;

    let startTime = null;
    let endTime = null;

    if (type !== "PRACTICE") {

        const startInput = document.getElementById("editStartTime").value;
        const endInput = document.getElementById("editEndTime").value;

        if (!startInput || !endInput) {
            alert("⚠️ Please enter start and end date/time");
            return;
        }

        startTime = convertToUTCZ(startInput);
        endTime = convertToUTCZ(endInput);
    }

    let questionIds =
        Array.from(
            document.querySelectorAll(".edit-question-checkbox:checked")
        ).map(cb => Number(cb.value));

    if (questionIds.length === 0 && window.currentEditQuiz && window.currentEditQuiz.questions) {
        questionIds =
            window.currentEditQuiz.questions.map(q => q.id);
    }
    const chapterId =
        document.getElementById("editChapterDropdown").value;

    if (!chapterId) {

        alert("⚠️ Please select chapter");

        return;

    }

    const body = {

        title: document.getElementById("editQuizTitle").value,
        description: document.getElementById("editQuizDescription").value,
        timeLimit: Number(document.getElementById("editTimeLimit").value),
        active: document.getElementById("editActive").checked,
        showResult:
            document.getElementById(
                "editShowResult"
            ).checked,
        type: type,
        chapterId: Number(document.getElementById("editChapterDropdown").value),
        passingMarks: Number(document.getElementById("editPassingMarks").value),
        startTime: startTime,
        endTime: endTime,
        questionIds: questionIds

    };

    const token = localStorage.getItem("adminToken");

    try {

        const res = await fetch(
            CONFIG.BASE_URL + "/api/quizzes/" + id,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(body)
            }
        );

        if (res.ok) {

            alert("Quiz Updated Successfully");

            refreshQuizzes();

            bootstrap.Modal
                .getInstance(document.getElementById("editQuizModal"))
                .hide();

        } else {

            const data = await res.json().catch(() => ({}));
            alert(data.message || "Update failed");
        }

    } catch (err) {
        console.error("Update error:", err);
        alert("An error occured while updating.");
    }
}

async function viewQuiz(id) {

    try {

        const token = localStorage.getItem("adminToken");

        const res = await fetch(
            CONFIG.BASE_URL + "/api/quizzes/" + id,
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const response = await res.json();

        const q = response.data ? response.data : response;

        if (!q) return;

        // Questions list
        let questionsHTML = "";

        if (q.questions && q.questions.length > 0) {

            q.questions.forEach((ques, index) => {
                questionsHTML += `
                    <li>
                        <b>Q${index + 1}:</b> ${ques.question}
                        <br>
                        <small>Marks: ${ques.marks}</small>
                    </li>
                `;
            });

        } else {
            questionsHTML = "<li>No questions found</li>";
        }

        // Main HTML
        document.getElementById("viewQuizBody").innerHTML = `
            <p><b>Title:</b> ${q.title}</p>
            <p><b>Description:</b> ${q.description}</p>
            <p><b>Chapter:</b> ${q.chapter?.title || "-"}</p>
<p><b>Paper:</b> ${q.chapter?.paperName || "-"}</p>
            <p><b>Type:</b> ${q.type}</p>
            <p><b>Show Result:</b> ${q.showResult ? "Yes" : "No"}</p>
            <p><b>Status:</b> ${q.active ? "Active" : "Inactive"}</p>
            <p><b>Time Limit:</b> ${q.timeLimit} minutes</p>
            <p><b>Passing Marks:</b> ${q.passingMarks}</p>
            <p><b>Total Questions:</b> ${q.totalQuestions || q.questions?.length || 0}</p>
            <p><b>Total Marks:</b> ${q.totalMarks}</p>
            <p><b>Start Time:</b> ${q.startTime || "-"}</p>
            <p><b>End Time:</b> ${q.endTime || "-"}</p>

            <hr>

            <h6>Questions:</h6>
            <ul>
                ${questionsHTML}
            </ul>
        `;

        // Open modal
        const modal = new bootstrap.Modal(
            document.getElementById("viewQuizModal")
        );

        modal.show();

    } catch (err) {

        console.error("View error:", err);

    }
}

// ================= SELECT ALL (CREATE) =================
function toggleSelectAllQuestions() {

    const selectAll = document.getElementById("selectAllQuestions").checked;

    document.querySelectorAll(
        "#questionDropdown input[type='checkbox']"
    ).forEach(cb => {
        cb.checked = selectAll;
    });

}

// ================= SELECT ALL (EDIT) =================
function toggleSelectAllEditQuestions() {

    const selectAll = document.getElementById("selectAllEditQuestions").checked;

    document.querySelectorAll(
        "#editQuestionDropdown input[type='checkbox']"
    ).forEach(cb => {
        cb.checked = selectAll;
    });

}