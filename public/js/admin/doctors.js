function displayDoctorProfile(doctorId) {
    window.location.href = `/admin/doctorProfile?doctorId=${doctorId}`
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

let activeCredentialId = null;

function openDeactivateDoctorModal(credentialId, doctorName) {
    activeCredentialId = credentialId;
    const modal = document.getElementById("deactivateDoctorModal");
    const nameEl = document.getElementById("deactivateDoctorName");
    
    if (nameEl && doctorName) {
        nameEl.textContent = doctorName;
    } else if (nameEl) {
        nameEl.textContent = "this doctor";
    }

    if (modal) {
        modal.style.display = "flex";
        void modal.offsetWidth;
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }
}

function closeDeactivateDoctorModal() {
    activeCredentialId = null;
    const modal = document.getElementById("deactivateDoctorModal");
    if (modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            if (!modal.classList.contains("show")) {
                modal.style.display = "none";
            }
        }, 250);
        document.body.style.overflow = "";
    }
}

async function confirmDeactivateDoctor() {
    if (!activeCredentialId) return;
    
    const confirmBtn = document.getElementById("confirmDeactivateBtn");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Deactivating...';
    confirmBtn.disabled = true;

    const token = getCookie('accessToken');
    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    try {
        const res = await fetch(`http://localhost:3004/api/v1/doctor/${activeCredentialId}/deactive`, {
            method: "patch",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const result = await res.json();
        if (res.ok) {
            alert("Doctor Account Deactivated.");
            window.location.reload();
        } else {
            alert(result.message || "Failed to deactivate Doctor. Try again after some time.");
        }
    } catch (error) {
        console.error(error);
        alert("Failed to deactivate Doctor. Try again after some time.");
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        closeDeactivateDoctorModal();
    }
}

function deleteDoctor(id, doctorName) {
    openDeactivateDoctorModal(id, doctorName);
}

function editDoctorProfile(id) {
    if (confirm(`Are you sure you want to Edit doctor profile?`)) {
        try {
            window.location.href = `/admin/doctorProfile/edit?doctorId=${id}`
        } catch (error) {
            console.log(error)
            alert("Failed to Edit Doctor profile")
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("cancelDeactivateDoctor")?.addEventListener("click", closeDeactivateDoctorModal);
    document.getElementById("confirmDeactivateBtn")?.addEventListener("click", confirmDeactivateDoctor);
    
    document.getElementById("deactivateDoctorModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeDeactivateDoctorModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        const modal = document.getElementById("deactivateDoctorModal");
        if (e.key === "Escape" && modal && modal.classList.contains("show")) {
            closeDeactivateDoctorModal();
        }
    });
});