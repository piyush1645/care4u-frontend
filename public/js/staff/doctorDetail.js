let selectedSlot = null;
let selectedDate = null;

window.addEventListener('DOMContentLoaded', () => {
    // Minimum date
    const dateInput = document.getElementById('slotDate');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
        dateInput.value = `${yyyy}-${mm}-${dd}`; // default to today
    }

    // Show patient banner if patient selected
    const patientDataStr = sessionStorage.getItem('bookingPatient');
    if (patientDataStr) {
        try {
            const p = JSON.parse(patientDataStr);
            if (p.firstName) {
                document.getElementById('bookingPatientName').textContent = `${p.firstName} ${p.lastName || ''}`;
                document.getElementById('bookingForPatientBanner').classList.remove('hidden');
            }
        } catch (e) { }
    }
});

async function fetchSlots() {
    const dateInput = document.getElementById('slotDate').value;
    if (!dateInput) return alert('Please select a date.');
    selectedDate = dateInput;
    selectedSlot = null;
    document.getElementById('proceedBtn').disabled = true;

    const slotSection = document.getElementById('slotSection');
    const loading = document.getElementById('slotsLoading');
    const empty = document.getElementById('slotsEmpty');
    const emptyMsg = document.getElementById('slotsEmptyMsg');

    const morningSection = document.getElementById('morningSlotSection');
    const morningGrid = document.getElementById('morningSlotsGrid');
    const eveningSection = document.getElementById('eveningSlotSection');
    const eveningGrid = document.getElementById('eveningSlotsGrid');

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

        if (data.success && data.data.isAvailable) {
            // Filter out past slots if booking for today
            const now = new Date();
            const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isToday = (dateInput === localTodayStr);

            const filteredSlots = data.data.slots.filter(slot => {
                if (isToday) return new Date(slot.startTime) > now;
                return true;
            });

            if (filteredSlots.length === 0) {
                empty.classList.remove('hidden');
                emptyMsg.textContent = 'No slots available after the current time on this date.';
                return;
            }

            const morningSlots = [];
            const eveningSlots = [];

            filteredSlots.forEach(slot => {
                const hour = new Date(slot.startTime).getHours();
                if (hour < 12) morningSlots.push(slot);
                else eveningSlots.push(slot);
            });

            const createSlotBtn = (slot) => {
                const btn = document.createElement('button');
                const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                btn.textContent = timeStr;

                if (slot.isBooked) {
                    btn.className = "py-2 px-1 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-500 cursor-not-allowed opacity-60 shadow-sm";
                    btn.disabled = true;
                } else {
                    btn.className = "py-2 px-1 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer shadow-sm transition-all";
                    btn.onclick = (e) => {
                        document.querySelectorAll('#slotSection button:not([disabled])').forEach(b => {
                            if (b.id !== 'proceedBtn' && b.id !== 'checkSlotsBtn') {
                                b.classList.remove('bg-primary', 'text-white', 'border-primary');
                                b.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
                            }
                        });
                        btn.classList.add('bg-primary', 'text-white', 'border-primary');
                        btn.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
                        selectedSlot = { startTime: slot.startTime, endTime: slot.endTime };
                        document.getElementById('proceedBtn').disabled = false;
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
            empty.classList.remove('hidden');
            emptyMsg.textContent = data.data?.reason || 'Doctor is not available on this date.';
        }
    } catch (error) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        emptyMsg.textContent = 'Failed to load slots. Please try again.';
    }
}

function proceedToPayment() {
    if (!selectedSlot) return alert("Please select a slot.");

    const patientDataStr = sessionStorage.getItem('bookingPatient');
    if (!patientDataStr) {
        alert("No patient selected! Please go back to patients tab and start booking from there.");
        window.location.href = '/staff/patients';
        return;
    }

    const patientData = JSON.parse(patientDataStr);

    // Store complete booking intent in sessionStorage
    const bookingIntent = {
        patient: patientData,
        doctor: {
            id: doctorId,
            name: doctorName,
            charges: doctorCharges
        },
        date: selectedDate,
        slot: selectedSlot
    };

    sessionStorage.setItem('staffBookingIntent', JSON.stringify(bookingIntent));
    window.location.href = '/staff/payment';
}
