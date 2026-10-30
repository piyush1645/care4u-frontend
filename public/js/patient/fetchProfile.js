/**
 * Patient Profile Dynamic Handlers
 */

function showError(msg) {
    const el = document.getElementById('errorBanner');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('errorBanner');
    if (el) el.classList.add('hidden');
}

function showSuccess(msg) {
    const el = document.getElementById('successBanner');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Profile update form handler
    const updateForm = document.getElementById('profileUpdateForm');
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const firstName = document.getElementById('inputFirstName')?.value?.trim();
            const middleName = document.getElementById('inputMiddleName')?.value?.trim();
            const lastName = document.getElementById('inputLastName')?.value?.trim();
            const dateOfBirth = document.getElementById('inputDob')?.value;

            // 1. First Name Validation
            if (!firstName) {
                showError('First name is required.');
                return;
            }
            if (firstName.length < 2) {
                showError('First name must be at least 2 characters.');
                return;
            }
            if (!/^[a-zA-Z\s]+$/.test(firstName)) {
                showError('First name must contain letters and spaces only.');
                return;
            }

            // 2. Middle Name Validation (Optional)
            if (middleName && !/^[a-zA-Z\s]+$/.test(middleName)) {
                showError('Middle name must contain letters and spaces only.');
                return;
            }

            // 3. Last Name Validation
            if (!lastName) {
                showError('Last name is required.');
                return;
            }
            if (lastName.length < 2) {
                showError('Last name must be at least 2 characters.');
                return;
            }
            if (!/^[a-zA-Z\s]+$/.test(lastName)) {
                showError('Last name must contain letters and spaces only.');
                return;
            }

            // 4. Date of Birth Validation (Optional, but must be in the past)
            if (dateOfBirth) {
                const dobDate = new Date(dateOfBirth);
                const today = new Date();
                // Strip hours to compare only dates
                today.setHours(0, 0, 0, 0);
                if (dobDate > today) {
                    showError('Date of birth cannot be in the future.');
                    return;
                }
            }

            const btn = updateForm.querySelector('button[type="submit"]');
            const original = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const formData = new FormData(updateForm);
                const body = {};
                for (const [key, value] of formData.entries()) {
                    if (value && value.trim() !== '') body[key] = value.trim();
                }

                const result = await apiFetch(`/patient/profile`, {
                    method: 'PATCH',
                    body: JSON.stringify(body),
                });

                if (!result || !result.ok) {
                    showError(result?.message || 'Failed to update profile');
                    return;
                }

                showSuccess('Profile updated successfully!');
                await refreshProfileData();
            } catch (err) {
                showError('Network error. Please try again.');
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = original;
            }
        });
    }

    // Photo upload form handler
    const photoForm = document.getElementById('photoUploadForm');
    if (photoForm) {
        photoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();
            const fileInput = document.getElementById('profilePhotoInput');
            if (!fileInput || !fileInput.files[0]) {
                showError('Please select a photo first.');
                return;
            }

            const file = fileInput.files[0];

            // 1. File Type Validation
            if (!file.type.startsWith('image/')) {
                showError('Please select a valid image file (PNG, JPG, WebP, etc.).');
                return;
            }

            // 2. File Size Validation (Max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5 MB
            if (file.size > maxSize) {
                showError('Image size exceeds the maximum limit of 5MB.');
                return;
            }

            const btn = photoForm.querySelector('button[type="submit"]');
            const original = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Uploading...';

            try {
                const formData = new FormData();
                formData.append('profilePhoto', file);

                const result = await apiFetch(`/patient/profile/photo`, {
                    method: 'PATCH',
                    body: formData,
                });

                if (!result || !result.ok) {
                    showError(result?.message || 'Failed to upload photo');
                    return;
                }

                showSuccess('Profile photo updated!');
                await refreshProfileData();
            } catch (err) {
                showError('Network error. Please try again.');
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = original;
            }
        });
    }
});

/**
 * Fetch fresh profile data and update EJS components dynamically in-place
 */
async function refreshProfileData() {
    try {
        const result = await apiFetch(`/patient/profile`);
        if (result && result.success) {
            const p = result.data || {};
            
            // Photo
            const photoImg = document.getElementById('profilePhotoDisplay');
            if (photoImg) photoImg.src = p.profilePhoto || '/images/default-avatar.svg';

            const headerWrap = document.getElementById('headerAvatarWrap');
            if (headerWrap) {
                headerWrap.innerHTML = `<img src="${p.profilePhoto || '/images/default-avatar.svg'}" onerror="this.onerror=null; this.src='/images/default-avatar.svg';" class="w-full h-full object-cover rounded-full" />`;
            }

            // Read-only fields
            setText('displayEmail',      p.email);
            setText('displayEmail2',     p.email);
            setText('displayMobile',     p.mobile);
            setText('displayMobile2',    p.mobile);
            setText('displayBloodGroup', p.bloodGroup);
            setText('displayBloodGroup2', p.bloodGroup);
            setText('displayGender',     p.gender);
            setText('displayGender2',    p.gender);
            const dobFormatted = p.dateOfBirth
                ? new Date(p.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
            setText('displayDob',  dobFormatted);
            setText('displayDob2', dobFormatted);
            setText('displayFullName', [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '));

            // Also fill the top header name
            const headerName = document.getElementById('headerPatientName');
            if (headerName) headerName.textContent = p.firstName;

            // Pre-fill editable form inputs
            setVal('inputFirstName',  p.firstName  || '');
            setVal('inputMiddleName', p.middleName || '');
            setVal('inputLastName',   p.lastName   || '');
            setVal('inputGender',     p.gender     || '');
            setVal('inputBloodGroup', p.bloodGroup || '');
            if (p.dateOfBirth) {
                setVal('inputDob', new Date(p.dateOfBirth).toISOString().split('T')[0]);
            }
        }
    } catch (err) {
        console.error('Error refreshing profile data:', err);
    }
}
