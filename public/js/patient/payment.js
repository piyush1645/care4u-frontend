function showError(msg) {
  const el = document.getElementById("errorBanner");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function validateLuhn(num) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num.charAt(i), 10);
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
}

// ── Tab switching ────────────────────────────────────────────────────────────
window.switchTab = function (tab) {
  ["upi", "card"].forEach((t) => {
    const btn = document.getElementById(
      `tab${t.charAt(0).toUpperCase() + t.slice(1)}`,
    );
    const fields = document.getElementById(
      `fields${t.charAt(0).toUpperCase() + t.slice(1)}`,
    );
    if (t === tab) {
      btn.classList.add("bg-primary", "text-white", "border-primary");
      btn.classList.remove("bg-slate-50", "text-slate-600", "border-slate-200");
      fields.classList.remove("hidden");
    } else {
      btn.classList.remove("bg-primary", "text-white", "border-primary");
      btn.classList.add("bg-slate-50", "text-slate-600", "border-slate-200");
      fields.classList.add("hidden");
    }
  });
};

// ── Main ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = getCookie("accessToken");
  if (!token) {
    window.location.href = "/auth/login";
    return;
  }

  // Read booking details stored by doctor detail page
  let booking;
  try {
    booking = JSON.parse(sessionStorage.getItem("bookingDetails") || "null");
  } catch {
    booking = null;
  }

  if (!booking) {
    // Nothing in sessionStorage — redirect back
    window.location.href = "/patient/doctors";
    return;
  }

  // Update back button to point to the specific doctor
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.href = `/patient/doctors/${booking.doctorId}`;

  // ── Fill booking summary ────────────────────────────────────────────────
  setText("summDoctorName", booking.doctorName);
  setText("summSpeciality", booking.speciality);
  setText("summHospital", booking.hospitalName);
  setText(
    "summDate",
    new Date(booking.appointmentDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  );
  setText("summTime", booking.slotLabel);

  document.getElementById("summaryLoading")?.classList.add("hidden");
  document.getElementById("summaryContent")?.classList.remove("hidden");

  // total amount is recalculated once tax rate is known —
  // the pay button needs it at click time, so keep it in outer scope
  let totalAmount = booking.charges;

  // ── Fetch tax rate & compute fee breakdown ──────────────────────────────
  try {
    const taxResult = await apiFetch(`/tax/${booking.hospitalId}`);

    if (!taxResult || !taxResult.ok || !taxResult.success) {
      // Show breakdown without tax if tax endpoint fails
      totalAmount = renderFees(booking.charges, 0, 0);
    } else {
      const taxRate = Number(taxResult.data.taxRate);
      const taxAmount = (booking.charges * taxRate) / 100;
      totalAmount = renderFees(booking.charges, taxRate, taxAmount);
    }
  } catch (err) {
    console.error("Error fetching tax rate:", err);
    // Fallback: show fees without tax
    totalAmount = renderFees(booking.charges, 0, 0);
  }

  // ── Pay button ──────────────────────────────────────────────────────────
  const payBtn = document.getElementById("payBtn");
  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      // Clear previous error messages
      const errorBanner = document.getElementById("errorBanner");
      if (errorBanner) errorBanner.classList.add("hidden");

      const activeTab = getActiveTab();

      // ── gather payment details based on active tab ─────────────────
      let paymentDetails = {};

      if (activeTab === "upi") {
        const upiIdVal = document.getElementById("upiId")?.value?.trim();
        const transactionIdVal = document
          .getElementById("upiTransactionId")
          ?.value?.trim();

        if (!upiIdVal) {
          showError("Please enter your UPI ID.");
          return;
        }

        // UPI ID Validation Regex (standard identifier@bankname)
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiIdVal)) {
          showError("Please enter a valid UPI ID (e.g. name@bank or mobile@upi).");
          return;
        }

        if (!transactionIdVal) {
          showError("Please enter the transaction ID.");
          return;
        }

        // UPI transaction ID is usually a 12-digit numeric code
        if (!/^\d{12}$/.test(transactionIdVal)) {
          showError("Please enter a valid 12-digit numeric UPI transaction ID.");
          return;
        }

        paymentDetails = { upiId: upiIdVal, transactionId: transactionIdVal };
      } else if (activeTab === "card") {
        const cardNumberVal = document
          .getElementById("cardNumber")
          ?.value?.replace(/\s/g, "")
          .trim();
        const cardExpiryVal = document.getElementById("cardExpiry")?.value?.trim();
        const cardCvvVal = document.getElementById("cardCvv")?.value?.trim();
        const cardHolderVal = document.getElementById("cardHolderName")?.value?.trim();
        const transactionIdVal = document
          .getElementById("cardTransactionId")
          ?.value?.trim();

        // 1. Card Number Validation
        if (!cardNumberVal) {
          showError("Please enter your card number.");
          return;
        }
        if (!/^\d{15,16}$/.test(cardNumberVal)) {
          showError("Please enter a valid 15 or 16-digit card number.");
          return;
        }
        
        // no need as of now!!
        // if (!validateLuhn(cardNumberVal)) {
        //   showError("Card number failed verification (invalid card number structure).");
        //   return;
        // }

        // 2. Card Expiry Validation
        if (!cardExpiryVal) {
          showError("Please enter the card expiry date.");
          return;
        }
        const expiryMatch = cardExpiryVal.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
        if (!expiryMatch) {
          showError("Please enter expiry in MM/YY format.");
          return;
        }
        const expMonth = parseInt(expiryMatch[1], 10);
        const expYear = parseInt("20" + expiryMatch[2], 10);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          showError("This card has expired.");
          return;
        }

        // 3. Card CVV Validation
        if (!cardCvvVal) {
          showError("Please enter the CVV.");
          return;
        }
        if (!/^\d{3,4}$/.test(cardCvvVal)) {
          showError("Please enter a valid 3 or 4 digit CVV.");
          return;
        }

        // 4. Cardholder Name Validation
        if (!cardHolderVal || cardHolderVal.length < 2) {
          showError("Please enter the cardholder's name (minimum 2 characters).");
          return;
        }
        if (!/^[a-zA-Z\s]+$/.test(cardHolderVal)) {
          showError("Cardholder's name must contain letters and spaces only.");
          return;
        }

        // 5. Card Transaction Reference Validation
        if (!transactionIdVal) {
          showError("Please enter the transaction ID / reference number.");
          return;
        }
        if (transactionIdVal.length < 6) {
          showError("Please enter a valid transaction ID (minimum 6 characters).");
          return;
        }

        paymentDetails = {
          cardNumber: cardNumberVal,
          cardExpiry: cardExpiryVal,
          cardCvv: cardCvvVal,
          cardHolderName: cardHolderVal,
          transactionId: transactionIdVal,
        };
      } else {
        // cash — no fields required
        paymentDetails = {};
      }

      const paymentType = activeTab.toUpperCase(); // 'UPI' | 'CARD' | 'CASH'

      const btnLabel = document.getElementById("payBtnLabel");
      payBtn.disabled = true;
      if (btnLabel) btnLabel.textContent = "Processing...";

      try {
        let startDateTime;
        if (booking.appointmentStartTime.includes('T') || booking.appointmentStartTime.includes('Z')) {
          startDateTime = new Date(booking.appointmentStartTime);
        } else {
          startDateTime = buildClinicDateTime(booking.appointmentDate, booking.appointmentStartTime);
        }

        // STEP 2: Build the single payload transaction body containing booking details 
        // and simulated invoice payment details.
        const body = {
          appointmentDate: booking.appointmentDate, // Date-only string (midnight UTC)
          appointmentStartTime: startDateTime.toISOString(), // Absolute ISO timestamp
          doctorId: booking.doctorId,
          hospitalId: booking.hospitalId,
          bookedBy: "SELF",
          paidBy: "self",
          type: booking.type || "IN_PERSON",
          payment: {
            amount: Number(totalAmount.toFixed(2)),
            type: paymentType,
            status: "SUCCESS",
            ...(Object.keys(paymentDetails).length > 0
              ? { paymentDetails }
              : {}),
          },
        };

        // STEP 3: Dispatch single atomic transaction request to book appointment + invoice.
        const bookResult = await apiFetch(`/appointment/book-appointment`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!bookResult || !bookResult.ok || !bookResult.success) {
          showError(
            (bookResult && bookResult.message) ||
              "Failed to book appointment. Please try again.",
          );
          payBtn.disabled = false;
          if (btnLabel) btnLabel.textContent = "Pay & Book Appointment";
          return;
        }

        // STEP 4: Success - Clear transient bookingDetails and store success payload.
        // The success payload (including the new referenceNumber) is stored in sessionStorage 
        // to be read by the redirected page's toast notification banner.
        sessionStorage.removeItem("bookingDetails");
        sessionStorage.setItem(
          "bookingSuccess",
          JSON.stringify({
            appointmentId: bookResult.data?.createdAppointment?.id,
            referenceNumber: bookResult.data?.createdAppointment?.referenceNumber,
            totalAmount: totalAmount,
            date: booking.appointmentDate,
          }),
        );

        // STEP 5: Redirect to patient appointments view and highlight the newly booked date
        window.location.href = `/patient/appointments?date=${booking.appointmentDate}&booked=1`;
      } catch (err) {
        showError("Network error. Please try again.");
        console.error(err);
        payBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = "Pay & Book Appointment";
      }
    });
  }

  // ── Card Input Mirroring & Formatting ──────────────────────────────────────
  const cardNumberInput = document.getElementById("cardNumber");
  const cardExpiryInput = document.getElementById("cardExpiry");
  const cardCvvInput = document.getElementById("cardCvv");
  const cardHolderInput = document.getElementById('cardHolderName');

  const mockCardNumber = document.getElementById("mockCardNumber");
  const mockCardExpiry = document.getElementById("mockCardExpiry");
  const mockCardCvv = document.getElementById("mockCardCvv");
  const mockCardHolder = document.getElementById("mockCardHolder");

  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      let formatted = "";
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += " ";
        formatted += value[i];
      }
      e.target.value = formatted;

      let mockVal = formatted;
      const placeholder = "•••• •••• •••• ••••";
      if (mockVal.length < placeholder.length) {
        mockVal = mockVal + placeholder.slice(mockVal.length);
      }
      if (mockCardNumber) mockCardNumber.textContent = mockVal;
    });
  }

  if (cardHolderInput) {
    cardHolderInput.addEventListener("input", (e) => {
      // Remove any character that is NOT a letter (A-Z or a-z)
      let value = e.target.value.replace(/[^A-Za-z\s]/g, "");
      e.target.value = value;
      if (mockCardHolder) mockCardHolder.textContent = value.trim().toUpperCase();
    });
  }

  if (cardExpiryInput) {
    cardExpiryInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 2) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4);
      }
      e.target.value = value;

      let mockVal = value;
      const placeholder = "MM/YY";
      if (mockVal.length < placeholder.length) {
        mockVal = mockVal + placeholder.slice(mockVal.length);
      }
      if (mockCardExpiry) mockCardExpiry.textContent = mockVal;
    });
  }

  if (cardCvvInput) {
    cardCvvInput.addEventListener("input", (e) => {
      // Remove non-digit characters
      let value = e.target.value.replace(/\D/g, "");
      
      // Limit CVV to 3 or 4 digits
      if (value.length > 3) value = value.slice(0, 4);
      
      e.target.value = value;
      console.log(value);

      // Directly mirror the value to the card display
      if (mockCardCvv) {
        mockCardCvv.textContent = value;
      }
    });

    cardCvvInput.addEventListener("focus", () => {
      const cardContainer = document.querySelector(".flip-card");
      if (cardContainer) cardContainer.classList.add("flipped");
    });

    cardCvvInput.addEventListener("blur", () => {
      const cardContainer = document.querySelector(".flip-card");
      if (cardContainer) cardContainer.classList.remove("flipped");
    });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
// returns the total amount so the caller can store it for the pay button
function renderFees(consultationFee, taxRate, taxAmount) {
  const total = consultationFee + taxAmount;

  setText("feeConsultation", `₹${consultationFee.toFixed(2)}`);
  setText("feeTaxLabel", taxRate > 0 ? `Tax (${taxRate}%)` : "Tax");
  setText("feeTaxAmount", `₹${taxAmount.toFixed(2)}`);
  setText("feeTotal", `₹${total.toFixed(2)}`);

  // Update pay button label with amount
  const btnLabel = document.getElementById("payBtnLabel");
  if (btnLabel) btnLabel.textContent = `Pay ₹${total.toFixed(2)} & Book`;

  document.getElementById("feeLoading")?.classList.add("hidden");
  document.getElementById("feeContent")?.classList.remove("hidden");

  return total;
}

function getActiveTab() {
  if (!document.getElementById("fieldsCard").classList.contains("hidden"))
    return "card";
  if (!document.getElementById("fieldsCash").classList.contains("hidden"))
    return "cash";
  return "upi";
}
