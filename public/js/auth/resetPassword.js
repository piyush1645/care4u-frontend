function togglePasswordVisibility(fieldId, btn) {
    const field = document.getElementById(fieldId);
    const icon = btn.querySelector('span');
    if (field && icon) {
        if (field.type === 'password') {
            field.type = 'text';
            icon.innerText = 'visibility_off';
        } else {
            field.type = 'password';
            icon.innerText = 'visibility';
        }
    }
}

const form = document.getElementById('reset-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const button = form.querySelector('button[type="submit"]');
        const originalContent = button.innerHTML;

        const existingError = form.querySelector('.error-msg');
        if (existingError) existingError.remove();

        if (password !== confirmPassword) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-msg text-center text-error font-label-sm text-label-sm mt-md p-sm animate-in fade-in slide-in-from-top-2 bg-error-container/20 py-2 rounded-lg border border-error/20';
            errorDiv.innerText = 'Passwords do not match.';
            form.insertBefore(errorDiv, button);
            return;
        }

        const token = localStorage.getItem('resetToken');
        if (!token) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-msg text-center text-error font-label-sm text-label-sm mt-md p-sm animate-in fade-in slide-in-from-top-2 bg-error-container/20 py-2 rounded-lg border border-error/20';
            errorDiv.innerText = 'Reset token is missing or expired. Please start over.';
            form.insertBefore(errorDiv, button);
            return;
        }

        button.disabled = true;
        button.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Updating Password...`;

        try {
            const response = await fetch(`http://localhost:3004/api/v1/auth/reset-password/${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const resData = await response.json();

            if (!response.ok || !resData.success) {
                throw new Error(resData.message || 'Error updating password.');
            }

            button.classList.replace('bg-primary', 'bg-secondary');
            button.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Password Reset!`;

            localStorage.removeItem('resetEmail');
            localStorage.removeItem('resetOtp');
            localStorage.removeItem('resetToken');

            const successDiv = document.createElement('div');
            successDiv.className = 'text-center text-secondary font-label-sm text-label-sm mt-md p-sm animate-in fade-in bg-secondary-container/20 py-2 rounded-lg border border-secondary/20';
            successDiv.innerText = 'Password reset successfully! Redirecting to login...';
            form.insertBefore(successDiv, button);

            setTimeout(() => {
                window.location.href = '/auth/login';
            }, 1500);

        } catch (error) {
            button.disabled = false;
            button.innerHTML = originalContent;

            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-msg text-center text-error font-label-sm text-label-sm mt-md p-sm animate-in fade-in slide-in-from-top-2 bg-error-container/20 py-2 rounded-lg border border-error/20';
            errorDiv.innerText = error.message;
            form.insertBefore(errorDiv, button);
        }
    });
}
