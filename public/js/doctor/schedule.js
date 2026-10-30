const toggleMorning = document.getElementById('toggleMorning');
const morningInputs = document.getElementById('morningInputs');
const morningStartTime = document.getElementById('morningStartTime');
const morningEndTime = document.getElementById('morningEndTime');

const toggleEvening = document.getElementById('toggleEvening');
const eveningInputs = document.getElementById('eveningInputs');
const eveningStartTime = document.getElementById('eveningStartTime');
const eveningEndTime = document.getElementById('eveningEndTime');

toggleMorning.addEventListener('change', (e) => {
    if(e.target.checked) {
        morningInputs.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        morningInputs.classList.add('opacity-50', 'pointer-events-none');
        morningStartTime.value = '';
        morningEndTime.value = '';
    }
});

toggleEvening.addEventListener('change', (e) => {
    if(e.target.checked) {
        eveningInputs.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        eveningInputs.classList.add('opacity-50', 'pointer-events-none');
        eveningStartTime.value = '';
        eveningEndTime.value = '';
    }
});

document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';
    btn.disabled = true;

    const selectedDays = Array.from(document.querySelectorAll('input[name="workingDays"]:checked')).map(cb => cb.value);
    
    if(selectedDays.length === 0) {
        alert("Please select at least one working day.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const formatISO = (timeStr) => {
        if(!timeStr) return null;
        // Parse as IST (+05:30) so the stored UTC value is correct true UTC
        // e.g. doctor enters "09:30" IST → stored as "04:00 UTC" (09:30 - 5:30)
        return new Date(`1970-01-01T${timeStr}:00+05:30`).toISOString();
    };

    const payload = {
        workingDays: selectedDays.join(','),
        morningStartTime: toggleMorning.checked ? formatISO(morningStartTime.value) : null,
        morningEndTime: toggleMorning.checked ? formatISO(morningEndTime.value) : null,
        eveningStartTime: toggleEvening.checked ? formatISO(eveningStartTime.value) : null,
        eveningEndTime: toggleEvening.checked ? formatISO(eveningEndTime.value) : null,
    };

    if(toggleMorning.checked && (!payload.morningStartTime || !payload.morningEndTime)) {
        alert("Please provide both start and end times for the morning shift, or disable it.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    if(toggleEvening.checked && (!payload.eveningStartTime || !payload.eveningEndTime)) {
        alert("Please provide both start and end times for the evening shift, or disable it.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const doctorId = urlParams.get('doctorId');
        const fetchUrl = doctorId ? `/doctor/schedule?doctorId=${doctorId}` : '/doctor/schedule';

        const response = await fetch(fetchUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if(response.ok && (result.success || result.response?.success)) {
            // Success toast
            const toast = document.getElementById('successToast');
            toast.classList.remove('translate-y-32', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            
            // Update current schedule sidebar
            const currentWorkingDaysDiv = document.getElementById('currentWorkingDays');
            currentWorkingDaysDiv.innerHTML = selectedDays.map(day => `
                <span class="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                    ${day.substring(0, 3)}
                </span>
            `).join('');

            const morningText = toggleMorning.checked ? `${morningStartTime.value} - ${morningEndTime.value}` : 'Off Duty';
            document.getElementById('currentMorningTime').textContent = morningText;

            const eveningText = toggleEvening.checked ? `${eveningStartTime.value} - ${eveningEndTime.value}` : 'Off Duty';
            document.getElementById('currentEveningTime').textContent = eveningText;

            setTimeout(() => {
                toast.classList.add('translate-y-32', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 4000);
        } else {
            alert('Error saving schedule: ' + (result.response?.message || result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error(error);
        alert('A network error occurred.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
i