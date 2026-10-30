/**
 * Patient Dashboard Dynamic Handlers
 */
document.addEventListener("DOMContentLoaded", () => {
    // Check if there is an online appointment requiring a meeting link
    const meetingContainer = document.getElementById("dashboardMeetingContainer");
    if (meetingContainer && !meetingContainer.classList.contains("hidden")) {
        const apptId = meetingContainer.getAttribute("data-appt-id");
        const apptType = meetingContainer.getAttribute("data-appt-type");
        
        if (apptType === "ONLINE" && apptId) {
            meetingContainer.innerHTML = `<span class="text-xs text-slate-400 italic">Checking link...</span>`;
            
            // Perform dynamic client fetch to check if meeting link is generated
            apiFetch(`/meeting/${apptId}`)
                .then(result => {
                    if (result && result.success && result.data) {
                        meetingContainer.innerHTML = `
                            <a href="${result.data}" target="_blank" class="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                                <span class="material-symbols-outlined text-base">video_call</span> Join Meeting
                            </a>
                        `;
                    } else {
                        meetingContainer.innerHTML = `
                            <span class="text-xs text-slate-400 italic font-medium bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">${result?.message || 'Link will appear shortly.'}</span>
                        `;
                    }
                })
                .catch(err => {
                    console.error("Error loading dashboard meeting link:", err);
                    meetingContainer.innerHTML = `
                        <span class="text-xs text-slate-400 italic font-medium bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">Link available 5m before</span>
                    `;
                });
        }
    }

    // Wire reschedule button to appointments page
    const rescheduleBtn = document.getElementById("rescheduleBtn");
    if (rescheduleBtn) {
        rescheduleBtn.addEventListener("click", () => {
            window.location.href = `/patient/appointments`;
        });
    }
});

