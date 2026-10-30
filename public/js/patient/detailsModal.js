/**
 * Shared Appointment Details Modal JS
 */
const BACKEND_URL = (window.API_BASE_URL || 'http://localhost:3004/api/v1').replace(/\/+$/, '');

// handler to remove trailling slashes of the url!!
function buildApiUrl(path) {
  return BACKEND_URL + (path.startsWith('/') ? path : '/' + path);
}

function openDetails(apptId) {
  const list = window.appointmentsList || [];
  const appt = list.find(a => String(a.id) === String(apptId));
  if (!appt) return;

  const modal = document.getElementById('detailsModal');
  const prescriptionBox = document.getElementById('modalPrescriptionBox');
  const consultationEl = document.getElementById('modalConsultationFees');
  const taxEl = document.getElementById('modalTaxCharges');
  const totalEl = document.getElementById('modalTotalAmount');
  const statusEl = document.getElementById('modalPaymentStatus');
  const downloadPrescriptionBtn = document.getElementById('downloadPrescriptionBtn');
  const downloadInvoiceBtn = document.getElementById('downloadInvoiceBtn');

  if (modal) modal.style.display = 'flex';

  if (prescriptionBox) {
    if (appt.prescription && appt.prescription.precautions) {
      prescriptionBox.innerHTML = `<p class="whitespace-pre-line text-slate-700">${appt.prescription.precautions}</p>`;
    } else {
      prescriptionBox.innerHTML = `<p class="text-slate-400 italic">No prescription or precautions recorded for this visit.</p>`;
    }
  }

  if (consultationEl) consultationEl.textContent = appt.billing ? `₹${Number(appt.billing.consultationFees).toFixed(2)}` : '—';
  if (taxEl) taxEl.textContent = appt.billing ? `₹${Number(appt.billing.taxCharges).toFixed(2)}` : '—';
  if (totalEl) totalEl.textContent = appt.billing ? `₹${Number(appt.billing.totalAmount).toFixed(2)}` : '—';

  if (statusEl) {
    if (appt.billing) {
      statusEl.textContent = 'Paid';
      statusEl.className = 'font-bold text-emerald-600 uppercase tracking-wide';
    } else {
      statusEl.textContent = 'Unpaid / Free Visit';
      statusEl.className = 'font-bold text-slate-500 uppercase tracking-wide';
    }
  }

  // wire up download buttons based on data availability 

  if (downloadPrescriptionBtn) {
    if (appt.prescription && appt.prescription.precautions) {
      downloadPrescriptionBtn.disabled = false;
      downloadPrescriptionBtn.classList.remove('opacity-40', 'cursor-not-allowed');
      downloadPrescriptionBtn.onclick = () => downloadFile(
        buildApiUrl(`/appointment/appointments/${appt.id}/prescription/download`),
        `prescription-${appt.id}.pdf`
      );
    } else {
      downloadPrescriptionBtn.disabled = true;
      downloadPrescriptionBtn.classList.add('opacity-40', 'cursor-not-allowed');
      downloadPrescriptionBtn.onclick = null;
    }
  }

  if (downloadInvoiceBtn) {
    if (appt.billing) {
      downloadInvoiceBtn.disabled = false;
      downloadInvoiceBtn.classList.remove('opacity-40', 'cursor-not-allowed');
      downloadInvoiceBtn.onclick = () => downloadFile(
        buildApiUrl(`/appointment/appointments/${appt.id}/invoice/download`),
        `invoice-${appt.id}.pdf`
      );
    } else {
      downloadInvoiceBtn.disabled = true;
      downloadInvoiceBtn.classList.add('opacity-40', 'cursor-not-allowed');
      downloadInvoiceBtn.onclick = null;
    }
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) modal.style.display = 'none';
}

async function downloadFile(url, filename) {
  // getCookie is defined in utils.js
  const token = getCookie('accessToken');

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      alert(errBody.message || 'Failed to download file');
      return;
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

  } catch (err) {
    console.error(err);
    alert('Network error while downloading file.');
  }
}

// Bind to window
window.openDetails = openDetails;
window.closeDetailsModal = closeDetailsModal;
window.downloadFile = downloadFile;
