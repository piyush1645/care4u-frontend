let bookingIntent = null;
let currentTab = 'cash';

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerHTML = '<span class="material-symbols-outlined text-[16px]">' + (isError ? 'error' : 'check_circle') + '</span>' + message;
    toast.className = 'fixed bottom-4 right-4 px-4 py-2.5 rounded-xl shadow-xl transform transition-all duration-300 z-50 text-sm font-medium flex items-center gap-2 text-white ' + (isError ? 'bg-red-600' : 'bg-gray-800');
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(function () { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; }, 3500);
}

var TAB_META = {
    cash: { label: 'Cash', icon: 'payments', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    card: { label: 'Card', icon: 'credit_card', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    upi: { label: 'UPI', icon: 'qr_code_2', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    netbank: { label: 'Net Banking', icon: 'account_balance', iconBg: 'bg-teal-50', iconColor: 'text-teal-600' },
};

function switchTab(tab) {
    currentTab = tab;
    ['cash', 'card', 'upi', 'netbank'].forEach(function (t) {
        var btnId = 'tab' + t.charAt(0).toUpperCase() + t.slice(1);
        var panelId = 'fields' + t.charAt(0).toUpperCase() + t.slice(1);
        var btn = document.getElementById(btnId);
        var panel = document.getElementById(panelId);
        var isActive = t === tab;
        if (isActive) {
            btn.classList.add('active');
            btn.classList.remove('border-outline-variant', 'bg-surface-container-lowest', 'text-on-surface-variant');
        } else {
            btn.classList.remove('active');
            btn.classList.add('border-outline-variant', 'bg-surface-container-lowest', 'text-on-surface-variant');
        }
        if (isActive) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
    });
    var meta = TAB_META[tab];
    var iconEl = document.getElementById('payMethodIcon');
    iconEl.className = 'w-9 h-9 rounded-xl ' + meta.iconBg + ' ' + meta.iconColor + ' flex items-center justify-center shrink-0';
    iconEl.innerHTML = '<span class="material-symbols-outlined text-[18px]">' + meta.icon + '</span>';
    document.getElementById('payMethodLabel').textContent = meta.label;
}

function bindCardFlip() {
    var inner = document.getElementById('mockCardInner');
    var flipCard = inner && inner.closest('.flip-card');
    var cvvInput = document.getElementById('cardCvv');
    if (cvvInput) {
        cvvInput.addEventListener('focus', function () { if (flipCard) flipCard.classList.add('flipped'); });
        cvvInput.addEventListener('blur', function () { if (flipCard) flipCard.classList.remove('flipped'); });
        cvvInput.addEventListener('input', function (e) {
            var v = e.target.value.replace(/\D/g, '').slice(0, 4);
            e.target.value = v;
            document.getElementById('mockCardCvv').textContent = v ? '•'.repeat(v.length) : '•••';
        });
    }
    var numInput = document.getElementById('cardNumber');
    if (numInput) {
        numInput.addEventListener('input', function (e) {
            var v = e.target.value.replace(/\D/g, '').slice(0, 16);
            e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
            var display = v.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
            document.getElementById('mockCardNumber').textContent = display;
        });
    }
    var expInput = document.getElementById('cardExpiry');
    if (expInput) {
        expInput.addEventListener('input', function (e) {
            var v = e.target.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
            e.target.value = v;
            document.getElementById('mockCardExpiry').textContent = v || 'MM/YY';
        });
    }
    var nameInput = document.getElementById('cardHolderName');
    if (nameInput) {
        nameInput.addEventListener('input', function (e) {
            document.getElementById('mockCardHolder').textContent = (e.target.value || 'PATIENT NAME').toUpperCase().slice(0, 22);
        });
    }
}

function recalc() {
    var fee = parseFloat(document.getElementById('consultationFees').value) || 0;
    var tax = parseFloat(document.getElementById('taxCharges').value) || 0;
    var total = fee + tax;
    document.getElementById('totalAmount').value = total.toFixed(2);
    document.getElementById('summFee').textContent = '\u20B9' + fee.toFixed(2);
    document.getElementById('summTax').textContent = '\u20B9' + tax.toFixed(2);
    document.getElementById('summTotal').textContent = '\u20B9' + total.toFixed(2);
}

window.addEventListener('DOMContentLoaded', function () {
    var intentStr = sessionStorage.getItem('staffBookingIntent');
    if (!intentStr) {
        alert('No booking details found. Please start over.');
        window.location.href = '/staff/patients';
        return;
    }
    try {
        bookingIntent = JSON.parse(intentStr);
        document.getElementById('summaryPatient').textContent =
            (bookingIntent.patient.firstName + ' ' + (bookingIntent.patient.lastName || '')).trim();
        document.getElementById('summaryPatientContact').textContent =
            bookingIntent.patient.mobile || bookingIntent.patient.email || 'No contact info';
        document.getElementById('summaryDoctor').textContent = bookingIntent.doctor.name;

        var st = new Date(bookingIntent.slot.startTime);
        var et = new Date(bookingIntent.slot.endTime);
        var dateStr = st.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        var timeStr = st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' \u2013 ' + et.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('summarySlot').textContent = dateStr + ', ' + timeStr;

        document.getElementById('consultationFees').value = bookingIntent.doctor.charges || 0;
        recalc();

        var patName = ((bookingIntent.patient.firstName || '') + ' ' + (bookingIntent.patient.lastName || '')).trim();
        var holderInput = document.getElementById('cardHolderName');
        if (holderInput) {
            holderInput.value = patName;
            document.getElementById('mockCardHolder').textContent = patName.toUpperCase().slice(0, 22) || 'PATIENT NAME';
        }
    } catch (e) {
        alert('Error loading booking details.');
        window.location.href = '/staff/patients';
    }

    document.getElementById('consultationFees').addEventListener('input', recalc);
    document.getElementById('taxCharges').addEventListener('input', recalc);
    bindCardFlip();
});

async function confirmBooking() {
    var fee = parseFloat(document.getElementById('consultationFees').value);
    if (isNaN(fee) || fee < 0) return showToast('Enter a valid consultation fee.', true);

    var paymentType, transactionId = null, cardNumber = null, upiId = null;
    if (currentTab === 'cash') {
        paymentType = 'CASH';
    } else if (currentTab === 'card') {
        paymentType = 'CARD';
        var cn = document.getElementById('cardNumber').value.replace(/\s/g, '');
        if (cn.length < 16) return showToast('Enter a valid 16-digit card number.', true);
        if (!document.getElementById('cardExpiry').value) return showToast('Enter card expiry.', true);
        if (!document.getElementById('cardCvv').value) return showToast('Enter CVV.', true);
        cardNumber = cn.slice(-4);
        transactionId = document.getElementById('cardTransactionId').value || null;
    } else if (currentTab === 'upi') {
        paymentType = 'UPI';
        upiId = document.getElementById('upiId').value.trim();
        if (!upiId) return showToast('Enter UPI ID.', true);
        transactionId = document.getElementById('upiTransactionId').value || null;
    } else {
        paymentType = 'NET_BANKING';
        transactionId = document.getElementById('netbankTransactionId').value || null;
    }

    var btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    document.getElementById('confirmBtnLabel').textContent = 'Processing\u2026';
    btn.querySelector('.material-symbols-outlined').textContent = 'hourglass_empty';

    var payload = {
        doctorId: bookingIntent.doctor.id,
        patientId: bookingIntent.patient.id,
        appointmentTime: bookingIntent.slot.startTime,
        consultationFees: fee,
        taxRate: 0,
        taxCharges: parseFloat(document.getElementById('taxCharges').value) || 0,
        totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
        paidBy: document.getElementById('paidBy').value,
        paymentType: paymentType,
        paymentStatus: document.getElementById('paymentStatus').value,
        transactionId: transactionId,
        cardNumber: cardNumber,
        upiId: upiId,
    };

    try {
        var res = await fetch('/staff/dashboard/book-appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (data.success) {
            sessionStorage.removeItem('staffBookingIntent');
            sessionStorage.removeItem('bookingPatient');
            if (data.data && data.data.referenceNumber) {
                document.getElementById('successRef').textContent = 'Ref: ' + data.data.referenceNumber;
            }
            document.getElementById('successOverlay').classList.add('show');
        } else {
            showToast(data.message || 'Booking failed. Please try again.', true);
            resetBtn();
        }
    } catch (err) {
        showToast('Network error. Please try again.', true);
        resetBtn();
    }
}

function resetBtn() {
    var btn = document.getElementById('confirmBtn');
    btn.disabled = false;
    document.getElementById('confirmBtnLabel').textContent = 'Confirm & Book Appointment';
    btn.querySelector('.material-symbols-outlined').textContent = 'check_circle';
}
