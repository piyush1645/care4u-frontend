// Retrieve OTP
const rawOtp = localStorage.getItem('resetOtp') || '482931';
const formattedOtp = rawOtp.length === 6 ? rawOtp.slice(0, 3) + '-' + rawOtp.slice(3) : rawOtp;

const codeBox = document.getElementById('otp-display');
if (codeBox) {
    codeBox.innerText = formattedOtp;
    
    codeBox.addEventListener('mouseover', () => {
        codeBox.classList.add('scale-[1.02]');
        codeBox.style.transition = 'transform 0.2s ease-out';
    });
    codeBox.addEventListener('mouseout', () => {
        codeBox.classList.remove('scale-[1.02]');
    });
    codeBox.addEventListener('click', () => {
        const text = codeBox.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = codeBox.innerText;
            codeBox.innerText = 'COPIED';
            codeBox.classList.add('text-secondary');
            setTimeout(() => {
                codeBox.innerText = originalText;
                codeBox.classList.remove('text-secondary');
            }, 1000);
        });
    });
}

// Start countdown
let timeLeft = 120; // 2 minutes
const timerText = document.getElementById('expiry-timer');
if (timerText) {
    const interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerText.innerText = 'Code expired';
            timerText.classList.remove('text-secondary');
            timerText.classList.add('text-error');
            return;
        }
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerText.innerText = `Code expires in ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}
