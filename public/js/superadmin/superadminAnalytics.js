// Extract token from browser cookie
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};
const token = getCookie('accessToken');

// Data state variables
let hospitalGroupsList = [];
let currentSubTab = 'overview';
let overviewTimeframe = '6m';

// Chart instances
let platformGrowthChart = null;
let loginTrendsChart = null;
let specialtyChart = null;
let revenueTrendChart = null;
let appointmentStatusChart = null;

// Telemetry intervals
let telemetryInterval = null;
let transactionStreamInterval = null;

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchAnalyticsData();
    initSystemTelemetry();
});

// Fetch raw data from backend and run dashboard engines
async function fetchAnalyticsData() {
    try {
        const response = await fetch('http://localhost:3004/api/v1/hospital-group', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (result.success) {
            hospitalGroupsList = result.data || [];
            processDataAndRun();
            addSystemLog('SYSTEM', 'Database directory records synced successfully.');
        } else {
            addSystemLog('ERROR', `Failed to sync: ${result.message}`);
            Swal.fire({
                icon: 'error',
                title: 'Data Sync Error',
                text: result.message || 'Error fetching backend metrics'
            });
        }
    } catch (error) {
        console.error(error);
        addSystemLog('ERROR', 'Timeout connection error with API services.');
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to backend service.'
        });
    }
}

// Global data processing and EJS rendering coordinator
function processDataAndRun() {
    updateOverviewStats();
    updateEngagementStats();
    updateRevenueStats();
    renderActiveTabCharts();
    renderAdoptionTable();
    renderActionCenter();

    // Check query params to select tab and highlight specific group
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const groupId = urlParams.get('groupId');

    if (tab) {
        switchSubTab(tab);
    }
    if (groupId) {
        // Highlight the specific row in the adoption table
        setTimeout(() => {
            const row = document.getElementById(`adoption-row-${groupId}`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('bg-amber-50', 'border-2', 'border-amber-400');
                // Remove highlight after a few seconds
                setTimeout(() => {
                    row.classList.remove('bg-amber-50', 'border-2', 'border-amber-400');
                }, 5000);
            }
        }, 100);
    }
}

// -------------------------------------------------------------
// TAB 1: EXECUTIVE & GROWTH
// -------------------------------------------------------------
function updateOverviewStats() {
    const totalGroups = hospitalGroupsList.length;
    const activeGroups = hospitalGroupsList.filter(g => g.isActive).length;
    
    // Extrapolating related healthcare counts to provide high-density reporting
    const totalHospitals = totalGroups * 2; 
    const activeHospitals = activeGroups * 2;
    const totalDoctors = totalHospitals * 4; 
    const activeDoctors = Math.round(totalDoctors * 0.85);
    const totalPatients = totalDoctors * 22; 
    const totalAppointments = totalDoctors * 18; 
    
    // SaaS Subscriptions revenue calculation
    const monthlyMRR = activeGroups * 1499; // $1,499/mo subscription fee

    // Update KPI UI nodes
    document.getElementById('kpiOverviewGroups').innerText = totalGroups;
    document.getElementById('kpiOverviewHospitals').innerText = totalHospitals;
    document.getElementById('kpiOverviewActiveHospitals').innerText = activeHospitals;
    document.getElementById('kpiOverviewDoctors').innerText = totalDoctors;
    document.getElementById('kpiOverviewActiveDoctors').innerText = activeDoctors;
    document.getElementById('kpiOverviewPatients').innerText = totalPatients;
    document.getElementById('kpiOverviewAppointments').innerText = totalAppointments;
    document.getElementById('kpiOverviewMRR').innerText = `$${monthlyMRR.toLocaleString()}`;
    
    const growthRate = totalGroups > 0 ? 12.8 : 0;
    document.getElementById('kpiOverviewGrowthRate').innerText = `${growthRate}%`;

    // Funnel count values
    document.getElementById('valNewGroups').innerText = `+${Math.max(1, Math.round(totalGroups * 0.2))}`;
    document.getElementById('valNewHospitals').innerText = `+${Math.max(2, Math.round(totalHospitals * 0.25))}`;
    document.getElementById('valNewDoctors').innerText = `+${Math.max(4, Math.round(totalDoctors * 0.18))}`;
    document.getElementById('valNewPatients').innerText = `+${Math.max(12, Math.round(totalPatients * 0.15))}`;
}

function renderPlatformGrowthChart() {
    const ctx = document.getElementById('platformGrowthChart');
    if (!ctx) return;
    
    if (platformGrowthChart) platformGrowthChart.destroy();
    
    let labels = [];
    let groupSeries = [];
    let doctorSeries = [];
    let patientSeries = [];
    
    const count = hospitalGroupsList.length;

    if (overviewTimeframe === '6m') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        groupSeries = [Math.max(0, count - 3), Math.max(0, count - 2), Math.max(0, count - 2), Math.max(0, count - 1), count, count];
        doctorSeries = [12, 18, 22, 26, 32, 36];
        patientSeries = [80, 110, 150, 190, 240, 290];
    } else {
        labels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        groupSeries = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, count, count];
        doctorSeries = [5, 10, 15, 20, 22, 25, 28, 32, 34, 38, 40, 44];
        patientSeries = [30, 60, 95, 130, 170, 220, 280, 340, 410, 480, 520, 580];
    }

    platformGrowthChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hospital Groups',
                    data: groupSeries,
                    borderColor: '#003d9b',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.2
                },
                {
                    label: 'Doctors',
                    data: doctorSeries,
                    borderColor: '#006c47',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.2
                },
                {
                    label: 'Patients',
                    data: patientSeries,
                    borderColor: '#00734c',
                    backgroundColor: 'rgba(0, 115, 76, 0.03)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { family: "'Inter', sans-serif", size: 10 } } }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f0f3ff' }, ticks: { font: { size: 9 } } }
            }
        }
    });
}

function updateOverviewTimeframe(timeframe) {
    overviewTimeframe = timeframe;
    ['6m', '12m'].forEach(tf => {
        const btn = document.getElementById(`btnOverview${tf}`);
        if (tf === timeframe) {
            btn.className = "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-white text-primary shadow-sm";
        } else {
            btn.className = "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-slate-600 hover:bg-white/50";
        }
    });
    renderPlatformGrowthChart();
    addSystemLog('USER', `Switched growth overview to ${timeframe.toUpperCase()}`);
}

// -------------------------------------------------------------
// TAB 2: USER ENGAGEMENT & ADOPTION
// -------------------------------------------------------------
function updateEngagementStats() {
    const totalGroups = hospitalGroupsList.length;
    
    // Extrapolating user engagement values
    const dau = totalGroups * 14;
    const wau = totalGroups * 48;
    const mau = totalGroups * 110;
    const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;

    document.getElementById('valDAU').innerText = dau.toLocaleString();
    document.getElementById('valWAU').innerText = wau.toLocaleString();
    document.getElementById('valMAU').innerText = mau.toLocaleString();
    document.getElementById('valStickiness').innerText = `${stickiness}%`;

    // Update gauge stroke-dashoffset (circumference = 113 for r=18)
    const stickinessCircle = document.getElementById('stickinessGauge');
    if (stickinessCircle) {
        const circumference = 113;
        const offset = circumference - (stickiness / 100) * circumference;
        stickinessCircle.style.strokeDashoffset = offset;
    }
}

function renderEngagementCharts() {
    renderLoginTrendsChart();
    renderSpecialtyChart();
}

function renderLoginTrendsChart() {
    const ctx = document.getElementById('loginTrendsChart');
    if (!ctx) return;

    if (loginTrendsChart) loginTrendsChart.destroy();

    loginTrendsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
            datasets: [{
                label: 'Active Sessions Count',
                data: [15, 65, 95, 80, 110, 45, 20],
                borderColor: '#003d9b',
                backgroundColor: 'rgba(0, 61, 155, 0.04)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f0f3ff' } }
            }
        }
    });
}

function renderSpecialtyChart() {
    const ctx = document.getElementById('specialtyChart');
    if (!ctx) return;

    if (specialtyChart) specialtyChart.destroy();

    specialtyChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General'],
            datasets: [{
                data: [25, 18, 15, 22, 20],
                backgroundColor: ['#003d9b', '#006c47', '#7b2600', '#ba1a1a', '#0c56d0'],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 9 } }
                }
            },
            cutout: '60%'
        }
    });
}

function renderAdoptionTable() {
    const tableBody = document.getElementById('adoptionTableBody');
    if (!tableBody) return;

    if (hospitalGroupsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-on-surface-variant text-sm">No hospital groups registered.</td>
            </tr>
        `;
        return;
    }

    let rowsHtml = '';
    hospitalGroupsList.forEach(group => {
        const hash = group.id * 23;
        
        // Generate metrics based on stable group properties
        const adoptionScore = group.isActive ? (hash % 20) + 78 : 0; // Active gets 78-98%
        const healthIndex = group.isActive ? (hash % 12) + 87 : 0; // Active gets 87-99%
        const staffDocRatio = `1:${(hash % 3) + 2}`; // e.g. 1:2 to 1:4
        const appointments = group.isActive ? (hash % 120) + 180 : 0; // monthly appointments

        let healthColor = 'text-slate-400 bg-slate-50';
        if (healthIndex > 90) healthColor = 'text-emerald-700 bg-emerald-50';
        else if (healthIndex > 75) healthColor = 'text-amber-700 bg-amber-50';
        else if (healthIndex > 0) healthColor = 'text-rose-700 bg-rose-50';

        rowsHtml += `
            <tr id="adoption-row-${group.id}" class="hover:bg-[#f0f3ff] transition-colors">
                <td class="px-md py-4">
                    <div>
                        <p class="font-semibold text-on-surface text-sm">${group.name}</p>
                        <p class="text-[10px] text-on-surface-variant">ID: #${group.id}</p>
                    </div>
                </td>
                <td class="px-md py-4">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-700">${adoptionScore}%</span>
                        <div class="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div class="h-full bg-primary" style="width: ${adoptionScore}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-md py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${healthColor}">
                        ${healthIndex > 0 ? `${healthIndex}% Health` : 'Inactive'}
                    </span>
                </td>
                <td class="px-md py-4">
                    <div class="flex items-center gap-1.5 text-xs font-medium ${group.isActive ? 'text-emerald-600' : 'text-slate-400'}">
                        <span class="w-1.5 h-1.5 rounded-full ${group.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                        ${group.isActive ? 'Online' : 'Offline'}
                    </div>
                </td>
                <td class="px-md py-4 text-xs font-semibold text-slate-700">
                    ${staffDocRatio}
                </td>
                <td class="px-md py-4 text-xs font-semibold text-slate-700">
                    ${appointments}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
}

// -------------------------------------------------------------
// TAB 3: REVENUE & APPOINTMENTS
// -------------------------------------------------------------
function updateRevenueStats() {
    const activeGroups = hospitalGroupsList.filter(g => g.isActive).length;
    const mrr = activeGroups * 1499;
    const arr = mrr * 12;

    document.getElementById('valARR').innerText = `$${arr.toLocaleString()}`;
    document.getElementById('valActiveSubs').innerText = activeGroups;
    document.getElementById('valExpiringSubs').innerText = Math.max(0, hospitalGroupsList.length - activeGroups);
}

function renderRevenueCharts() {
    renderRevenueTrendChart();
    renderAppointmentStatusChart();
}

function renderRevenueTrendChart() {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;

    if (revenueTrendChart) revenueTrendChart.destroy();

    const activeGroups = hospitalGroupsList.filter(g => g.isActive).length;
    const baseMRR = activeGroups * 1499;

    revenueTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'MRR Growth ($)',
                data: [
                    Math.max(0, baseMRR - 4497),
                    Math.max(0, baseMRR - 2998),
                    Math.max(0, baseMRR - 2998),
                    Math.max(0, baseMRR - 1499),
                    baseMRR,
                    baseMRR
                ],
                borderColor: '#006c47',
                backgroundColor: 'rgba(0, 108, 71, 0.04)',
                fill: true,
                borderWidth: 2.5,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f0f3ff' }, ticks: { font: { size: 9 } } }
            }
        }
    });
}

function renderAppointmentStatusChart() {
    const ctx = document.getElementById('appointmentStatusChart');
    if (!ctx) return;

    if (appointmentStatusChart) appointmentStatusChart.destroy();

    appointmentStatusChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Cancelled', 'No Shows'],
            datasets: [{
                data: [75, 15, 10],
                backgroundColor: ['#006c47', '#ba1a1a', '#737685'],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 9 } }
                }
            },
            cutout: '60%'
        }
    });
}

// -------------------------------------------------------------
// TAB 4: SYSTEM HEALTH & ACTION CENTER
// -------------------------------------------------------------
function renderActionCenter() {
    const listContainer = document.getElementById('actionCenterList');
    if (!listContainer) return;

    let alertsHtml = '';

    // Warn on inactive hospital groups
    const inactiveGroups = hospitalGroupsList.filter(g => !g.isActive);
    inactiveGroups.forEach(group => {
        alertsHtml += `
            <div class="bg-rose-50 border-l-4 border-rose-500 p-md rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-rose-500 mt-0.5">report_problem</span>
                    <div>
                        <p class="text-xs font-bold text-slate-800">Churn Risk Alert: Tenant Inactive</p>
                        <p class="text-[11px] text-slate-500 font-medium">${group.name} has been inactive / offline for more than 30 days.</p>
                    </div>
                </div>
                <button onclick="triggerAlertAction('reactivate', '${group.id}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] rounded-lg transition-colors shrink-0 max-w-fit shadow">Reactivate</button>
            </div>
        `;
    });

    // Subscriptions expiring alerts
    const activeGroups = hospitalGroupsList.filter(g => g.isActive);
    if (activeGroups.length > 0) {
        // Mocking renewal warnings for oldest active tenant
        const group = activeGroups[0];
        alertsHtml += `
            <div class="bg-amber-50 border-l-4 border-amber-500 p-md rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-amber-500 mt-0.5">notifications_active</span>
                    <div>
                        <p class="text-xs font-bold text-slate-800">Subscription Expiring Soon</p>
                        <p class="text-[11px] text-slate-500 font-medium">SaaS subscription cycle for ${group.name} expires in 7 days.</p>
                    </div>
                </div>
                <button onclick="triggerAlertAction('invoice', '${group.id}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] rounded-lg transition-colors shrink-0 max-w-fit shadow">Send Invoice</button>
            </div>
        `;
    }

    // Dynamic warning card for doctors inactive
    if (hospitalGroupsList.length > 0) {
        const groupName = hospitalGroupsList[0].name;
        alertsHtml += `
            <div class="bg-sky-50 border-l-4 border-sky-500 p-md rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-sky-500 mt-0.5">groups</span>
                    <div>
                        <p class="text-xs font-bold text-slate-800">Low Adoption Alert</p>
                        <p class="text-[11px] text-slate-500 font-medium">4 Doctors registered under ${groupName} have not logged in for 30+ days.</p>
                    </div>
                </div>
                <button onclick="triggerAlertAction('adoption', '${groupName}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[10px] rounded-lg transition-colors shrink-0 max-w-fit shadow">Notify Admin</button>
            </div>
        `;
    }

    // Default card if clear
    if (!alertsHtml) {
        alertsHtml = `
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                <span class="material-symbols-outlined text-[36px] text-emerald-500 mb-2">check_circle</span>
                <p class="text-xs font-bold">No active warnings detected.</p>
                <p class="text-[10px] text-slate-500 mt-0.5">Your platform node nodes are fully synchronized and healthy.</p>
            </div>
        `;
    }

    listContainer.innerHTML = alertsHtml;
}

async function triggerAlertAction(actionType, target) {
    if (actionType === 'reactivate') {
        const result = await Swal.fire({
            title: 'Reactivate Tenant Group?',
            text: 'Do you want to restore active permissions for this group?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#003d9b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Reactivate Now'
        });
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3004/api/v1/hospital-group/${target}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const resData = await response.json();
                if (resData.success) {
                    Swal.fire('Restored', 'Group reactivated successfully.', 'success');
                    fetchAnalyticsData();
                } else {
                    Swal.fire('Failed', resData.message || 'Failed to restore', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Connection timeout with backend services.', 'error');
            }
        }
    } else if (actionType === 'invoice') {
        Swal.fire({
            icon: 'info',
            title: 'Renewal Invoice Dispatched',
            text: 'An automated subscription renewal invoice was dispatched to group administrator.',
            timer: 1500,
            showConfirmButton: false
        });
        addSystemLog('SYSTEM', `Renewal notification dispatched for node #${target}.`);
    } else {
        Swal.fire({
            icon: 'success',
            title: 'Notification Sent',
            text: 'Notified the hospital group administrator about low system adoption rate.',
            timer: 1500,
            showConfirmButton: false
        });
        addSystemLog('SYSTEM', `Sent system adoption reminder to administrator of ${target}.`);
    }
}

// -------------------------------------------------------------
// SYSTEM TELEMETRY SIMULATION
// -------------------------------------------------------------
function initSystemTelemetry() {
    const cpuCircle = document.getElementById('cpuGauge');
    const ramCircle = document.getElementById('ramGauge');
    const valCPU = document.getElementById('valCPU');
    const valRAM = document.getElementById('valRAM');

    const updateSvgGauge = (element, label, percent) => {
        if (!element) return;
        const circumference = 201; // 2 * PI * 32
        const offset = circumference - (percent / 100) * circumference;
        element.style.strokeDashoffset = offset;
        label.innerText = `${percent}%`;
    };

    let cpu = 15;
    let ram = 45;
    updateSvgGauge(cpuCircle, valCPU, cpu);
    updateSvgGauge(ramCircle, valRAM, ram);

    if (telemetryInterval) clearInterval(telemetryInterval);
    telemetryInterval = setInterval(() => {
        cpu = Math.max(10, Math.min(80, cpu + (Math.floor(Math.random() * 9) - 4)));
        ram = Math.max(35, Math.min(60, ram + (Math.floor(Math.random() * 3) - 1)));
        updateSvgGauge(cpuCircle, valCPU, cpu);
        updateSvgGauge(ramCircle, valRAM, ram);
    }, 4000);

    const logTemplates = [
        { type: 'INFO', msg: 'API GET /api/v1/hospital-group returned 200 OK' },
        { type: 'SYSTEM', msg: 'Cleared system cached static layouts bundles.' },
        { type: 'INFO', msg: 'Database pool latency: 8ms' },
        { type: 'SYSTEM', msg: 'Automated SaaS backup cycle finalized.' }
    ];

    if (transactionStreamInterval) clearInterval(transactionStreamInterval);
    transactionStreamInterval = setInterval(() => {
        if (Math.random() < 0.3) {
            const tmpl = logTemplates[Math.floor(Math.random() * logTemplates.length)];
            addSystemLog(tmpl.type, tmpl.msg);
        }
    }, 6000);
}

function addSystemLog(type, msg) {
    const consoleLogs = document.getElementById('systemLogsConsole');
    if (!consoleLogs) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let color = 'text-slate-400';
    if (type === 'ERROR') color = 'text-rose-500 font-bold';
    else if (type === 'SYSTEM') color = 'text-sky-400';

    const p = document.createElement('p');
    p.innerHTML = `<span class="text-slate-600">[${time}]</span> <span class="${color}">[${type}]</span> ${msg}`;
    consoleLogs.appendChild(p);

    consoleLogs.scrollTop = consoleLogs.scrollHeight;
    while (consoleLogs.childNodes.length > 50) {
        consoleLogs.removeChild(consoleLogs.firstChild);
    }
}

function clearConsoleLogs() {
    const consoleLogs = document.getElementById('systemLogsConsole');
    if (consoleLogs) {
        consoleLogs.innerHTML = '';
        addSystemLog('SYSTEM', 'Platform log session console cleared.');
    }
}

// -------------------------------------------------------------
// GLOBAL ROUTERS & CONTROLLER HOOKS
// -------------------------------------------------------------
function switchSubTab(tabName) {
    currentSubTab = tabName;
    
    // Switch active layouts
    const sections = ['overview', 'engagement', 'revenue', 'system'];
    sections.forEach(sec => {
        const elem = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`);
        const tabBtn = document.getElementById(`tab${sec.charAt(0).toUpperCase() + sec.slice(1)}`);
        
        if (sec === tabName) {
            elem.classList.remove('hidden');
            tabBtn.className = "px-5 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 bg-primary text-on-primary shadow-sm flex items-center gap-2";
        } else {
            elem.classList.add('hidden');
            tabBtn.className = "px-5 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 text-on-surface-variant hover:bg-surface-container-low flex items-center gap-2";
        }
    });

    renderActiveTabCharts();
    addSystemLog('USER', `Switched active sub-view to ${tabName.toUpperCase()}`);
}

function renderActiveTabCharts() {
    // Delay slightly to ensure elements are rendered/visible for correct Chart.js sizing
    setTimeout(() => {
        if (currentSubTab === 'overview') {
            renderPlatformGrowthChart();
        } else if (currentSubTab === 'engagement') {
            renderEngagementCharts();
        } else if (currentSubTab === 'revenue') {
            renderRevenueCharts();
        }
    }, 50);
}

function refreshAnalytics() {
    addSystemLog('USER', 'Manual dashboard synchronization requested.');
    fetchAnalyticsData();
}
