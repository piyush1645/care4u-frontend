/**
 * Patient Module Client-Side Utilities
 */

/**
 * Get cookie value by name
 * @param {string} name 
 * @returns {string|null}
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie by setting its max-age to 0
 * @param {string} name 
 */
function deleteCookie(name) {
    document.cookie = name + "=; max-age=0; path=/";
}

/**
 * Delete all cookies present on the document
 */
function deleteAllCookies() {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        deleteCookie(name);
    }
}

/**
 * Map appointment status to Tailwind CSS badge classes
 * @param {string} status 
 * @returns {string} CSS classes
 */
function getStatusClass(status) {
    return (
        {
            BOOKED:      'bg-blue-50 text-blue-700',
            COMPLETED:   'bg-emerald-50 text-emerald-700',
            CANCELLED:   'bg-red-50 text-red-600',
            ON_GOING:    'bg-emerald-50 text-emerald-700',
            NO_SHOW:     'bg-amber-50 text-amber-700',
            RESCHEDULED: 'bg-slate-100 text-slate-600',
        }[status] ?? 'bg-slate-100 text-slate-500'
    );
}

/**
 * Safely update text content of an element by ID
 * @param {string} id 
 * @param {string} value 
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
}

/**
 * Safely set value of an input element by ID
 * @param {string} id 
 * @param {string} value 
 */
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function buildClinicDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;

    const [hours = 0, minutes = 0] = String(timeStr)
        .split(':')
        .map((part) => Number(part) || 0);

    const safeDate = String(dateStr).slice(0, 10);
    return new Date(`${safeDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`);
}

// Bind global logout button event
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        deleteAllCookies();
        window.location.href = "/auth/login";
    });
});