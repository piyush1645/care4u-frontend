const serverPort = window.AppConfig.serverPort;
const profilePhotoInput = document.getElementById('profilePhotoInput');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const profileImagePreview = document.getElementById('profileImagePreview');
let selectedFile = null;

if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                profileImagePreview.src = e.target.result;
                uploadPhotoBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(selectedFile);
        }
    });
}

if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const originalHtml = uploadPhotoBtn.innerHTML;
        uploadPhotoBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Uploading...';
        uploadPhotoBtn.disabled = true;

        const formData = new FormData();
        formData.append('profile-photo', selectedFile);

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const doctorId = urlParams.get('doctorId');
            const fetchUrl = doctorId ? `/doctor/profile-photo?doctorId=${doctorId}` : '/doctor/profile-photo';

            const response = await fetch(fetchUrl, {
                method: 'PATCH',
                body: formData
            });

            const result = await response.json();
            if (response.ok && result.success !== false) {
                alert('Profile photo updated successfully!');
                uploadPhotoBtn.classList.add('hidden');
            } else {
                alert('Failed to update photo: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('A network error occurred while uploading.');
        } finally {
            uploadPhotoBtn.innerHTML = originalHtml;
            uploadPhotoBtn.disabled = false;
        }
    });
}

const editProfileForm = document.getElementById('editProfileForm');
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';
        btn.disabled = true;

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Process lists
        if (data.preferedLanguages) {
            data.preferedLanguages = data.preferedLanguages.split(',').map(l => l.trim()).filter(l => l).join(',');
        } else {
            data.preferedLanguages = '';
        }
        
        // Format numbers
        data.expereince = Number(data.expereince);
        data.charges = Number(data.charges);
        data.slotDuration = Number(data.slotDuration);

        // Re-attach arrays so they don't get deleted
        data.specialities = JSON.parse(document.getElementById('specialitiesData').value || '[]');
        data.degrees = JSON.parse(document.getElementById('degreesData').value || '[]');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const doctorId = urlParams.get('doctorId');
            const fetchUrl = doctorId ? `/doctor/profile/edit?doctorId=${doctorId}` : '/doctor/profile/edit';
            
            let profileUrl;
            if (window.location.pathname.startsWith('/admin')) {
                profileUrl = doctorId ? `/admin/doctorProfile?doctorId=${doctorId}` : '/admin/doctors';
            } else {
                profileUrl = doctorId ? `/doctor/profile?doctorId=${doctorId}` : '/doctor/profile';
            }

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if(response.ok && result.success !== false) {
                // Success, redirect back — preserve doctorId for admin context
                window.location.href = profileUrl;
            } else {
                alert('Error saving profile: ' + (result.response?.message || result.message || 'Unknown error'));
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('A network error occurred.');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}
