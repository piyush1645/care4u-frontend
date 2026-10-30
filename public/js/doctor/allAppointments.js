/**
 * allAppointments.js
 * Handles client-side logic for the doctor's All Appointments history page:
 *   - Row click navigation (to patient detail page)
 *   - Zoom call management (start / end)
 *   - Inline status updates via the status <select> dropdown
 */

// ── Row Click Navigation ──────────────────────────────────────────────────────
document.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
        // Ignore clicks on interactive elements
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('select')) return;
        const detailLink = row.querySelector('td:last-child a');
        if (detailLink) window.location.href = detailLink.href;
    });
});


// ── Zoom Call Controls ────────────────────────────────────────────────────────
async function startZoomCall(btn, appointmentId) {
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Starting...';
    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/video-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            window.open(result.meeting.startUrl, '_blank');
            window.location.reload();
        } else {
            alert('Failed to start Zoom call: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    } catch (error) {
        console.error('Error starting zoom call:', error);
        alert('An error occurred while starting Zoom call.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

async function endZoomCall(btn, appointmentId) {
    if (!confirm('Are you sure you want to end this video call?')) return;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Ending...';
    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/video-call/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            window.location.reload();
        } else {
            alert('Failed to end Zoom call: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    } catch (error) {
        console.error('Error ending zoom call:', error);
        alert('An error occurred while ending Zoom call.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}


// ── Inline Status Update ──────────────────────────────────────────────────────
async function updateAppointmentStatus(selectElement, appointmentId) {
    const newStatus = selectElement.value;
    selectElement.disabled = true;
    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (result.success) {
            window.location.reload();
        } else {
            alert('Failed to update status: ' + result.message);
            selectElement.disabled = false;
            window.location.reload();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('An error occurred while updating status.');
        selectElement.disabled = false;
        window.location.reload();
    }
}
