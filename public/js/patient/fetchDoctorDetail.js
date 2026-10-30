/**
 * Doctor Details Slot Selection & Booking Flow
 */

let selectedType = 'IN_PERSON';
let selectedSlot = null; // { startTime: 'HH:MM', time: '09:30 AM' }

function showError(msg) {
    const el = document.getElementById('bookingError');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideError() {
    const el = document.getElementById('bookingError');
    if (el) el.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('doctorContent');
    if (!container) return;

    const doctorId = container.getAttribute('data-doctor-id');
    const doctorName = container.getAttribute('data-doctor-name');
    const doctorCharges = Number(container.getAttribute('data-doctor-charges') || 0);
    const doctorSpeciality = container.getAttribute('data-doctor-speciality');
    const hospitalId = container.getAttribute('data-hospital-id');
    const hospitalName = container.getAttribute('data-hospital-name');

    // Type toggling handlers
    const typeInPersonBtn = document.getElementById('typeInPersonBtn');
    const typeOnlineBtn = document.getElementById('typeOnlineBtn');

    if (typeInPersonBtn && typeOnlineBtn) {
        typeInPersonBtn.addEventListener('click', () => {
            selectedType = 'IN_PERSON';
            typeInPersonBtn.className = 'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-primary bg-primary text-white transition-all shadow-sm cursor-pointer';
            typeOnlineBtn.className = 'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 cursor-pointer';
        });

        typeOnlineBtn.addEventListener('click', () => {
            selectedType = 'ONLINE';
            typeOnlineBtn.className = 'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-primary bg-primary text-white transition-all shadow-sm cursor-pointer';
            typeInPersonBtn.className = 'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 cursor-pointer';
        });
    }

    // STEP 1: Set minimum date constraint to today's local clinic calendar date
    // Prevents patients from booking or querying slots on past calendar dates.
    const dateInput = document.getElementById('slotDate');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    // Wire slot picker actions
    const checkSlotsBtn = document.getElementById('checkSlotsBtn');
    const proceedBtn = document.getElementById('proceedBtn');
    const slotSection = document.getElementById('slotSection');

    if (checkSlotsBtn) {
        checkSlotsBtn.addEventListener('click', async () => {
            const date = dateInput?.value;
            if (!date) {
                showError('Please select a date first.');
                return;
            }
            hideError();
            selectedSlot = null;
            if (proceedBtn) proceedBtn.disabled = true;

            // Show slot container
            if (slotSection) slotSection.classList.remove('hidden');

            const slotsLoading = document.getElementById('slotsLoading');
            const slotsEmpty = document.getElementById('slotsEmpty');
            const morningSection = document.getElementById('morningSlotSection');
            const morningGrid = document.getElementById('morningSlotsGrid');
            const eveningSection = document.getElementById('eveningSlotSection');
            const eveningGrid = document.getElementById('eveningSlotsGrid');

            if (slotsLoading) slotsLoading.classList.remove('hidden');
            if (slotsEmpty) slotsEmpty.classList.add('hidden');
            if (morningSection) morningSection.classList.add('hidden');
            if (eveningSection) eveningSection.classList.add('hidden');
            if (morningGrid) morningGrid.innerHTML = '';
            if (eveningGrid) eveningGrid.innerHTML = '';

            try {
                // STEP 2: Fetch dynamic available slots from the backend API for the selected date.
                // The backend generates these slots relative to the clinic's local timezone (Asia/Kolkata).
                const result = await apiFetch(`/patient/doctors/${doctorId}/slots?date=${date}`);

                if (slotsLoading) slotsLoading.classList.add('hidden');

                if (!result || !result.ok || !result.success) {
                    showError(result?.message || 'Failed to load slots');
                    return;
                }

                const slots = result.data;
                if (!slots || slots.length === 0) {
                    if (slotsEmpty) slotsEmpty.classList.remove('hidden');
                    return;
                }

                // STEP 3: Filter out past slots using the clinic timezone.
                // The backend returns HH:mm values that represent clinic wall-clock time.
                const filteredSlots = (slots || []).filter(slot => {
                    const slotDateTime = slot?.startTime ? buildClinicDateTime(date, slot.startTime) : new Date(0);
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
                                data-start="${slot.startTime}"
                                data-label="${slot.time}"
                                onclick="selectSlot(this)"
                                class="slot-btn py-2 px-1 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer shadow-sm"
                            >${slot.time}</button>
                        `;
                    } else {
                        return `
                            <button
                                disabled
                                class="py-2 px-1 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-sm"
                            >${slot.time}</button>
                        `;
                    }
                };

                const morningSlots = filteredSlots.filter(slot => slot?.period === 'MORNING');
                const eveningSlots = filteredSlots.filter(slot => slot?.period === 'EVENING');

                const getPeriodTimingRange = (slotsList) => {
                    if (!slotsList || slotsList.length === 0) return '';
                    const startStr = slotsList[0].time;
                    const lastSlot = slotsList[slotsList.length - 1];
                    const [h, m] = lastSlot.startTime.split(':').map(Number);
                    const duration = Number(document.getElementById('doctorContent')?.getAttribute('data-doctor-slot') || 15);
                    
                    const slotEndDate = buildClinicDateTime(date, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
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

                const morningLabel = document.getElementById('morningSlotLabel');
                const eveningLabel = document.getElementById('eveningSlotLabel');

                if (morningLabel) {
                    morningLabel.textContent = morningTiming ? `Morning: ${morningTiming}` : 'Morning Slots';
                }
                if (eveningLabel) {
                    eveningLabel.textContent = eveningTiming ? `Evening: ${eveningTiming}` : 'Evening Slots';
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

    // Slot selection callback
    window.selectSlot = function (btn) {
        document.querySelectorAll('.slot-btn.selected').forEach(b => {
            b.classList.remove('selected', 'bg-primary', 'text-white', 'border-primary', 'hover:bg-primary/90');
            b.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'hover:bg-emerald-100');
        });
        btn.classList.add('selected', 'bg-primary', 'text-white', 'border-primary', 'hover:bg-primary/90');
        btn.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'hover:bg-emerald-100');

        selectedSlot = {
            startTime: btn.dataset.start,
            time: btn.dataset.label,
        };
        if (proceedBtn) proceedBtn.disabled = false;
    };

    // STEP 4: Redirect to the payment flow
    // When the patient selects a slot and clicks proceed, we serialize the booking metadata 
    // into sessionStorage. This avoids having to pass complex query strings or re-fetching 
    // doctor details on the payment page.
    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            if (!selectedSlot) return;
            const date = dateInput?.value;

            // Save temporary slot details in sessionStorage.
            // Note: The actual booking is not committed until the payment page processes the payment form.
            sessionStorage.setItem('bookingDetails', JSON.stringify({
                doctorId: doctorId,
                doctorName: doctorName,
                speciality: doctorSpeciality || '',
                hospitalId: hospitalId,
                hospitalName: hospitalName,
                appointmentDate: date,
                appointmentStartTime: selectedSlot.startTime,
                slotLabel: selectedSlot.time,
                charges: doctorCharges,
                type: selectedType,
            }));

            window.location.href = '/patient/payment';
        });
    }
});
