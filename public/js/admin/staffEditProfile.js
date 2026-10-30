document.addEventListener("DOMContentLoaded", () => {
    const editStaffProfileForm = document.getElementById("editStaffProfileForm");
    
    if (editStaffProfileForm) {
        editStaffProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Saving...';
            btn.disabled = true;

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            try {
                const urlParams = new URLSearchParams(window.location.search);
                const staffId = urlParams.get("staffId");
                
                if (!staffId) {
                    alert("Staff ID is missing in the URL.");
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }

                const response = await fetch(`/admin/staffProfile/edit?staffId=${staffId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (response.ok && result.success !== false) {
                    window.location.href = `/admin/staffProfile?staffId=${staffId}`;
                } else {
                    alert("Error saving profile: " + (result.message || "Unknown error"));
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (error) {
                console.error(error);
                alert("A network error occurred.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});
