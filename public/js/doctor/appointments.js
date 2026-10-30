/**
 * appointments.js
 * Handles all client-side logic for the doctor's Appointments page:
 *   - Zoom call management (start / end)
 *   - Appointment status updates (check-in, complete, no-show, cancel)
 *   - Dropdown toggle for action menus
 *   - Client-side date-range + status filtering
 *   - Real-time removal of expired appointment cards
 */

// ── Micro-interactions ────────────────────────────────────────────────────────
document.querySelectorAll('button, a').forEach(elem => {
    elem.addEventListener('mousedown', () => elem.classList.add('scale-95'));
    elem.addEventListener('mouseup',   () => elem.classList.remove('scale-95'));
    elem.addEventListener('mouseleave',() => elem.classList.remove('scale-95'));
});


// ── Zoom Call Controls ────────────────────────────────────────────────────────
async function startZoomCall(btn, appointmentId) {
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Starting...';
    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/video-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            window.open(result.meeting.startUrl, '_blank');
            window.location.reload();
        } else {
            alert('Failed to start Zoom call: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    } catch (error) {
        console.error('Error starting zoom call:', error);
        alert('An error occurred while starting Zoom call.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

async function endZoomCall(btn, appointmentId) {
    if (!confirm('Are you sure you want to end this video call?')) return;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Ending...';
    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/video-call/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            window.location.reload();
        } else {
            alert('Failed to end Zoom call: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    } catch (error) {
        console.error('Error ending zoom call:', error);
        alert('An error occurred while ending Zoom call.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}


// ── Action Dropdown ───────────────────────────────────────────────────────────
function toggleDropdown(event, dropdownId) {
    event.stopPropagation();
    // Close any other open dropdowns
    document.querySelectorAll('.appointment-dropdown-container div[id^="dropdown-"]').forEach(d => {
        if (d.id !== dropdownId) d.classList.add('hidden');
    });
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.toggle('hidden');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.appointment-dropdown-container')) {
        document.querySelectorAll('.appointment-dropdown-container div[id^="dropdown-"]')
            .forEach(d => d.classList.add('hidden'));
    }
});


// ── Status Update ─────────────────────────────────────────────────────────────
async function updateStatus(appointmentId, status, btn) {
    const container = btn.closest('.relative');
    const loaderBtn = container
        ? (container.querySelector('button:not([onclick*="toggleDropdown"])') || btn)
        : btn;
    const originalText = loaderBtn.innerHTML;

    let confirmMsg = '';
    if (status === 'CANCELLED') confirmMsg = 'Are you sure you want to cancel this appointment?';
    if (status === 'NO_SHOW')   confirmMsg = 'Are you sure you want to mark this patient as No Show?';
    if (confirmMsg && !confirm(confirmMsg)) return;

    loaderBtn.disabled = true;
    const actionLabel =
        status === 'ON_GOING'  ? 'Checking in...' :
        status === 'COMPLETED' ? 'Completing...'  : 'Updating...';
    loaderBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> ${actionLabel}`;

    try {
        const response = await fetch(`/doctor/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await response.json();
        if (result.success) {
            window.location.reload();
        } else {
            alert('Failed to update status: ' + result.message);
            loaderBtn.disabled = false;
            loaderBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('An error occurred while updating the status.');
        loaderBtn.disabled = false;
        loaderBtn.innerHTML = originalText;
    }
}


// ── Client-side Filtering ─────────────────────────────────────────────────────
let activeRange = 'today';

const filterRangeBtns  = document.querySelectorAll('.filter-range-btn');
const statusCheckboxes = document.querySelectorAll('.filter-status-cb');
const cards            = document.querySelectorAll('.appointment-card');
const emptyState       = document.getElementById('empty-state-container');
const countDisplay     = document.getElementById('appointments-count-display');

function getDateBounds(range) {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (range === 'today') {
        return { start: startOfToday.getTime(), end: endOfToday.getTime() };
    } else if (range === 'tomorrow') {
        const s = new Date(startOfToday); s.setDate(s.getDate() + 1);
        const e = new Date(endOfToday);   e.setDate(e.getDate() + 1);
        return { start: s.getTime(), end: e.getTime() };
    } else if (range === 'this-week') {
        const e = new Date(endOfToday); e.setDate(e.getDate() + 7);
        return { start: startOfToday.getTime(), end: e.getTime() };
    }
    return { start: 0, end: Infinity };
}

function applyFilters() {
    const bounds = getDateBounds(activeRange);

    const checkedStatuses = [];
    statusCheckboxes.forEach(cb => {
        if (cb.checked) {
            const v = cb.getAttribute('data-status-filter');
            checkedStatuses.push(v);
            if (v === 'Confirmed') checkedStatuses.push('RESCHEDULED');
        }
    });

    let visibleCount = 0;
    cards.forEach(card => {
        const cardTimeMs = parseInt(card.getAttribute('data-time-ms'), 10);
        const cardStatus = card.getAttribute('data-status');
        const matchesDate   = cardTimeMs >= bounds.start && cardTimeMs <= bounds.end;
        const matchesStatus = checkedStatuses.includes(cardStatus);

        if (matchesDate && matchesStatus) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (countDisplay) {
        countDisplay.textContent = `Showing ${visibleCount} appointments for your schedule.`;
    }
    if (emptyState) {
        emptyState.classList.toggle('hidden', visibleCount > 0);
    }
}

// Bind range buttons
filterRangeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        filterRangeBtns.forEach(b => {
            b.classList.remove('bg-primary-fixed', 'text-primary');
            b.classList.add('hover:bg-surface-container-high', 'text-on-surface');
        });
        btn.classList.remove('hover:bg-surface-container-high', 'text-on-surface');
        btn.classList.add('bg-primary-fixed', 'text-primary');
        activeRange = btn.getAttribute('data-range');
        applyFilters();
    });
});

// Bind checkboxes
statusCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

// Initial run
applyFilters();


// ── Real-time Expiry: auto-fade cards whose slot has passed ───────────────────
const ACTIONED_STATUSES_CLIENT = new Set(['ON_GOING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

function removeExpiredCards() {
    const nowMs = Date.now();
    cards.forEach(card => {
        const status = card.getAttribute('data-status');
        if (ACTIONED_STATUSES_CLIENT.has(status)) return;
        const endTimeMs = parseInt(card.getAttribute('data-end-time-ms'), 10);
        if (!isNaN(endTimeMs) && nowMs > endTimeMs && card.style.display !== 'none') {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity   = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.display = 'none';
                applyFilters();
            }, 650);
        }
    });
}

removeExpiredCards();
setInterval(removeExpiredCards, 60 * 1000);
