function changePage(page) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', page);
    window.location.search = urlParams.toString();
}

window.addEventListener('DOMContentLoaded', () => {
    // Show who we are booking for, if a patient is in sessionStorage
    const patientDataStr = sessionStorage.getItem('bookingPatient');
    if (patientDataStr) {
        try {
            const p = JSON.parse(patientDataStr);
            const el = document.getElementById('bookingForPatientText');
            if (el && p.firstName) {
                el.innerHTML = `Booking an appointment for <span class="font-bold text-primary">${p.firstName} ${p.lastName || ''}</span>. Select a doctor to continue.`;
            }
        } catch(e) {}
    }
});
