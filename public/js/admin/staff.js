function displayStaffProfile(staffId) {
    window.location.href = `/admin/staffProfile?staffId=${staffId}`;
}

function editStaffProfile(staffId) {
    if (confirm("Are you sure you want to edit staff profile?")) {
        window.location.href = `/admin/staffProfile/edit?staffId=${staffId}`;
    }
}

let currentDeactivateStaffId = null;

function openDeactivateModal(staffId, staffName) {
    currentDeactivateStaffId = staffId;
    const modal = document.getElementById("deactivateModal");
    const nameEl = document.getElementById("deactivateStaffName");

    if (nameEl && staffName) {
        nameEl.textContent = staffName;
    } else if (nameEl) {
        nameEl.textContent = "this staff member";
    }

    if (modal) {
        modal.style.display = "flex";
        // Force reflow to ensure the transition runs
        void modal.offsetWidth;
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }
}

function closeDeactivateModal() {
    currentDeactivateStaffId = null;
    const modal = document.getElementById("deactivateModal");

    if (modal) {
        modal.classList.remove("show");
        // Wait for the transition to finish before hiding the element
        setTimeout(() => {
            if (!modal.classList.contains("show")) {
                modal.style.display = "none";
            }
        }, 250);
        document.body.style.overflow = "";
    }
}

async function handleDeactivate() {
    if (!currentDeactivateStaffId) return;

    const confirmBtn = document.getElementById("confirmDeactivateBtn");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Deactivating...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch(`/admin/staff/${currentDeactivateStaffId}/deactivate`, {
            method: "PATCH"
        });

        const data = await response.json();
        if (response.ok && data.success) {
            window.location.reload();
        } else {
            alert(data.message || "Failed to deactivate staff.");
        }
    } catch (error) {
        console.error("Error deactivating staff:", error);
        alert("A network error occurred.");
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        closeDeactivateModal();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".deactivate-staff-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            openDeactivateModal(btn.dataset.staffId, btn.dataset.staffName);
        });
    });

    document.getElementById("cancelDeactivate")?.addEventListener("click", closeDeactivateModal);
    document.getElementById("confirmDeactivateBtn")?.addEventListener("click", handleDeactivate);
    
    document.getElementById("deactivateModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeDeactivateModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        const modal = document.getElementById("deactivateModal");
        if (e.key === "Escape" && modal && modal.classList.contains("show")) {
            closeDeactivateModal();
        }
    });
});
