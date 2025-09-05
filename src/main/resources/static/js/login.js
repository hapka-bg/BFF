document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const usernameError = document.getElementById("username-error");
    const passwordError = document.getElementById("password-error");

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        usernameError.textContent = "";
        passwordError.textContent = "";

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let hasError = false;
        if(!username){
            usernameError.textContent = "Username cannot be empty";
            hasError = true;
        }
        if (!password) {
            passwordError.textContent = "Password cannot be empty";
            hasError = true;
        }
        if (hasError) return;


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
                passwordError.textContent = "Invalid username or password";
                return;
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
            passwordError.textContent = "Something went wrong. Please try again.";
            console.error(err);
        }
    })

})