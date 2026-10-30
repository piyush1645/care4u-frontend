async function searchPatients() {
    const query = document.getElementById('patientTabSearch').value.trim();
    const resultsDiv = document.getElementById('patientResults');
    const spinner = document.getElementById('patientLoadingSpinner');
    const countSpan = document.getElementById('patientResultCount');

    if (!query) {
        resultsDiv.innerHTML = `
            <div class="flex flex-col items-center gap-2 opacity-50 text-center p-lg">
                <span class="material-symbols-outlined text-[40px]">person_search</span>
                <p class="text-sm">Enter a name, mobile, or email to search patients</p>
            </div>
        `;
        countSpan.textContent = '';
        return;
    }

    spinner.classList.remove('hidden');
    resultsDiv.innerHTML = '<div class="text-center p-md text-sm text-on-surface-variant">Searching...</div>';

    try {
        const res = await fetch(`/staff/dashboard/search-patients?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            const patients = data.data;
            countSpan.textContent = `(${patients.length})`;
            let html = '<div class="divide-y divide-outline-variant/30">';
            
            patients.forEach(pat => {
                html += `
                    <div class="p-md flex items-center justify-between hover:bg-surface-container/30 transition-colors">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                                ${pat.firstName ? pat.firstName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <p class="font-bold text-on-surface text-base">${pat.firstName} ${pat.lastName || ''}</p>
                                <div class="flex items-center gap-4 mt-1 text-xs text-on-surface-variant">
                                    <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">phone</span> ${pat.mobile || 'N/A'}</span>
                                    <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">mail</span> ${pat.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">

                            <button onclick="startBooking('${pat.id}', '${pat.firstName}', '${pat.lastName}', '${pat.mobile}', '${pat.email}')" 
                                class="px-4 py-2 text-sm bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all shadow-sm">
                                Book Appointment
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            resultsDiv.innerHTML = html;
        } else {
            countSpan.textContent = '(0)';
            resultsDiv.innerHTML = `
                <div class="text-center p-lg text-on-surface-variant">
                    <p class="mb-3 text-sm">No patients found for "${query}"</p>
                    <button onclick="openRegisterPatientModal()" class="text-sm text-primary font-semibold hover:underline">
                        + Register New Patient
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching patients:', error);
        resultsDiv.innerHTML = '<div class="text-center p-md text-red-500 text-sm">Error connecting to server. Please try again.</div>';
    } finally {
        spinner.classList.add('hidden');
    }
}

// This function stores the patient info in sessionStorage and navigates to the doctor selection page
function startBooking(id, firstName, lastName, mobile, email) {
    const patientData = {
        id, 
        firstName, 
        lastName, 
        mobile, 
        email
    };
    // Use sessionStorage so we remember it during this booking flow
    sessionStorage.setItem('bookingPatient', JSON.stringify(patientData));
    
    // Redirect to doctors listing
    window.location.href = '/staff/doctors';
}

function openRegisterPatientModal() {
    document.getElementById('registerPatientModal').classList.remove('hidden');
}

function closeRegisterPatientModal() {
    document.getElementById('registerPatientModal').classList.add('hidden');
    document.getElementById('registerPatientForm').reset();
    document.getElementById('regError').classList.add('hidden');
}

async function submitRegisterPatient(e) {
    e.preventDefault();
    const btn = document.getElementById('regSubmitBtn');
    const err = document.getElementById('regError');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Registering...';
    err.classList.add('hidden');

    const payload = {
        firstName: document.getElementById('regFirstName').value.trim(),
        lastName: document.getElementById('regLastName').value.trim(),
        mobile: document.getElementById('regMobile').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        dateOfBirth: document.getElementById('regDob').value,
        gender: document.getElementById('regGender').value,
        bloodGroup: document.getElementById('regBloodGroup').value,
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch('/staff/dashboard/register-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            closeRegisterPatientModal();
            alert('Patient registered successfully! You can now book an appointment.');
            // optionally prepopulate search and run search
            document.getElementById('patientTabSearch').value = payload.mobile;
            searchPatients();
        } else {
            err.textContent = data.message || 'Registration failed.';
            err.classList.remove('hidden');
        }
    } catch (error) {
        err.textContent = 'Server error. Please try again.';
        err.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px] hidden">autorenew</span> Register';
    }
}
