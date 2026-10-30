/**
 * Patient Appointments List & Booking Management Handlers
 */

function getQueryParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });
    return params;
}

function showError(msg) {
    const el = document.getElementById('errorBanner');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('errorBanner');
    if (el) el.classList.add('hidden');
}

function showSuccess(msg) {
    const el = document.getElementById('successBanner');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3000);
    }
}

let currentDate  = null;
let allAppointments = [];
let activeTab = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
    const query = getQueryParams();

    // Pre-fill date filter if explicitly requested via query params
    const dateInput = document.getElementById('dateFilter');
    if (dateInput && query.date) {
        dateInput.value = query.date;
    }

    // Tabs click handlers
    document.getElementById('tabAll')?.addEventListener('click', () => switchTab('ALL'));
    document.getElementById('tabUpcoming')?.addEventListener('click', () => switchTab('UPCOMING'));
    document.getElementById('tabPast')?.addEventListener('click', () => switchTab('PAST'));

    // Search and filters change handlers
    document.getElementById('searchInput')?.addEventListener('input', filterAndRender);
    document.getElementById('statusSelect')?.addEventListener('change', filterAndRender);
    document.getElementById('dateFilter')?.addEventListener('change', filterAndRender);

    // Reset button
    document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) statusSelect.value = 'ALL';
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) dateFilter.value = '';
        switchTab('ALL');
    });

    await loadAppointments();

    // Show success toast if redirected from payment page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('booked') === '1') {
        const successData = sessionStorage.getItem('bookingSuccess');
        if (successData) {
            try {
                const s = JSON.parse(successData);
                const refMsg = s.referenceNumber ? ` (Ref: ${s.referenceNumber})` : '';
                showSuccess(`Appointment booked successfully!${refMsg} Total paid: ₹${Number(s.totalAmount).toFixed(2)}`);
            } catch {
                showSuccess('Appointment booked successfully!');
            }
            sessionStorage.removeItem('bookingSuccess');
        } else {
            showSuccess('Appointment booked successfully!');
        }
        // Clean URL query parameters to prevent repeat triggers on refresh
        const cleanUrl = new URL(window.location);
        cleanUrl.searchParams.delete('booked');
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
    }

    // Wire reschedule form submit
    const rescheduleForm = document.getElementById('rescheduleForm');
    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const appointmentId        = document.getElementById('rescheduleAppointmentId')?.value;
            const appointmentDate      = document.getElementById('rescheduleDate')?.value;
            const appointmentStartTime = document.getElementById('rescheduleSelectedStartTime')?.value;

            if (!appointmentDate || !appointmentStartTime) {
                showError('Please select both a new date and time slot.');
                return;
            }

            let startDateTime;
            if (appointmentStartTime.includes('T') || appointmentStartTime.includes('Z')) {
                startDateTime = new Date(appointmentStartTime);
            } else {
                startDateTime = buildClinicDateTime(appointmentDate, appointmentStartTime);
            }

            const btn = rescheduleForm.querySelector('button[type="submit"]');
            const original = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Rescheduling...';

            try {
                const result = await apiFetch(`/appointment/appointments/reschedule`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        appointmentId:        appointmentId,
                        appointmentDate:      appointmentDate,
                        appointmentStartTime: startDateTime.toISOString(),
                    }),
                });

                if (!result || !result.ok) {
                    showError(result?.message || 'Failed to reschedule appointment');
                    closeRescheduleModal();
                    return;
                }

                closeRescheduleModal();
                showSuccess('Appointment rescheduled successfully.');
                await loadAppointments();

            } catch (err) {
                showError('Network error. Please try again.');
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = original;
            }
        });
    }

    const rescheduleDateInput = document.getElementById('rescheduleDate');
    if (rescheduleDateInput) {
        rescheduleDateInput.addEventListener('change', async () => {
            const date = rescheduleDateInput.value;
            const doctorId = document.getElementById('rescheduleDoctorId')?.value;
            const slotsSection = document.getElementById('rescheduleSlotsSection');
            const slotsLoading = document.getElementById('rescheduleSlotsLoading');
            const slotsEmpty = document.getElementById('rescheduleSlotsEmpty');
            const morningSection = document.getElementById('rescheduleMorningSection');
            const morningGrid = document.getElementById('rescheduleMorningSlotsGrid');
            const eveningSection = document.getElementById('rescheduleEveningSection');
            const eveningGrid = document.getElementById('rescheduleEveningSlotsGrid');
            const confirmBtn = document.getElementById('confirmRescheduleBtn');
            const selectedStartTimeInput = document.getElementById('rescheduleSelectedStartTime');

            if (!date || !doctorId) return;

            hideError();
            if (selectedStartTimeInput) selectedStartTimeInput.value = '';
            if (confirmBtn) confirmBtn.disabled = true;

            if (slotsSection) slotsSection.classList.remove('hidden');
            if (slotsLoading) slotsLoading.classList.remove('hidden');
            if (slotsEmpty) slotsEmpty.classList.add('hidden');
            if (morningSection) morningSection.classList.add('hidden');
            if (eveningSection) eveningSection.classList.add('hidden');
            if (morningGrid) morningGrid.innerHTML = '';
            if (eveningGrid) eveningGrid.innerHTML = '';

            try {
                const result = await apiFetch(`/patient/doctors/${doctorId}/slots?date=${date}`);

                if (slotsLoading) slotsLoading.classList.add('hidden');

                if (!result || !result.ok || !result.success) {
                    showError(result?.message || 'Failed to load slots.');
                    return;
                }

                const slots = result.data;
                if (!slots || slots.length === 0) {
                    if (slotsEmpty) slotsEmpty.classList.remove('hidden');
                    return;
                }

                // Filter out past slots timezone-safely
                const filteredSlots = slots.filter(slot => {
                    const slotDateTime = new Date(`${date}T${slot.startTime}:00Z`);
                    if (slot?.timezone === 'UTC') {
                        slotDateTime.setMinutes(slotDateTime.getMinutes() - 330);
                    }
                    return slotDateTime > new Date();
                });

                if (filteredSlots.length === 0) {
                    if (slotsEmpty) slotsEmpty.classList.remove('hidden');
                    return;
                }

                const renderSlotBtn = (slot) => {
                    const isAvailable = slot.status === 'AVAILABLE';
                    if (isAvailable) {
                        return `
                            <button
                                type="button"
                                data-start="${slot.startTime}"
                                onclick="selectRescheduleSlot(this, '${slot.startTime}')"
                                class="reschedule-slot-btn py-1.5 px-1 rounded-lg text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer shadow-sm"
                            >${slot.time}</button>
                        `;
                    } else {
                        return `
                            <button
                                type="button"
                                disabled
                                class="py-1.5 px-1 rounded-lg text-[10px] font-semibold border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-sm"
                            >${slot.time}</button>
                        `;
                    }
                };

                const morningSlots = filteredSlots.filter(slot => slot.period === 'MORNING');
                const eveningSlots = filteredSlots.filter(slot => slot.period === 'EVENING');

                const getPeriodTimingRange = (slotsList) => {
                    if (!slotsList || slotsList.length === 0) return '';
                    const startStr = slotsList[0].time;
                    const lastSlot = slotsList[slotsList.length - 1];
                    const [h, m] = lastSlot.startTime.split(':').map(Number);
                    // Default to 15 mins for rescheduling
                    const duration = 15;
                    
                    const slotEndDate = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
                    slotEndDate.setMinutes(slotEndDate.getMinutes() + duration);
                    
                    const endStr = slotEndDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }).toLowerCase();
                    
                    return `${startStr.toLowerCase()} - ${endStr}`;
                };

                const morningTiming = morningSlots.length > 0 ? getPeriodTimingRange(morningSlots) : '';
                const eveningTiming = eveningSlots.length > 0 ? getPeriodTimingRange(eveningSlots) : '';

                const morningLabel = document.getElementById('rescheduleMorningSlotLabel');
                const eveningLabel = document.getElementById('rescheduleEveningSlotLabel');

                if (morningLabel) {
                    morningLabel.textContent = morningTiming ? `Morning: ${morningTiming}` : 'Morning';
                }
                if (eveningLabel) {
                    eveningLabel.textContent = eveningTiming ? `Evening: ${eveningTiming}` : 'Evening';
                }

                if (morningSlots.length > 0) {
                    if (morningSection) morningSection.classList.remove('hidden');
                    if (morningGrid) morningGrid.innerHTML = morningSlots.map(renderSlotBtn).join('');
                }

                if (eveningSlots.length > 0) {
                    if (eveningSection) eveningSection.classList.remove('hidden');
                    if (eveningGrid) eveningGrid.innerHTML = eveningSlots.map(renderSlotBtn).join('');
                }

                if (morningSlots.length === 0 && eveningSlots.length === 0) {
                    if (slotsEmpty) slotsEmpty.classList.remove('hidden');
                }

            } catch (err) {
                if (slotsLoading) slotsLoading.classList.add('hidden');
                showError('Network error loading slots.');
                console.error(err);
            }
        });
    }
});

async function loadAppointments() {

    const token = getCookie('accessToken');
    if (!token) return;

    let userId;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
    } catch {
        showError('Invalid session. Please log in again.');
        return;
    }

    try {
        const result = await apiFetch(`/appointment/appointments?type=user&userId=${userId.toString()}`);

        if (!result || !result.ok || !result.success) {
            showError(result?.message || 'Failed to load appointments');
            return;
        }

        allAppointments = result.data || [];
        window.appointmentsList = allAppointments;
        filterAndRender();

    } catch (err) {
        showError('Network error — please check connection.');
        console.error(err);
    }
}

function switchTab(tab) {
    activeTab = tab;
    ['All', 'Upcoming', 'Past'].forEach(t => {
        const btn = document.getElementById(`tab${t}`);
        if (!btn) return;
        if (t.toUpperCase() === tab) {
            btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
            btn.classList.remove('text-slate-600', 'hover:text-slate-800');
        } else {
            btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
            btn.classList.add('text-slate-600', 'hover:text-slate-800');
        }
    });
    filterAndRender();
}

function filterAndRender() {
    const searchVal = document.getElementById('searchInput')?.value?.toLowerCase()?.trim() || '';
    const statusVal = document.getElementById('statusSelect')?.value || 'ALL';
    const dateVal   = document.getElementById('dateFilter')?.value || '';

    const now = new Date();

    const filtered = allAppointments.filter(appt => {
        const apptTime = new Date(appt.appointmentStartTime);
        const isUpcoming = apptTime >= now && appt.status !== 'CANCELLED';

        if (activeTab === 'UPCOMING' && !isUpcoming) return false;
        if (activeTab === 'PAST' && isUpcoming) return false;

        if (searchVal) {
            const docName = `${appt.doctor?.firstName || ''} ${appt.doctor?.lastName || ''}`.toLowerCase();
            const spec = (appt.doctor?.speciality?.[0]?.name || appt.doctor?.specialities?.[0] || '').toLowerCase();
            const hosp = (appt.hospital?.branchName || '').toLowerCase();

            const matchesSearch = docName.includes(searchVal) || spec.includes(searchVal) || hosp.includes(searchVal);
            if (!matchesSearch) return false;
        }

        if (statusVal !== 'ALL' && appt.status !== statusVal) {
            return false;
        }

        if (dateVal) {
            const apptDateStr = new Date(appt.appointmentDate).toISOString().split('T')[0];
            if (apptDateStr !== dateVal) return false;
        }

        return true;
    });

    renderAppointments(filtered);
}

function renderAppointments(appointments) {
    const tbody = document.getElementById('appointmentsBody');
    if (!tbody) return;

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-slate-400 text-sm">
                    <span class="material-symbols-outlined text-4xl block mb-2 opacity-40">event_busy</span>
                    No appointments found.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(appt => {
        const safeStartTime = (appt.appointmentStartTime || '').replace(' ', 'T');
        const apptTime = safeStartTime ? new Date(safeStartTime) : new Date(0);
        const now = new Date();
        
        // Calculate the difference in milliseconds
        const timeDiffMs = apptTime.getTime() - now.getTime();
        const fourHoursInMs = 4 * 60 * 60 * 1000;

        const isActive = appt.status === 'BOOKED' || appt.status === 'RESCHEDULED';
        const isPast = apptTime.getTime() <= now.getTime();
        let displayStatus = appt.status;
        if (isPast && ['BOOKED', 'RESCHEDULED'].includes(appt.status)) {
            displayStatus = 'COMPLETED';
        }
        
        // CANCEL: Only true if active AND more than 4 hours away
        const canCancel = isActive && (timeDiffMs > fourHoursInMs);

        // RESCHEDULE: same as above cancel thing
        const canReschedule = isActive && (timeDiffMs > fourHoursInMs);

        const doctorName   = appt.doctor
            ? `${appt.doctor.firstName || ''} ${appt.doctor.lastName || ''}`.trim() || '—'
            : '—';
        const speciality   = appt.doctor?.speciality?.[0]?.name || appt.doctor?.specialities?.[0] || '—';
        const hospitalName = appt.hospital?.branchName || '—';

        const date = safeStartTime
            ? new Date(safeStartTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const time = safeStartTime
            ? new Date(safeStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : '—';

        const typeCell = appt.type === 'ONLINE'
            ? `
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-0.5 mb-1">
                        <span class="material-symbols-outlined text-xs">video_call</span> Online
                    </span>
                    <div id="meeting-container-${appt.id}" class="mt-1">
                        ${['BOOKED', 'RESCHEDULED', 'ON_GOING', 'COMPLETED'].includes(appt.status)
                            ? '<span class="text-[10px] text-slate-400 italic">Checking link...</span>' 
                            : '<span class="text-slate-400 text-xs">—</span>'}
                    </div>
                </td>`
            : `
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-0.5">
                        <span class="material-symbols-outlined text-xs">person</span> In Person
                    </span>
                </td>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors" id="row-${appt.id}">
                <td class="px-6 py-4 text-sm text-slate-600">${date}</td>
                <td class="px-6 py-4 text-sm text-slate-600">${time}</td>
                <td class="px-6 py-4">
                    <p class="text-sm font-semibold text-slate-800">Dr. ${doctorName}</p>
                    <p class="text-xs text-slate-500">${speciality}</p>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">${hospitalName}</td>
                ${typeCell}
                <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusClass(displayStatus)}">
                        ${displayStatus.replace('_', ' ')}
                    </span>
                </td>
                <td class="px-6 py-4">
                    ${isActive && !isPast ? `
                        <div class="flex flex-col gap-1.5">
                            ${canCancel ? `
                                <button onclick="cancelAppointment('${appt.id}')"
                                    class="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium hover:bg-red-100 transition-colors shadow-sm cursor-pointer">
                                    Cancel
                                </button>
                            ` : `
                                <button disabled title="Cancellations are not allowed within 4 hours of the appointment"
                                    class="text-xs px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg font-medium cursor-not-allowed shadow-sm">
                                    Cancel
                                </button>
                            `}
                            
                            ${canReschedule ? `
                                <button onclick="openRescheduleModal('${appt.id}', '${appt.doctor?.id}')"
                                    class="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors shadow-sm cursor-pointer">
                                    Reschedule
                                </button>
                            ` : `<button disabled title="Rescheduling is not allowed within 4 hours of the appointment" onclick="openRescheduleModal('${appt.id}', '${appt.doctor?.id}')"
                                    class="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors shadow-sm cursor-not-allowed ">
                                    Reschedule
                                </button>`}
                        </div>
                    ` : ['COMPLETED', 'ON_GOING'].includes(displayStatus) ? `
                        <button onclick="openDetails('${appt.id}')"
                            class="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-medium hover:bg-blue-100 transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                            View Details
                        </button>
                    ` : '<span class="text-slate-400 text-sm">—</span>'}
                </td>
            </tr>
        `;
    }).join('');

    // Fetch meeting links asynchronously
    appointments.forEach(appt => {
        if (appt.type === 'ONLINE') {
            const container = document.getElementById(`meeting-container-${appt.id}`);
            if (!container) return;

            // Immediately mark completed ones as ended
            if (appt.status === 'COMPLETED') {
                container.innerHTML = `
                    <span class="inline-flex items-center gap-0.5 text-[10px] px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg font-bold cursor-not-allowed shadow-sm" title="This appointment has already ended">
                        <span class="material-symbols-outlined text-xs">videocam_off</span> Ended
                    </span>
                `;
                return;
            }

            if (['BOOKED', 'RESCHEDULED', 'ON_GOING'].includes(appt.status)) {
                const safeEndTime = (appt.appointmentEndTime || '').replace(' ', 'T');
                const timeToCompare = safeEndTime ? new Date(safeEndTime) : new Date(0);
                const now = new Date();
                const isPast = timeToCompare < now;

                if (isPast) {
                    container.innerHTML = `
                        <span class="inline-flex items-center gap-0.5 text-[10px] px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg font-bold cursor-not-allowed shadow-sm" title="This appointment has already ended">
                            <span class="material-symbols-outlined text-xs">videocam_off</span> Ended
                        </span>
                    `;
                    return;
                }

                apiFetch(`/meeting/${appt.id}`)
                    .then(result => {
                        if (result && result.success && result.data) {
                            container.innerHTML = `
                                <a href="${result.data}" target="_blank"
                                   class="inline-flex items-center gap-0.5 text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer">
                                    <span class="material-symbols-outlined text-xs">video_call</span> Join Meeting
                                </a>
                            `;
                        } else {
                            container.innerHTML = `
                                <span class="text-[10px] text-slate-400 font-medium italic">Link available 5m before</span>
                            `;
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching meeting link:", err);
                        container.innerHTML = `
                            <span class="text-[10px] text-slate-400 font-medium italic">Link available 5m before</span>
                        `;
                    });
            }
        }
    });
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    hideError();

    try {
        const result = await apiFetch(`/appointment/appointments`, {
            method: 'DELETE',
            body: JSON.stringify({ appointmentId }),
        });

        if (!result || !result.ok) {
            showError(result?.message || 'Failed to cancel appointment');
            return;
        }

        showSuccess('Appointment cancelled successfully.');
        await loadAppointments();

    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
    }
}

function openRescheduleModal(appointmentId, doctorId) {
    const modal = document.getElementById('rescheduleModal');
    const apptIdInput = document.getElementById('rescheduleAppointmentId');
    const docIdInput = document.getElementById('rescheduleDoctorId');
    const dateInput = document.getElementById('rescheduleDate');
    const timeInput = document.getElementById('rescheduleSelectedStartTime');
    const slotsSection = document.getElementById('rescheduleSlotsSection');
    const confirmBtn = document.getElementById('confirmRescheduleBtn');

    if (modal) modal.style.display = 'flex';
    if (apptIdInput) apptIdInput.value = appointmentId;
    if (docIdInput) docIdInput.value = doctorId;
    if (dateInput) {
        dateInput.value = '';
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }
    if (timeInput) timeInput.value = '';
    if (slotsSection) slotsSection.classList.add('hidden');
    if (confirmBtn) confirmBtn.disabled = true;
}

function closeRescheduleModal() {
    const modal = document.getElementById('rescheduleModal');
    if (modal) modal.style.display = 'none';
}

function selectRescheduleSlot(btn, startTime) {
    document.querySelectorAll('.reschedule-slot-btn.selected').forEach(b => {
        b.classList.remove('selected', 'bg-primary', 'text-white', 'border-primary', 'hover:bg-primary/90');
        b.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'hover:bg-emerald-100');
    });

    btn.classList.add('selected', 'bg-primary', 'text-white', 'border-primary', 'hover:bg-primary/90');
    btn.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'hover:bg-emerald-100');

    const timeInput = document.getElementById('rescheduleSelectedStartTime');
    if (timeInput) timeInput.value = startTime;

    const confirmBtn = document.getElementById('confirmRescheduleBtn');
    if (confirmBtn) confirmBtn.disabled = false;
}

// Global hooks
window.cancelAppointment      = cancelAppointment;
window.openRescheduleModal    = openRescheduleModal;
window.closeRescheduleModal   = closeRescheduleModal;
window.selectRescheduleSlot   = selectRescheduleSlot;
