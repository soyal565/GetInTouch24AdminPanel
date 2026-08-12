document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadQuizzes();

    }
);



// ================= LOAD QUIZZES =================

async function loadQuizzes() {

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
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await res.json();

        const tbody =
            document.getElementById(
                "quizTableBody"
            );

        tbody.innerHTML = "";

        data.forEach((q, index) => {

            tbody.innerHTML += `

<tr>

<td>${q.id}</td>

<td>${q.title}</td>

<td>

<button
class="btn btn-primary btn-sm"
onclick="loadAttempts(${q.id})">

View Attempts

</button>

</td>

</tr>

`;

        });

    }

    catch (err) {

        console.error(
            "Quiz load error:",
            err
        );

    }

}



// ================= LOAD ATTEMPTS =================

async function loadAttempts(quizId) {

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res =
            await fetch(
                CONFIG.BASE_URL +
                "/api/quiz-attempts/quiz/" +
                quizId,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const attempts =
            await res.json();

        const tbody =
            document.getElementById(
                "attemptTableBody"
            );

        tbody.innerHTML = "";

        attempts.forEach(a => {

            tbody.innerHTML += `

<tr>

<td>${a.fullName}</td>

<td>${a.attemptId}</td>

<td>${a.totalScore}</td>

<td class="${a.status === "PASS"
                    ? "pass"
                    : "fail"
                }">

${a.status}

</td>

</tr>

`;

        });

    }

    catch (err) {

        console.error(
            "Attempt load error:",
            err
        );

    }

}



// ================= FETCH ATTEMPT DETAIL =================

async function fetchAttemptDetail() {

    const attemptId =
        document.getElementById(
            "attemptIdInput"
        ).value;

    if (!attemptId) {

        alert(
            "Please enter Attempt ID"
        );

        return;

    }

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const res =
            await fetch(
                CONFIG.BASE_URL +
                "/api/quiz-attempts/" +
                attemptId,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await res.json();

        if (res.ok) {

            showAttemptDetail(
                data
            );

        }
        else {

            alert(
                data.message ||
                "Result not found"
            );

        }

    }

    catch (err) {

        console.error(
            "Attempt detail error:",
            err
        );

    }

}



// ================= SHOW ATTEMPT DETAIL =================

function showAttemptDetail(data) {

    document.getElementById(
        "resultDetailCard"
    ).style.display = "block";



    // ================= SUMMARY =================

    document.getElementById(
        "totalQuestions"
    ).innerText =
        data.totalQuestions ||
        (data.results
            ? data.results.length
            : 0);


    document.getElementById(
        "attemptedQuestions"
    ).innerText =
        data.attemptedQuestions || 0;


    document.getElementById(
        "correctAnswers"
    ).innerText =
        data.correctAnswers || 0;


    document.getElementById(
        "wrongAnswers"
    ).innerText =
        data.wrongAnswers || 0;


    document.getElementById(
        "score"
    ).innerText =
        (data.score || 0) +
        "/" +
        (data.totalMarks || 0);


    document.getElementById(
        "percentage"
    ).innerText =
        (data.percentage || 0).toFixed(2) + "%";


    document.getElementById(
        "status"
    ).innerText =
        data.status || "-";



    // ================= TIME =================

    document.getElementById(
        "timeRange"
    ).innerText =
        formatTime(data.startTime) +
        " to " +
        formatTime(data.endTime);



    // ================= QUESTION WISE =================

    const tbody =
        document.getElementById(
            "questionResultBody"
        );

    tbody.innerHTML = "";



    // 🔥 SAFE ARRAY HANDLE

    const results =
        data.results || [];


    if (results.length === 0) {

        tbody.innerHTML = `

<tr>
<td colspan="5" class="text-center">

No question result available

</td>
</tr>

`;

        return;

    }



    results.forEach((res, index) => {

        const selectedIndexes =
            res.selectedIndexes || [];

        const correctIndexes =
            res.correctIndexes || [];



        // Format Selected

        const selectedText =
            selectedIndexes.length > 0
                ? selectedIndexes
                    .map(i => "Option " + (i + 1))
                    .join(", ")
                : "Not Attempted";



        // Format Correct

        const correctText =
            correctIndexes.length > 0
                ? correctIndexes
                    .map(i => "Option " + (i + 1))
                    .join(", ")
                : "-";



        const isCorrect =
            res.correct === true;



        tbody.innerHTML += `

<tr>

<td>${index + 1}</td>

<td>${selectedText}</td>

<td>${correctText}</td>

<td>${res.marksObtained || 0}</td>

<td class="${isCorrect
                ? "pass"
                : "fail"
            }">

${isCorrect
                ? "Correct"
                : "Wrong"
            }

</td>

</tr>

`;

    });
}



// ================= FORMAT TIME =================

function formatTime(time) {

    if (!time)
        return "";

    const date =
        new Date(time);

    return date.toLocaleString();

}