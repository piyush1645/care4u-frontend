const form = document.getElementById('leaveRequestForm');
const toast = document.getElementById('successToast');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const leaveDate = document.getElementById('leaveDate').value;
    const leaveStartTime = document.getElementById('leaveStartTime').value;
    const leaveEndTime = document.getElementById('leaveEndTime').value;
    const leaveCategory = document.getElementById('leaveCategory').value;
    const description = document.getElementById('description').value;

    try {
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Submitting...';

        const urlParams = new URLSearchParams(window.location.search);
        const doctorId = urlParams.get('doctorId');
        const fetchUrl = doctorId ? `/doctor/leaves?doctorId=${doctorId}` : '/doctor/leaves';

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leaveDate,
                leaveStartTime: leaveStartTime || null,
                leaveEndTime: leaveEndTime || null,
                leaveCategory,
                description
            })
        });

        const data = await response.json();

        if (response.ok && (data.success || data.response?.success)) {
            // Visual feedback
            toast.classList.remove('translate-y-32', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            // Clear form
            form.reset();

            // Reload page after 1.5s to show updated leaves
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            alert(data.response?.message || data.message || "Failed to submit leave request.");
        }
    } catch (error) {
        console.error(error);
        alert("Something went wrong while submitting the request.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Request →';
    }
});

// Delete leave handler
window.deleteLeave = async (leaveId) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const doctorId = urlParams.get('doctorId');
        const fetchUrl = doctorId ? `/doctor/leaves/${leaveId}?doctorId=${doctorId}` : `/doctor/leaves/${leaveId}`;

        const response = await fetch(fetchUrl, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && (data.success || data.response?.success)) {
            alert("Leave cancelled successfully.");
            window.location.reload();
        } else {
            alert(data.response?.message || data.message || "Failed to cancel leave request.");
        }
    } catch (error) {
        console.error(error);
        alert("Something went wrong while cancelling the leave.");
    }
};

// Hover effects for the summary cards
document.querySelectorAll('.border-b').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.classList.add('border-primary', 'opacity-100');
    });
    item.addEventListener('mouseleave', () => {
        item.classList.remove('border-primary');
    });
});
