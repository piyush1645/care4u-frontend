document.getElementById("login-form").addEventListener("submit", handleLogin);

async function handleLogin(e) {
    e.preventDefault();
    console.log('login js loaded!!');

    const errorContainer = document.getElementById("error-message");
    const loginBtn = document.getElementById("login-btn");

    // Clear previous errors
    errorContainer.classList.add("hidden");
    errorContainer.textContent = "";

    let identity = document.getElementById("identity").value.trim();
    const password = document.getElementById("password").value;

    console.log(identity, password);

    // Basic Validation
    if (!identity || !password) {
        errorContainer.textContent = "Email/Mobile and Password are required.";
        errorContainer.classList.remove("hidden");
        return;
    }

    // identity can be either mobile number or email so we need check that
    const originalContent = loginBtn.innerHTML;

    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML =
            '<span class="material-symbols-outlined animate-spin">progress_activity</span> Authenticating...';

        const response = await fetch("http://localhost:3004/api/v1/auth/login", {
            method: "POST",
            // credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                [identity.includes("@") ? "email" : "mobile"]: identity,
                password,
            }),
        });

        const result = await response.json();

        console.log("Login Response:", result);

        if (!response.ok) {
            throw new Error(result.message || result.error || "Login failed");
        }

        // Set cookies directly in the frontend
        document.cookie = `accessToken=${result.data.accessToken}; path=/; max-age=86400`;      
        document.cookie = `refreshToken=${result.data.refreshToken}; path=/; max-age=604800`; 

        // Redirect
        if (result.data.role == 'PATIENT') {
            window.location.href = "/patient/dashboard";
        } else if (result.data.role == 'DOCTOR') {
            window.location.href = "/doctor/dashboard";
        } else if (result.data.role == 'STAFF') {
            window.location.href = "/staff/dashboard";
        } else if (result.data.role == 'ADMIN') {
            window.location.href = "/admin/dashboard";
        } else if (result.data.role == 'SUPER_ADMIN') {
            window.location.href = "/superadmin/dashboard";
        } else {
            window.location.href = "/";
        }
    } catch (error) {
        console.error(error);

        errorContainer.textContent =
            error.message || "Something went wrong. Please try again.";

        errorContainer.classList.remove("hidden");
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalContent;
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle span');
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.innerText = 'visibility_off';
        } else {
            passwordInput.type = 'password';
            toggleIcon.innerText = 'visibility';
        }
    }
}