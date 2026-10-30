// ================================================================
// SIDEBAR TOGGLE (mobile)
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

// ================================================================
// TAB NAVIGATION
// ================================================================
const TAB_IDS = ['dashboard', 'appointments', 'patients', 'calendar'];

function switchTab(tabId) {
    // Hide all sections
    TAB_IDS.forEach(id => {
        document.getElementById('tab-' + id)?.classList.remove('active');
        const navBtn = document.getElementById('nav-' + id);
        if (navBtn) {
            navBtn.className = 'nav-link-inactive w-full text-left';
        }
    });

    // Show selected section
    document.getElementById('tab-' + tabId)?.classList.add('active');
    const activeBtn = document.getElementById('nav-' + tabId);
    if (activeBtn) {
        activeBtn.className = 'nav-link-active w-full text-left';
    }

    // On mobile, close sidebar
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('mobile-overlay').classList.add('hidden');
    }

    // Tab-specific initialization
    if (tabId === 'calendar') initCalendar();
    if (tabId === 'appointments') {
        // Auto-load today's appointments when switching to tab
        loadAppointments();
    }
}

// ================================================================
// TOAST NOTIFICATION SYSTEM
// ================================================================
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    msgEl.textContent = message;
    toast.className = `fixed top-4 right-4 z-[9999] px-5 py-3 rounded-xl text-white font-medium shadow-xl transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-secondary'}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => { toast.classList.add('hidden'); toast.classList.remove('opacity-0'); }, 300);
    }, 3000);
}

// ================================================================
// APPOINTMENTS TAB — Load & Render
// ================================================================
async function loadAppointments() {
    const date     = document.getElementById('apptFilterDate')?.value || '';
    const doctorId = document.getElementById('apptFilterDoctor')?.value || '';
    const status   = document.getElementById('apptFilterStatus')?.value || '';

    const spinner = document.getElementById('apptLoadingSpinner');
    const tbody   = document.getElementById('apptTableBody');
    const countEl = document.getElementById('apptResultCount');

    spinner?.classList.remove('hidden');
    tbody.innerHTML = `<tr><td colspan="6" class="p-lg text-center"><div class="flex justify-center"><div class="spinner"></div></div></td></tr>`;

    const params = new URLSearchParams();
    if (date)     params.set('date', date);
    if (doctorId) params.set('doctorId', doctorId);
    if (status)   params.set('status', status);

    try {
        const res  = await fetch(`/staff/dashboard/appointments?${params.toString()}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Failed to load');

        const appts = data.data || [];
        countEl.textContent = `(${appts.length} found)`;

        if (appts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-lg text-center"><div class="flex flex-col items-center gap-2 text-on-surface-variant"><span class="material-symbols-outlined text-[40px] opacity-40">event_busy</span><p class="text-sm font-medium">No appointments found for the selected filters</p></div></td></tr>`;
        } else {
            tbody.innerHTML = appts.map(appt => {
                const patientName = (appt.patient && appt.patient.firstName)
                    ? `${appt.patient.firstName} ${appt.patient.lastName || ''}`
                    : 'Unknown Patient';
                const patientContact = (appt.patient && appt.patient.mobile)
                    ? appt.patient.mobile
                    : (appt.patientId ? '#' + String(appt.patientId).slice(-6) : '—');
                const doctorName = appt.doctor
                    ? `Dr. ${appt.doctor.firstName || ''} ${appt.doctor.lastName || ''}`.trim()
                    : 'Unknown';
                const speciality = (appt.doctor && appt.doctor.specialities) ? appt.doctor.specialities : '';
                const startTime  = appt.appointmentStartTime
                    ? new Date(appt.appointmentStartTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                    : '—';
                const apptDate   = appt.appointmentStartTime
                    ? new Date(appt.appointmentStartTime).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
                    : '—';
                const statusBadge = {
                    BOOKED:    '<span class="badge-booked">BOOKED</span>',
                    CANCELLED: '<span class="badge-cancelled">CANCELLED</span>',
                    COMPLETED: '<span class="badge-completed">COMPLETED</span>',
                }[appt.status] || `<span class="badge-default">${appt.status || 'UNKNOWN'}</span>`;
                const payStatus = appt.payment?.paymentStatus;
                const payBadge = {
                    SUCCESS: '<span class="pay-success">Paid</span>',
                    PENDING: '<span class="pay-pending">Pending</span>',
                    FAILED:  '<span class="pay-failed">Failed</span>',
                }[payStatus] || '<span class="badge-default">—</span>';

                return `<tr class="hover:bg-surface-container/50 transition-colors">
                    <td class="p-md">
                        <p class="font-semibold text-sm text-on-surface">${patientName}</p>
                        <p class="text-xs text-on-surface-variant mt-0.5">${patientContact}</p>
                    </td>
                    <td class="p-md">
                        <p class="text-sm font-medium text-on-surface">${doctorName}</p>
                        ${speciality ? `<p class="text-xs text-on-surface-variant">${speciality}</p>` : ''}
                    </td>
                    <td class="p-md">
                        <p class="text-sm font-bold text-primary">${startTime}</p>
                        <p class="text-xs text-on-surface-variant">${apptDate}</p>
                    </td>
                    <td class="p-md">${statusBadge}</td>
                    <td class="p-md">${payBadge}</td>
                    <td class="p-md">
                        <button class="p-1.5 hover:bg-surface-container rounded-lg transition-all text-primary" title="View">
                            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-error text-sm">${err.message}</td></tr>`;
        countEl.textContent = '';
    } finally {
        spinner?.classList.add('hidden');
    }
}

// Also load on Enter key in date field
document.getElementById('apptFilterDate')?.addEventListener('keydown', e => { if (e.key === 'Enter') loadAppointments(); });

// ================================================================
// PATIENTS TAB — Search & Render
// ================================================================
async function searchPatients() {
    const q = document.getElementById('patientTabSearch')?.value?.trim() || '';
    if (q.length < 2) { showToast('Enter at least 2 characters to search', true); return; }

    const spinner  = document.getElementById('patientLoadingSpinner');
    const results  = document.getElementById('patientResults');
    const countEl  = document.getElementById('patientResultCount');

    spinner?.classList.remove('hidden');
    results.innerHTML = `<div class="flex justify-center p-lg"><div class="spinner"></div></div>`;

    try {
        const res  = await fetch(`/staff/dashboard/search-patients?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Search failed');

        const patients = data.data || [];
        countEl.textContent = `(${patients.length} found)`;

        if (patients.length === 0) {
            results.innerHTML = `<div class="p-lg text-center flex flex-col items-center gap-2 text-on-surface-variant opacity-60">
                <span class="material-symbols-outlined text-[40px]">person_off</span>
                <p class="text-sm font-medium">No patients found for "${q}"</p>
                <button onclick="openRegisterPatientModal()" class="mt-2 text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">person_add</span> Register as new patient
                </button>
            </div>`;
        } else {
            results.innerHTML = `<div class="divide-y divide-outline-variant/30">
                ${patients.map(p => `
                    <div class="flex items-center justify-between p-md hover:bg-surface-container/50 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-primary text-[18px]">person</span>
                            </div>
                            <div>
                                <p class="font-semibold text-sm text-on-surface">${p.firstName || ''} ${p.lastName || ''}</p>
                                <p class="text-xs text-on-surface-variant">
                                    ${p.mobile ? `<span class="mr-3"><span class="material-symbols-outlined text-[12px] align-middle">phone</span> ${p.mobile}</span>` : ''}
                                    ${p.email ? `<span><span class="material-symbols-outlined text-[12px] align-middle">mail</span> ${p.email}</span>` : ''}
                                </p>
                                ${p.gender || p.bloodGroup ? `<p class="text-xs text-on-surface-variant mt-0.5">${[p.gender, p.bloodGroup].filter(Boolean).join(' · ')}</p>` : ''}
                            </div>
                        </div>
                        <button onclick="bookForPatient('${p.id}', '${(p.firstName || '') + ' ' + (p.lastName || '')}')"
                            class="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/90 transition-all">
                            <span class="material-symbols-outlined text-[14px]">add</span> Book
                        </button>
                    </div>
                `).join('')}
            </div>`;
        }
    } catch (err) {
        results.innerHTML = `<div class="p-lg text-center text-error text-sm">${err.message}</div>`;
        countEl.textContent = '';
    } finally {
        spinner?.classList.add('hidden');
    }
}

// Search on Enter key
document.getElementById('patientTabSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchPatients(); });
// Topbar search → switch to patients tab
document.getElementById('topbarSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
        switchTab('patients');
        document.getElementById('patientTabSearch').value = e.target.value.trim();
        searchPatients();
    }
});

function bookForPatient(patientId, patientName) {
    window.booking = window.booking || {};
    window.booking.patient = { id: patientId, fullName: patientName.trim() };
    openBookingModal();
    // Pre-fill patient and skip to step 2
    setTimeout(() => {
        if (window.booking.patient) {
            document.getElementById('selectedPatientName').textContent = window.booking.patient.fullName;
            document.getElementById('selectedPatientCard').classList.remove('hidden');
            window.goToStep(2);
        }
    }, 100);
}

// ================================================================
// CALENDAR TAB
// ================================================================
let calYear, calMonth;

function initCalendar() {
    const now = new Date();
    calYear  = calYear  || now.getFullYear();
    calMonth = calMonth || now.getMonth();
    renderCalendar();
}

function changeMonth(delta) {
    calMonth += delta;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0)  { calMonth = 11; calYear--; }
    renderCalendar();
}

function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calMonthLabel').textContent = `${monthNames[calMonth]} ${calYear}`;

    const grid = document.getElementById('calGrid');
    const today = new Date();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

    // Load today's appointments into a quick-access map
    const apptMap = {};
    (window.dashboardAppointments || []).forEach(function(appt) {
        if (appt.appointmentStartTime) {
            const d = new Date(appt.appointmentStartTime).getDate();
            const m = new Date(appt.appointmentStartTime).getMonth();
            const y = new Date(appt.appointmentStartTime).getFullYear();
            const key = `${y}-${m}-${d}`;
            if (!apptMap[key]) apptMap[key] = [];
            apptMap[key].push({
                patient: (appt.patient && appt.patient.firstName) ? (appt.patient.firstName + " " + (appt.patient.lastName || "")) : "Unknown",
                time: appt.appointmentStartTime ? new Date(appt.appointmentStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                status: appt.status || ""
            });
        }
    });

    let cells = '';
    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrev - i;
        cells += `<div class="cal-cell other-month p-1.5 border border-slate-100 rounded-lg">
            <span class="text-xs text-slate-400">${day}</span>
        </div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = (d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear());
        const key = `${calYear}-${calMonth}-${d}`;
        const dayAppts = apptMap[key] || [];
        const hasAppts = dayAppts.length > 0;

        if (isToday) {
            cells += `<div class="cal-cell today border border-[#002868]/30 rounded-lg cursor-pointer" onclick="showCalDayDetail(${d}, ${calMonth}, ${calYear})">
                <div class="flex justify-between items-start">
                    <span class="text-xs font-bold">${d}</span>
                    ${hasAppts ? `<span class="text-[10px] font-bold bg-white/20 rounded-full px-1.5 py-0.5">${dayAppts.length}</span>` : ''}
                </div>
                ${dayAppts.slice(0,2).map(a => `<p class="text-[10px] mt-1 bg-white/20 rounded px-1 truncate">${a.time} ${a.patient}</p>`).join('')}
                ${dayAppts.length > 2 ? `<p class="text-[10px] opacity-75 mt-0.5">+${dayAppts.length - 2} more</p>` : ''}
            </div>`;
        } else {
            cells += `<div class="cal-cell border border-slate-100 rounded-lg ${hasAppts ? 'cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors' : ''}" onclick="${hasAppts ? `showCalDayDetail(${d}, ${calMonth}, ${calYear})` : ''}">
                <div class="flex justify-between items-start">
                    <span class="text-xs font-semibold text-on-surface">${d}</span>
                    ${hasAppts ? `<span class="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">${dayAppts.length}</span>` : ''}
                </div>
                ${dayAppts.slice(0,2).map(a => `<p class="text-[10px] mt-1 bg-primary/8 text-primary rounded px-1 truncate">${a.time} ${a.patient}</p>`).join('')}
                ${dayAppts.length > 2 ? `<p class="text-[10px] text-on-surface-variant mt-0.5">+${dayAppts.length - 2} more</p>` : ''}
            </div>`;
        }
    }

    // Next month padding to fill 6 rows
    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remaining; i++) {
        cells += `<div class="cal-cell other-month p-1.5 border border-slate-100 rounded-lg">
            <span class="text-xs text-slate-400">${i}</span>
        </div>`;
    }

    grid.innerHTML = `<div class="cal-grid gap-1">${cells}</div>`;
}

function showCalDayDetail(day, month, year) {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const detail = document.getElementById('calDayDetail');
    const title  = document.getElementById('calDayDetailTitle');
    const body   = document.getElementById('calDayDetailBody');

    title.textContent = `${monthNames[month]} ${day}, ${year}`;
    body.innerHTML = `<p class="text-sm text-on-surface-variant">Loading appointments for this date...</p>`;
    detail.classList.remove('hidden');

    // Fetch appointments for the clicked date
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    fetch(`/staff/dashboard/appointments?date=${dateStr}`)
        .then(r => r.json())
        .then(data => {
            const appts = data.data || [];
            if (appts.length === 0) {
                body.innerHTML = `<p class="text-sm text-on-surface-variant text-center py-4">No appointments on this day.</p>`;
            } else {
                body.innerHTML = `<div class="space-y-2">
                    ${appts.map(a => {
                        const name = (a.patient && a.patient.firstName)
                            ? `${a.patient.firstName} ${a.patient.lastName || ''}`
                            : 'Unknown';
                        const time = a.appointmentStartTime
                            ? new Date(a.appointmentStartTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                            : '—';
                        const doc  = a.doctor ? `Dr. ${a.doctor.firstName || ''} ${a.doctor.lastName || ''}` : '—';
                        const badge = {
                            BOOKED:    '<span class="badge-booked">BOOKED</span>',
                            CANCELLED: '<span class="badge-cancelled">CANCELLED</span>',
                            COMPLETED: '<span class="badge-completed">COMPLETED</span>',
                        }[a.status] || `<span class="badge-default">${a.status || ''}</span>`;
                        return `<div class="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2.5">
                            <div>
                                <p class="text-sm font-semibold text-on-surface">${name}</p>
                                <p class="text-xs text-on-surface-variant">${doc} · ${time}</p>
                            </div>
                            ${badge}
                        </div>`;
                    }).join('')}
                </div>`;
            }
        })
        .catch(() => {
            body.innerHTML = `<p class="text-sm text-error text-center py-4">Failed to load appointments.</p>`;
        });

    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ================================================================
// PATIENT REGISTRATION MODAL
// ================================================================
const regModal = document.getElementById('registerPatientModal');
const regForm  = document.getElementById('registerPatientForm');

window.openRegisterPatientModal = () => regModal?.classList.remove('hidden');
window.closeRegisterPatientModal = () => { regModal?.classList.add('hidden'); regForm?.reset(); };

document.getElementById('openRegisterPatientBtn')?.addEventListener('click', window.openRegisterPatientModal);
document.getElementById('closeRegisterPatientModal')?.addEventListener('click', window.closeRegisterPatientModal);

regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('registerPatientBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    const payload = {
        firstName:   document.getElementById('rpFirstName').value,
        middleName:  document.getElementById('rpMiddleName').value,
        lastName:    document.getElementById('rpLastName').value,
        email:       document.getElementById('rpEmail').value,
        mobile:      document.getElementById('rpMobile').value,
        password:    document.getElementById('rpPassword').value,
        gender:      document.getElementById('rpGender').value,
        dateOfBirth: document.getElementById('rpDob').value,
        bloodGroup:  document.getElementById('rpBloodGroup').value,
    };

    try {
        const res  = await fetch('/staff/dashboard/register-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Patient ${data.data.firstName} registered successfully!`);
            window.closeRegisterPatientModal();
            if (window.booking && window.booking.currentStep === 1) {
                window.booking.patient = { id: data.data.id, fullName: `${data.data.firstName} ${data.data.lastName}`, mobile: data.data.mobile };
                window.updatePatientSelectionUI?.();
            }
        } else {
            showToast(data.message || "Registration failed", true);
        }
    } catch {
        showToast("An error occurred", true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Patient";
    }
});

// ================================================================
// FOUR-STEP BOOKING WIZARD
// ================================================================
const bookModal  = document.getElementById('bookingModal');
const prevBtn    = document.getElementById('prevStepBtn');
const nextBtn    = document.getElementById('nextStepBtn');
const confirmBtn = document.getElementById('confirmBookingBtn');

window.booking = { patient: null, doctor: null, date: null, slot: null, currentStep: 1 };

// Set minimum date constraint
const dateInput = document.getElementById('appointmentDate');
if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

window.openBookingModal = () => {
    bookModal?.classList.remove('hidden');
    window.goToStep(1);
};

document.getElementById('openBookingModalBtn')?.addEventListener('click', window.openBookingModal);
document.getElementById('openBookingModalBtn2')?.addEventListener('click', window.openBookingModal);

document.getElementById('closeBookingModal')?.addEventListener('click', () => {
    bookModal?.classList.add('hidden');
    window.booking = { patient: null, doctor: null, date: null, slot: null, currentStep: 1 };
    document.getElementById('patientSearchInput').value = '';
    document.getElementById('patientSearchResults').innerHTML = '';
    document.getElementById('selectedPatientCard').classList.add('hidden');
});

window.goToStep = (step) => {
    if (step === 2 && !window.booking.patient) return showToast("Select a patient first.", true);
    if (step === 3 && (!window.booking.doctor || !window.booking.date)) return showToast("Select doctor and date.", true);
    if (step === 4 && !window.booking.slot) return showToast("Select a time slot.", true);

    window.booking.currentStep = step;
    [1, 2, 3, 4].forEach(i => {
        document.getElementById(`step${i}`).classList.toggle('hidden', i !== step);
        const dot   = document.getElementById(`stepDot${i}`);
        const label = document.getElementById(`stepLabel${i}`);
        if (i < step) {
            dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-secondary text-white";
            dot.innerHTML = "✓";
            label.className = "text-xs font-medium text-secondary";
        } else if (i === step) {
            dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white";
            dot.innerHTML = i;
            label.className = "text-xs font-medium text-primary";
        } else {
            dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-outline-variant text-on-surface-variant";
            dot.innerHTML = i;
            label.className = "text-xs font-medium text-on-surface-variant";
        }
    });

    prevBtn.classList.toggle('hidden', step === 1);
    if (step === 4) {
        nextBtn.classList.add('hidden');
        confirmBtn.classList.remove('hidden');
        // Update summary
        document.getElementById('summaryPatient').textContent = window.booking.patient?.fullName || '—';
        document.getElementById('summaryDoctor').textContent  = window.booking.doctor?.fullName  || '—';
        if (window.booking.slot) {
            const fmt = iso => new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
            document.getElementById('summarySlot').textContent = `${fmt(window.booking.slot.startTime)} – ${fmt(window.booking.slot.endTime)}`;
        }
    } else {
        nextBtn.classList.remove('hidden');
        confirmBtn.classList.add('hidden');
    }

    if (step === 3) fetchAndRenderSlots();
};

prevBtn?.addEventListener('click', () => window.goToStep(window.booking.currentStep - 1));
nextBtn?.addEventListener('click', () => {
    if (window.booking.currentStep === 2) {
        const docSel = document.getElementById('doctorSelect');
        const dateEl = document.getElementById('appointmentDate');
        if (!docSel.value || !dateEl.value) return showToast("Select Doctor and Date", true);
        window.booking.doctor = { id: docSel.value, fullName: docSel.options[docSel.selectedIndex].text };
        window.booking.date   = dateEl.value;
    }
    window.goToStep(window.booking.currentStep + 1);
});

// Step 1: Live Patient Search
let searchTimeout;
document.getElementById('patientSearchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const resultsContainer = document.getElementById('patientSearchResults');
    const q = e.target.value.trim();
    if (q.length < 2) { resultsContainer.innerHTML = ''; return; }

    searchTimeout = setTimeout(async () => {
        resultsContainer.innerHTML = '<p class="p-3 text-sm text-outline">Searching...</p>';
        try {
            const res  = await fetch(`/staff/dashboard/search-patients?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            resultsContainer.innerHTML = '';
            if (data.success && data.data.length > 0) {
                data.data.forEach(p => {
                    const div = document.createElement('div');
                    div.className = "p-3 border-b border-outline-variant/30 hover:bg-surface-container cursor-pointer";
                    div.innerHTML = `<p class="font-semibold text-sm">${p.firstName} ${p.lastName || ''}</p><p class="text-xs text-outline">${p.mobile || p.email || ''}</p>`;
                    div.onclick = () => {
                        window.booking.patient = { id: p.id, fullName: `${p.firstName} ${p.lastName || ''}`.trim(), mobile: p.mobile, email: p.email };
                        window.updatePatientSelectionUI();
                        resultsContainer.innerHTML = '';
                    };
                    div.appendChild(div);
                });
            } else {
                resultsContainer.innerHTML = '<p class="p-3 text-sm text-outline">No patients found.</p>';
            }
        } catch { resultsContainer.innerHTML = ''; }
    }, 300);
});

window.updatePatientSelectionUI = () => {
    if (window.booking.patient) {
        document.getElementById('selectedPatientName').textContent   = window.booking.patient.fullName;
        document.getElementById('selectedPatientMobile').textContent = window.booking.patient.mobile || '';
        document.getElementById('selectedPatientEmail').textContent  = window.booking.patient.email  || '';
        document.getElementById('selectedPatientCard').classList.remove('hidden');
        document.getElementById('patientSearchInput').value = '';
    }
};

document.getElementById('clearPatientBtn')?.addEventListener('click', () => {
    window.booking.patient = null;
    document.getElementById('selectedPatientCard').classList.add('hidden');
});

// Step 3: Fetch Available Slots
const fetchAndRenderSlots = async () => {
    const slotsSummary = document.getElementById('slotsSummary');
    const morningSection = document.getElementById('morningSlotSection');
    const morningGrid = document.getElementById('morningSlotsGrid');
    const eveningSection = document.getElementById('eveningSlotSection');
    const eveningGrid = document.getElementById('eveningSlotsGrid');

    slotsSummary.textContent = '';
    morningSection.classList.add('hidden');
    eveningSection.classList.add('hidden');
    morningGrid.innerHTML = '';
    eveningGrid.innerHTML = '';

    const container = document.getElementById('slotsContainer');
    const loadingEl = document.createElement('p');
    loadingEl.className = 'text-sm text-outline flex items-center gap-2';
    loadingEl.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Loading schedule...';
    container.insertBefore(loadingEl, morningSection);

    try {
        const res  = await fetch(`/staff/dashboard/slots?doctorId=${window.booking.doctor.id}&date=${window.booking.date}`);
        const data = await res.json();
        loadingEl.remove();

        if (data.success && data.data.isAvailable) {
            slotsSummary.textContent = `Showing available slots for ${window.booking.doctor.fullName} on ${new Date(window.booking.date + 'T00:00:00').toDateString()}`;
            
            // Filter out past slots if booking for today
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const localTodayStr = `${y}-${m}-${d}`;
            const isToday = (window.booking.date === localTodayStr);

            const filteredSlots = data.data.slots.filter(slot => {
                if (isToday) {
                    return new Date(slot.startTime) > now;
                }
                return true;
            });

            if (filteredSlots.length === 0) {
                slotsSummary.textContent = '';
                const emptyEl = document.createElement('p');
                emptyEl.className = 'text-sm text-on-surface-variant';
                emptyEl.textContent = 'No slots available after the current time on this date.';
                morningGrid.parentElement.parentElement.insertBefore(emptyEl, morningSection);
                return;
            }

            // Group slots into morning (hour < 12) and evening (hour >= 12)
            const morningSlots = [];
            const eveningSlots = [];

            filteredSlots.forEach(slot => {
                const slotDate = new Date(slot.startTime);
                const hour = slotDate.getHours();
                if (hour < 12) {
                    morningSlots.push(slot);
                } else {
                    eveningSlots.push(slot);
                }
            });

            const getPeriodTimingRange = (slotsList) => {
                if (!slotsList || slotsList.length === 0) return '';
                const formatTime = (isoStr) => {
                    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
                };
                const startStr = formatTime(slotsList[0].startTime);
                const endStr = formatTime(slotsList[slotsList.length - 1].endTime);
                return `${startStr} - ${endStr}`;
            };

            const morningTiming = morningSlots.length > 0 ? getPeriodTimingRange(morningSlots) : '';
            const eveningTiming = eveningSlots.length > 0 ? getPeriodTimingRange(eveningSlots) : '';

            const morningLabel = document.getElementById('morningSlotLabel');
            const eveningLabel = document.getElementById('eveningSlotLabel');

            if (morningLabel) {
                morningLabel.textContent = morningTiming ? `Morning: ${morningTiming}` : 'Morning Slots';
            }
            if (eveningLabel) {
                eveningLabel.textContent = eveningTiming ? `Evening: ${eveningTiming}` : 'Evening Slots';
            }

            const createSlotBtn = (slot) => {
                const btn = document.createElement('button');
                const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                btn.textContent = timeStr;
                
                if (slot.isBooked) {
                    btn.className = "py-2 px-1 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-sm";
                    btn.disabled = true;
                } else {
                    btn.className = "slot-btn py-2 px-1 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer shadow-sm transition-all";
                    btn.onclick = (e) => {
                        document.querySelectorAll('#slotsContainer button').forEach(b => {
                            if (!b.disabled) {
                                b.classList.remove('bg-primary', 'text-white', 'border-primary');
                                b.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
                            }
                        });
                        btn.classList.add('bg-primary', 'text-white', 'border-primary');
                        btn.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
                        window.booking.slot = { startTime: slot.startTime, endTime: slot.endTime };
                    };
                }
                return btn;
            };

            if (morningSlots.length > 0) {
                morningSection.classList.remove('hidden');
                morningSlots.forEach(s => morningGrid.appendChild(createSlotBtn(s)));
            }

            if (eveningSlots.length > 0) {
                eveningSection.classList.remove('hidden');
                eveningSlots.forEach(s => eveningGrid.appendChild(createSlotBtn(s)));
            }

        } else {
            slotsSummary.textContent = '';
            const errEl = document.createElement('p');
            errEl.className = 'text-sm text-error';
            errEl.textContent = data.data?.reason || 'Doctor is not available on this date.';
            morningGrid.parentElement.parentElement.insertBefore(errEl, morningSection);
        }
    } catch (err) {
        loadingEl.remove();
        const errEl = document.createElement('p');
        errEl.className = 'text-sm text-error';
        errEl.textContent = 'Failed to load slots. Please try again.';
        morningGrid.parentElement.parentElement.insertBefore(errEl, morningSection);
        console.error(err);
    }
};

// Step 4: Auto-calculate total
const feesInput  = document.getElementById('consultationFees');
const taxInput   = document.getElementById('taxCharges');
const totalInput = document.getElementById('totalAmount');

const calculateTotal = () => {
    const fees = parseFloat(feesInput.value) || 0;
    const tax  = parseFloat(taxInput.value)  || 0;
    totalInput.value = (fees + tax).toFixed(2);
};
feesInput?.addEventListener('input', calculateTotal);
taxInput?.addEventListener('input', calculateTotal);

// Show/hide payment method fields
document.getElementById('paymentType')?.addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('transactionIdRow').classList.toggle('hidden', !['CARD','UPI','NET_BANKING'].includes(val));
    document.getElementById('cardNumberRow').classList.toggle('hidden', val !== 'CARD');
    document.getElementById('upiIdRow').classList.toggle('hidden', val !== 'UPI');
});

// Step 4: Confirm booking
confirmBtn?.addEventListener('click', async () => {
    if (!feesInput.value || parseFloat(feesInput.value) <= 0) return showToast("Enter consultation fees.", true);
    if (!document.getElementById('paidBy').value) return showToast("Enter who paid.", true);
    if (!document.getElementById('paymentType').value) return showToast("Select payment mode.", true);
    if (!document.getElementById('paymentStatus').value) return showToast("Select payment status.", true);

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    const payload = {
        doctorId:        window.booking.doctor.id,
        patientId:       window.booking.patient.id,
        appointmentTime: window.booking.slot.startTime,
        consultationFees: parseFloat(feesInput.value) || 0,
        taxRate:    0,
        taxCharges: parseFloat(taxInput.value) || 0,
        totalAmount: parseFloat(totalInput.value) || 0,
        paidBy:      document.getElementById('paidBy').value,
        paymentType: document.getElementById('paymentType').value,
        paymentStatus: document.getElementById('paymentStatus').value,
        transactionId: document.getElementById('transactionId')?.value || null,
        cardNumber: document.getElementById('cardNumber')?.value || null,
        upiId: document.getElementById('upiId')?.value || null,
    };

    try {
        const res  = await fetch('/staff/dashboard/book-appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            showToast("Appointment Booked Successfully!");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(data.message || "Booking failed", true);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm & Book";
        }
    } catch {
        showToast("Network error. Please try again.", true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm & Book";
    }
});
