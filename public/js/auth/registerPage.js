 document.getElementById('registrationForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log('register js loaded!!');
            const errorContainer = document.getElementById('error-message');
            errorContainer.classList.add('hidden');
            errorContainer.textContent = '';

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            

            // Basic client-side validation for confirm password
            if (data.password !== data.confirmPassword) {
                errorContainer.textContent = "Passwords do not match.";
                errorContainer.classList.remove('hidden');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalContent = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Registering...';

            try {
                // Remove empty optional fields
                // if (!data.middleName) {
                //     delete data.middleName;
                // }

                const response = await fetch('http://localhost:3004/api/v1/patient/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });


                const result = await response.json().catch(() => ({}));
        

                if (result.success) {
                    // Success logic
                    alert('Registration successful!');
                    window.location.href = '/auth/login';
                } else {
                    // Show error from backend
                    errorContainer.textContent = result.message || result.error || "Registration failed. Please try again.";
                    errorContainer.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Registration error:", error);
                errorContainer.textContent = "An error occurred during registration. Please try again later.";
                errorContainer.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
        });

        // Date input style fix for some browsers
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.addEventListener('focus', () => dateInput.showPicker?.());
        }