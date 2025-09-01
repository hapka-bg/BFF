document.addEventListener('DOMContentLoaded', () => {


    const form=document.getElementById('login-form');
    form.addEventListener('submit', async (event) => {
        console.log("Form Submitted");
        event.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            //todo change the alert in a red text below the fields
            alert("Please enter both username and password");
            return;
        }

        try {
            console.log("Sending request");
            const res = await fetch("http://localhost:8082/api/auth/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({username, password})
            });
            console.log("Request send");
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Login failed: ${res.status} ${text}`);
            }
            const data = await res.json();
            localStorage.setItem("jwt_token", data.accessToken);
            localStorage.setItem("user_role", data.role?.toLowerCase());
            switch (data.role?.toLowerCase()) {
                case "admin":
                    window.location.href = "admin.html";
                    break;
                case "user":
                    window.location.href = "home.html";
                    break;
                default:
                    window.location.href = "index.html";
            }
        } catch (err) {
            //todo same here
            console.error(err);
            alert("Invalid username or password");
        }
    })

})