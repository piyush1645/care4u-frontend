// Include minimal logic to load appointments via API
async function loadAppointments() {
    const date = document.getElementById('apptFilterDate').value;
    const doctorId = document.getElementById('apptFilterDoctor').value;
    const status = document.getElementById('apptFilterStatus').value;

    const spinner = document.getElementById('apptLoadingSpinner');
    const tbody = document.getElementById('apptTableBody');
    const countSpan = document.getElementById('apptResultCount');

    spinner.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="6" class="p-lg text-center text-on-surface-variant text-sm">Loading...</td></tr>';
    
    try {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (doctorId) params.append('doctorId', doctorId);
        if (status) params.append('status', status);

        const response = await fetch(`/staff/dashboard/appointments?${params.toString()}`);
        const result = await response.json();
        
        console.log('Appointments fetched:', result); // DEBUG
        
        if (result.success && result.data) {
            const appts = result.data;
            countSpan.textContent = `(${appts.length})`;
            
            if (appts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-lg text-center text-on-surface-variant text-sm">No appointments found matching filters.</td></tr>';
            } else {
                let html = '';
                appts.forEach(appt => {
                    // Backend returns: patient.fullName, doctor.fullName, startTime, billing.paymentStatus
                    const patName = (appt.patient && appt.patient.fullName) ? appt.patient.fullName : 'Unknown Patient';
                    const patMobile = (appt.patient && appt.patient.mobile) ? appt.patient.mobile : `ID: #${appt.patientId ? String(appt.patientId).slice(-8) : 'N/A'}`;
                    const docName = (appt.doctor && appt.doctor.fullName) ? appt.doctor.fullName : 'Unknown Doctor';
                    const timeStr = appt.startTime ? new Date(appt.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
                    
                    let statusBadge = `<span class="badge-default">${appt.status}</span>`;
                    if (appt.status === 'BOOKED') statusBadge = `<span class="badge-booked bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">BOOKED</span>`;
                    else if (appt.status === 'CANCELLED') statusBadge = `<span class="badge-cancelled bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">CANCELLED</span>`;
                    else if (appt.status === 'COMPLETED') statusBadge = `<span class="badge-completed bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">COMPLETED</span>`;

                    let payBadge = '<span class="badge-default">—</span>';
                    if (appt.billing) {
                        if (appt.billing.paymentStatus === 'SUCCESS') payBadge = `<span class="pay-success text-emerald-600 font-bold text-sm">Paid</span><p class="text-[10px] text-on-surface-variant mt-0.5">${appt.billing.paymentType || ''}</p>`;
                        else if (appt.billing.paymentStatus === 'PENDING') payBadge = `<span class="pay-pending text-amber-600 font-bold text-sm">Pending</span>`;
                        else if (appt.billing.paymentStatus === 'FAILED') payBadge = `<span class="pay-failed text-red-600 font-bold text-sm">Failed</span>`;
                    }

                    html += `
                        <tr class="hover:bg-surface-container/50 transition-colors">
                            <td class="p-md">
                                <p class="font-semibold text-sm text-on-surface">${patName}</p>
                                <p class="text-xs text-on-surface-variant mt-0.5">${patMobile}</p>
                            </td>
                            <td class="p-md">
                                <p class="text-sm font-medium text-on-surface">${docName}</p>
                            </td>
                            <td class="p-md">
                                <span class="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">${timeStr}</span>
                            </td>
                            <td class="p-md">${statusBadge}</td>
                            <td class="p-md">${payBadge}</td>
                            <td class="p-md">
                                <div class="flex items-center gap-2">
                                    <button onclick="window.open('/staff/dashboard/appointments/${appt.id}/invoice', '_blank')" class="p-1.5 hover:bg-surface-container rounded-lg transition-all text-emerald-600" title="Download Invoice">
                                        <span class="material-symbols-outlined text-[18px]">receipt</span>
                                    </button>
                                    <button onclick="openRescheduleModal('${appt.id}', '${appt.doctorId}')" class="p-1.5 hover:bg-surface-container rounded-lg transition-all text-primary" title="Reschedule">
                                        <span class="material-symbols-outlined text-[18px]">edit_calendar</span>
                                    </button>
                                    <button onclick="cancelAppointment('${appt.id}')" class="p-1.5 hover:bg-surface-container rounded-lg transition-all text-red-600" title="Cancel">
                                        <span class="material-symbols-outlined text-[18px]">cancel</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-red-500 text-sm">Failed to load appointments: ${result.message || 'Unknown error'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching appointments:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-red-500 text-sm">Error connecting to server: ${error.message}</td></tr>`;
    } finally {
        spinner.classList.add('hidden');
    }
}

// Actions logic
async function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
        const res = await fetch('/staff/dashboard/appointments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId: id })
        });
        const data = await res.json();
        if (data.success || res.ok) {
            alert('Appointment cancelled successfully.');
            loadAppointments();
        } else {
            alert(data.message || 'Failed to cancel appointment.');
        }
    } catch (err) {
        alert('Server error while cancelling appointment.');
    }
}

let selectedRescheduleSlot = null;

function openRescheduleModal(id, doctorId) {
    document.getElementById('rescheduleApptId').value = id;
    document.getElementById('rescheduleDoctorId').value = doctorId;
    document.getElementById('rescheduleModal').classList.remove('hidden');
    document.getElementById('rescheduleSlotSection').classList.add('hidden');
    document.getElementById('rescheduleSubmitBtn').disabled = true;
    selectedRescheduleSlot = null;
}

function closeRescheduleModal() {
    document.getElementById('rescheduleModal').classList.add('hidden');
    document.getElementById('rescheduleForm').reset();
    document.getElementById('rescheduleError').classList.add('hidden');
    document.getElementById('rescheduleSlotSection').classList.add('hidden');
    selectedRescheduleSlot = null;
}

async function fetchRescheduleSlots() {
    const dateInput = document.getElementById('rescheduleDate').value;
    const doctorId = document.getElementById('rescheduleDoctorId').value;
    if (!dateInput) return alert('Please select a date first.');

    selectedRescheduleSlot = null;
    document.getElementById('rescheduleSubmitBtn').disabled = true;

    const slotSection = document.getElementById('rescheduleSlotSection');
    const loading = document.getElementById('rescheduleSlotsLoading');
    const empty = document.getElementById('rescheduleSlotsEmpty');
    const emptyMsg = document.getElementById('rescheduleSlotsEmptyMsg');
    
    const morningSection = document.getElementById('rescheduleMorningSection');
    const morningGrid = document.getElementById('rescheduleMorningGrid');
    const eveningSection = document.getElementById('rescheduleEveningSection');
    const eveningGrid = document.getElementById('rescheduleEveningGrid');

    slotSection.classList.remove('hidden');
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    morningSection.classList.add('hidden');
    eveningSection.classList.add('hidden');
    morningGrid.innerHTML = '';
    eveningGrid.innerHTML = '';

    try {
        const res = await fetch(`/staff/dashboard/slots?doctorId=${doctorId}&date=${dateInput}`);
        const data = await res.json();

        loading.classList.add('hidden');

        if (data.success && data.data && data.data.slots) {
            const now = new Date();
            const isToday = new Date(dateInput).toDateString() === now.toDateString();
            
            const filteredSlots = data.data.slots.filter(slot => {
                if (isToday) return new Date(slot.startTime) > now;
                return true;
            });

            if (filteredSlots.length === 0) {
                empty.classList.remove('hidden');
                emptyMsg.textContent = 'No slots available after current time on this date.';
                return;
            }

            const morningSlots = [];
            const eveningSlots = [];
            filteredSlots.forEach(slot => {
                const hour = new Date(slot.startTime).getHours();
                if (hour < 12) morningSlots.push(slot);
                else eveningSlots.push(slot);
            });

            if (morningSlots.length > 0) {
                morningSection.classList.remove('hidden');
                morningSlots.forEach(slot => {
                    morningGrid.appendChild(createRescheduleSlotBtn(slot));
                });
            }
            if (eveningSlots.length > 0) {
                eveningSection.classList.remove('hidden');
                eveningSlots.forEach(slot => {
                    eveningGrid.appendChild(createRescheduleSlotBtn(slot));
                });
            }
        } else {
            empty.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        emptyMsg.textContent = 'Error fetching slots.';
    }
}

function createRescheduleSlotBtn(slot) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const d = new Date(slot.startTime);
    btn.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    btn.className = 'slot-btn p-2 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container hover:border-primary/50 transition-all';
    
    btn.onclick = () => {
        document.querySelectorAll('#rescheduleSlotSection .slot-btn').forEach(b => {
            b.classList.remove('bg-primary', 'text-white', 'border-primary');
            b.classList.add('text-on-surface', 'border-outline-variant');
        });
        btn.classList.remove('text-on-surface', 'border-outline-variant');
        btn.classList.add('bg-primary', 'text-white', 'border-primary');
        selectedRescheduleSlot = slot.startTime;
        document.getElementById('rescheduleSubmitBtn').disabled = false;
    };
    return btn;
}

async function submitReschedule(e) {
    e.preventDefault();
    const apptId = document.getElementById('rescheduleApptId').value;
    if (!selectedRescheduleSlot) return alert('Please select a slot.');

    try {
        const res = await fetch('/staff/dashboard/appointments/reschedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                appointmentId: apptId, 
                appointmentDate: selectedRescheduleSlot,
                appointmentStartTime: selectedRescheduleSlot
            })
        });
        const data = await res.json();
        if (data.success || res.ok) {
            closeRescheduleModal();
            alert('Appointment rescheduled successfully.');
            loadAppointments();
        } else {
            document.getElementById('rescheduleError').textContent = data.message || 'Failed to reschedule.';
            document.getElementById('rescheduleError').classList.remove('hidden');
        }
    } catch (err) {
        document.getElementById('rescheduleError').textContent = 'Server error.';
        document.getElementById('rescheduleError').classList.remove('hidden');
    }
}

// Load default on page load
window.addEventListener('DOMContentLoaded', loadAppointments);
