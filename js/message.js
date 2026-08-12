document.addEventListener(
    "DOMContentLoaded",
    loadMessages
);

async function loadMessages() {

    try {

        const token =
            localStorage.getItem(
                "adminToken"
            );

        const response =
            await fetch(
                CONFIG.BASE_URL +
                "/api/contact/admin/all",
                {
                    method: "GET",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                "Failed to load messages"
            );

        }

        const messages =
            await response.json();

        renderMessages(messages);

    }

    catch (error) {

        console.error(error);

        document.getElementById(
            "messageTableBody"
        ).innerHTML = `

            <tr>

                <td colspan="7"
                    class="text-center text-danger">

                    Failed to load messages

                </td>

            </tr>
        `;
    }
}

function renderMessages(messages) {

    const tbody =
        document.getElementById(
            "messageTableBody"
        );

    tbody.innerHTML = "";

    if (!messages.length) {

        tbody.innerHTML = `

            <tr>

                <td colspan="7"
                    class="text-center">

                    No messages found

                </td>

            </tr>
        `;

        return;
    }

    messages.forEach((msg, index) => {

        const statusClass =
            msg.status === "PENDING"
                ? "status-pending"
                : "status-resolved";

        const row = `

            <tr>

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${msg.name}
                </td>

                <td>
                    ${msg.email}
                </td>

                <td>
                    ${msg.subject}
                </td>

                <td>

                    <div class="message-box">

                        ${msg.message}

                    </div>

                </td>

                <td>

                    <span class="status-badge ${statusClass}">

                        ${msg.status}

                    </span>

                </td>

                <td>

                    ${new Date(
            msg.createdAt
        ).toLocaleString()}

                </td>

            </tr>
        `;

        tbody.innerHTML += row;

    });
}