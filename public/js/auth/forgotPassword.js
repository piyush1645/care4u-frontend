const form = document.querySelector('form');
const button = form.querySelector('button');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const originalContent = button.innerHTML;
    
    // Remove previous error messages
    const existingError = form.querySelector('.error-msg');
    if (existingError) existingError.remove();

    button.disabled = true;
    button.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
    `;

    try {
        const response = await fetch('http://localhost:3004/api/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
            throw new Error(resData.message || 'Invalid email or phone number');
        }

        button.innerHTML = `
            <span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
            Code Sent
        `;
        button.classList.remove('bg-primary');
        button.classList.add('bg-secondary');

        // Store state
        localStorage.setItem('resetEmail', email);
        localStorage.setItem('resetOtp', resData.data.otp);

        setTimeout(() => {
            // Open the email view in a new tab
            window.open('/auth/email', '_blank');
            // Redirect current window to OTP page
            window.location.href = '/auth/otp';
        }, 1000);

    } catch (error) {
        button.disabled = false;
        button.innerHTML = originalContent;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-msg text-center text-error font-label-sm text-label-sm mt-md p-sm animate-in fade-in slide-in-from-top-2 bg-error-container/20 py-2 rounded-lg border border-error/20';
        errorDiv.innerText = error.message;
        form.insertBefore(errorDiv, button);
    }
});
