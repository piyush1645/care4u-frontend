// OTP Input Logic
const inputs = document.querySelectorAll('.otp-input');

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
        }
    });

    // Prevent non-numeric characters
    input.addEventListener('keypress', (e) => {
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
});

// Timer Logic
let timeLeft = 120; // 2:00
const timerElement = document.getElementById('timer');
const resendBtn = document.getElementById('resend-btn');

const countdown = setInterval(() => {
    if (timeLeft <= 0) {
        clearInterval(countdown);
        timerElement.innerText = "00:00";
        resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        resendBtn.disabled = false;
        return;
    }
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}, 1000);

// Form Submit Interaction
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const otp = Array.from(inputs).map(i => i.value).join('');
    const email = localStorage.getItem('resetEmail');

    const existingError = form.querySelector('.error-msg');
    if (existingError) existingError.remove();

    if (otp.length === 6) {
        const btn = form.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Verifying...`;
        btn.disabled = true;

        try {
            const response = await fetch('http://localhost:3004/api/v1/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const resData = await response.json();

            if (!response.ok || !resData.success) {
                throw new Error(resData.message || 'Invalid OTP');
            }

            btn.classList.replace('bg-primary', 'bg-secondary');
            btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Verified`;

            // Save reset token
            localStorage.setItem('resetToken', resData.data);

            setTimeout(() => {
                window.location.href = '/auth/reset-password';
            }, 1000);

        } catch (error) {
            btn.disabled = false;
            btn.innerHTML = originalContent;

            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-msg text-center text-error font-label-sm text-label-sm mt-md p-sm animate-in fade-in slide-in-from-top-2 bg-error-container/20 py-2 rounded-lg border border-error/20';
            errorDiv.innerText = error.message;
            form.insertBefore(errorDiv, btn);
        }
    }
});
