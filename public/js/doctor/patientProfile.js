/**
 * patientProfile.js
 * Handles client-side logic for the doctor's Patient Profile page:
 *   - File-name preview update when selecting a prescription photo
 *   - Prescription photo upload via fetch API
 */

function updateFileName(input) {
    const form = input.closest('form');
    const span = form.querySelector('.file-name-text');
    const btn  = form.querySelector('button[type="submit"]');
    if (input.files && input.files.length > 0) {
        span.textContent = input.files[0].name;
        btn.removeAttribute('disabled');
    } else {
        span.textContent = 'No file chosen';
        btn.setAttribute('disabled', 'true');
    }
}

async function uploadPrescription(event, appointmentId) {
    event.preventDefault();
    const form      = event.target;
    const fileInput = form.querySelector('input[type="file"]');
    const btn       = form.querySelector('button[type="submit"]');

    if (!fileInput.files || fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    btn.disabled    = true;
    btn.textContent = 'Uploading...';

    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/prescription-photo`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            alert('Prescription uploaded successfully!');
            window.location.reload();
        } else {
            alert('Upload failed: ' + (result.message || 'Unknown error'));
            btn.disabled    = false;
            btn.textContent = 'Upload';
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('An error occurred while uploading. Please try again.');
        btn.disabled    = false;
        btn.textContent = 'Upload';
    }
}
