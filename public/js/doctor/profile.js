// Photo Modal Logic
const photoModal = document.getElementById('photoModal');
const modalContent = photoModal.querySelector('.max-w-sm');

function openPhotoModal() {
    photoModal.classList.remove('hidden');
    photoModal.classList.add('flex');
    setTimeout(() => {
        photoModal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }, 10);
}

function closePhotoModal() {
    photoModal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        photoModal.classList.add('hidden');
        photoModal.classList.remove('flex');
        modalProfileImagePreview.src = window.AppConfig.doctorProfilePhoto;
        modalUploadPhotoBtn.classList.add('hidden');
        modalSelectedFile = null;
        modalProfilePhotoInput.value = '';
    }, 300);
}

const serverPort = window.AppConfig.serverPort;
const modalProfilePhotoInput = document.getElementById('modalProfilePhotoInput');
const modalUploadPhotoBtn = document.getElementById('modalUploadPhotoBtn');
const modalProfileImagePreview = document.getElementById('modalProfileImagePreview');
let modalSelectedFile = null;

if (modalProfilePhotoInput) {
    modalProfilePhotoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            modalSelectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                modalProfileImagePreview.src = e.target.result;
                modalUploadPhotoBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(modalSelectedFile);
        }
    });
}

if (modalUploadPhotoBtn) {
    modalUploadPhotoBtn.addEventListener('click', async () => {
        if (!modalSelectedFile) return;

        const originalHtml = modalUploadPhotoBtn.innerHTML;
        modalUploadPhotoBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Uploading...';
        modalUploadPhotoBtn.disabled = true;

        const formData = new FormData();
        formData.append('profile-photo', modalSelectedFile);

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
                document.querySelector('.w-32.h-32.rounded-xl.object-cover').src = modalProfileImagePreview.src;
                alert('Profile photo updated successfully!');
                closePhotoModal();
            } else {
                alert('Failed to update photo: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('A network error occurred while uploading.');
        } finally {
            modalUploadPhotoBtn.innerHTML = originalHtml;
            modalUploadPhotoBtn.disabled = false;
        }
    });
}

// Simple micro-interaction for hover states and button feedback
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function () {
        this.classList.add('scale-95');
        setTimeout(() => this.classList.remove('scale-95'), 100);
    });
});
