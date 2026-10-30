/**
 * admin/doctorProfile.js
 * JavaScript for Doctor Profile page in Admin Dashboard.
 * Handles doctor account activation/deactivation and modals.
 */

let activeCredentialId = null;

function openDeactivateDoctorModal(credentialId) {
    activeCredentialId = credentialId;
    const modal = document.getElementById("deactivateDoctorModal");
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
    
    const btn = document.getElementById("confirmDeactivateBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Deactivating...';
    btn.disabled = true;

    try {
        const response = await fetch(`/admin/doctors/${activeCredentialId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'deactive' })
        });

        const result = await response.json();
        if (response.ok || result.success) {
            alert(`Doctor account deactivated successfully!`);
            window.location.reload();
        } else {
            alert(result.message || `Failed to deactivate doctor status.`);
        }
    } catch (error) {
        console.error('Error toggling doctor status:', error);
        alert('An error occurred. Please try again.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        closeDeactivateDoctorModal();
    }
}

async function toggleDoctorStatus(credentialId, isActive) {
    if (isActive) {
        openDeactivateDoctorModal(credentialId);
    } else {
        if (!confirm("Are you sure you want to activate this doctor's account?")) return;

        try {
            const response = await fetch(`/admin/doctors/${credentialId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'active' })
            });

            const result = await response.json();
            if (response.ok || result.success) {
                alert(`Doctor account activated successfully!`);
                window.location.reload();
            } else {
                alert(result.message || `Failed to activate doctor status.`);
            }
        } catch (error) {
            console.error('Error activating doctor status:', error);
            alert('An error occurred. Please try again.');
        }
    }
}

function toggleDoctorViewMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('doctorViewMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('doctorViewDropdown');
    const menu = document.getElementById('doctorViewMenu');
    if (dropdown && menu && !dropdown.contains(event.target)) {
        menu.classList.add('hidden');
    }
});

// Close modal when clicking on backdrop
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("deactivateDoctorModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeDeactivateDoctorModal();
        }
    });
});

document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("deactivateDoctorModal");
    if (e.key === "Escape" && modal && modal.classList.contains("show")) {
        closeDeactivateDoctorModal();
    }
});
