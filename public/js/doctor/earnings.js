/**
 * earnings.js
 * Handles client-side logic for the doctor's Earnings & Invoices page:
 *   - Monthly invoice download / print
 */

function downloadMonthlyInvoice() {
    const selectEl = document.getElementById('monthSelect');
    const selectedMonth = selectEl ? selectEl.value : '';
    if (!selectedMonth) {
        alert('No month selected or no transaction history available.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const doctorId  = urlParams.get('doctorId');

    let query = `?month=${selectedMonth}`;
    if (doctorId) query += `&doctorId=${doctorId}`;

    window.open(`/doctor/earnings/download-monthly${query}`, '_blank');
}
