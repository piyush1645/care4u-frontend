function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');

    msg.textContent = message;
    icon.textContent = isError ? 'error' : 'check_circle';
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-emerald-600'}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

function setButtonLoading(btn, loading, originalHTML) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;border-top-color:white;display:inline-block;"></span> Saving...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

function previewPhoto() {
    const url = document.getElementById('profilePhoto').value.trim();
    if (!url) return showToast('Enter a photo URL first', true);
    
    const img = document.createElement('img');
    img.onload = () => {
        const ring = document.getElementById('avatarRing');
        ring.innerHTML = `<img src="${url}" alt="Profile" class="w-full h-full object-cover" />`;
        showToast('Photo preview updated!');
    };
    img.onerror = () => showToast('Could not load image from this URL. Please check the link.', true);
    img.src = url;
}

// Personal info form
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('savePersonalBtn');
    const originalHTML = btn.innerHTML;
    setButtonLoading(btn, true);

    const payload = {
        firstName:    document.getElementById('firstName').value.trim() || undefined,
        middleName:   document.getElementById('middleName').value.trim() || undefined,
        lastName:     document.getElementById('lastName').value.trim() || undefined,
        gender:       document.getElementById('gender').value || undefined,
        dateOfBirth:  document.getElementById('dateOfBirth').value || undefined,
        profilePhoto: document.getElementById('profilePhoto').value.trim() || undefined,
    };

    // Remove undefined keys to avoid sending empty fields
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    try {
        const res = await fetch('/staff/dashboard/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Personal information updated successfully!');
            // Update displayed name in profile card
            const d = data.data;
            const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim();
            document.getElementById('displayName').textContent = fullName;
            // Update topheader name if possible
            const headerNameEl = document.querySelector('header .font-bold.text-primary');
            if (headerNameEl) headerNameEl.textContent = fullName;
        } else {
            showToast(data.message || 'Failed to update profile', true);
        }
    } catch (err) {
        showToast('Network error. Please try again.', true);
    } finally {
        setButtonLoading(btn, false, originalHTML);
    }
});

// Contact info form
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveContactBtn');
    const originalHTML = btn.innerHTML;
    setButtonLoading(btn, true);

    const email = document.getElementById('email').value.trim();
    const mobile = document.getElementById('mobile').value.trim();

    const payload = {};
    if (email) payload.email = email;
    if (mobile) payload.mobile = mobile;

    if (!email && !mobile) {
        showToast('Enter at least an email or mobile to update', true);
        setButtonLoading(btn, false, originalHTML);
        return;
    }

    try {
        const res = await fetch('/staff/dashboard/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Contact information updated successfully!');
            document.getElementById('displayMobile').textContent = data.data.mobile || mobile;
        } else {
            showToast(data.message || 'Failed to update contact info', true);
        }
    } catch (err) {
        showToast('Network error. Please try again.', true);
    } finally {
        setButtonLoading(btn, false, originalHTML);
    }
});
