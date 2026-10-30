/**
 * Find Doctors Dynamic Search Handlers
 */

document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await performSearch(1);
        });
    }
});

/**
 * Perform an authenticated API search and render results dynamically
 * @param {number} page 
 */
async function performSearch(page = 1) {
    const qInput = document.getElementById("searchQ");
    const specialityInput = document.getElementById("searchSpeciality");
    const hospitalInput = document.getElementById("searchHospital");

    const params = new URLSearchParams();
    if (qInput && qInput.value.trim()) params.set("q", qInput.value.trim());
    if (specialityInput && specialityInput.value.trim()) params.set("speciality", specialityInput.value.trim());
    if (hospitalInput && hospitalInput.value) params.set("hospitalId", hospitalInput.value);
    params.set("page", page);
    params.set("limit", "9");

    // Update browser URL query string without reloading the page
    const newRelativePathQuery = window.location.pathname + '?' + params.toString();
    history.pushState(null, '', newRelativePathQuery);

    const grid = document.getElementById('doctorsGrid');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    // Show skeletons while loading
    if (grid) {
        grid.innerHTML = Array(3).fill(0).map(() => `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
                <div class="h-44 bg-slate-100"></div>
                <div class="p-5 space-y-3">
                    <div class="h-4 bg-slate-100 rounded-lg w-3/4"></div>
                    <div class="h-3 bg-slate-100 rounded-lg w-1/2"></div>
                    <div class="h-9 bg-slate-100 rounded-xl mt-4"></div>
                </div>
            </div>
        `).join('');
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (paginationContainer) paginationContainer.innerHTML = '';

    try {
        const result = await apiFetch(`/patient/doctors/search?${params.toString()}`);
        if (!result || !result.ok || !result.success) {
            renderError(result?.message || "Failed to load doctors");
            return;
        }

        renderDoctors(result.data.items);
        renderPagination(result.data.pagination);
    } catch (err) {
        renderError("Network error — please check backend connection.");
        console.error(err);
    }
}

/**
 * Render list of doctor cards dynamically
 * @param {Array} items 
 */
function renderDoctors(items) {
    const grid = document.getElementById('doctorsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = items.map(doctor => `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div class="h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
                <img
                    src="${doctor.profilePhoto || '/images/default-avatar.svg'}"
                    alt="Dr. ${doctor.firstName} ${doctor.lastName}"
                    class="w-full h-full object-cover"
                    onerror="this.onerror=null; this.src='/images/default-avatar.svg'"
                />
            </div>
            <div class="p-5 flex flex-col gap-3 flex-1">
                <div>
                    <div class="flex flex-wrap gap-1.5 mb-2">
                        ${doctor.specialities.slice(0, 2).map(s =>
                            `<span class="px-2 py-0.5 bg-blue-50 text-primary text-[11px] font-bold rounded-full uppercase">${s}</span>`
                        ).join('')}
                    </div>
                    <h3 class="font-bold text-slate-800">Dr. ${doctor.firstName} ${doctor.lastName}</h3>
                    <p class="text-sm text-slate-500 mt-0.5">
                        ${doctor.hospital.branchName}${doctor.hospital.city ? ' · ' + doctor.hospital.city : ''}
                    </p>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center">
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <p class="text-[10px] text-slate-400 font-semibold uppercase">Experience</p>
                        <p class="text-sm font-bold text-slate-700">${doctor.expereince} yrs</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <p class="text-[10px] text-slate-400 font-semibold uppercase">Charges</p>
                        <p class="text-sm font-bold text-slate-700">₹${doctor.charges}</p>
                    </div>
                </div>
                <a href="/patient/doctors/${doctor.id}"
                    class="mt-auto w-full text-center bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                    View Details & Book
                </a>
            </div>
        </div>
    `).join('');
}

/**
 * Render pagination controls dynamically
 * @param {Object} pagination 
 */
function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container || !pagination || pagination.totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    const { page, totalPages } = pagination;
    let html = '<div class="flex items-center gap-2">';

    for (let p = 1; p <= totalPages; p++) {
        const isActive = p === parseInt(page || '1');
        html += `
            <button onclick="changePage(${p})"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all cursor-pointer
                    ${isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }"
            >${p}</button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Helper error renderer
 * @param {string} msg 
 */
function renderError(msg) {
    const grid = document.getElementById('doctorsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-400">
                <span class="material-symbols-outlined text-5xl block mb-3 opacity-40">error</span>
                <p class="text-sm">${msg}</p>
            </div>`;
    }
}

/**
 * Global callback for pagination button clicks
 * @param {number} page 
 */
window.changePage = function(page) {
    performSearch(page);
};
