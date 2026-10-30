// Toggle Sidebar visibility on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// Close sidebar on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    }
});

// Extract token from browser cookie
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};
const token = getCookie('accessToken');

let hospitalGroupsList = [];

function switchTab(tab) {
    const tabBtnGroup = document.getElementById('tabBtnGroup');
    const tabBtnAdmin = document.getElementById('tabBtnAdmin');
    const formGroupCard = document.getElementById('formGroupCard');
    const formAdminCard = document.getElementById('formAdminCard');

    if (tab === 'group') {
        tabBtnGroup.className = "flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 bg-primary text-on-primary shadow-sm";
        tabBtnAdmin.className = "flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 text-on-surface-variant hover:bg-surface-container-low";
        formGroupCard.classList.remove('hidden');
        formAdminCard.classList.add('hidden');
    } else {
        tabBtnAdmin.className = "flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 bg-primary text-on-primary shadow-sm";
        tabBtnGroup.className = "flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 text-on-surface-variant hover:bg-surface-container-low";
        formAdminCard.classList.remove('hidden');
        formGroupCard.classList.add('hidden');
    }
}

async function fetchDirectory() {
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
            renderDirectory();
            populateGroupSelect();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'Failed to fetch directory'
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to backend service.'
        });
    }
}

function renderDirectory() {
    const tableBody = document.getElementById('groupTableBody');
    const groupCountText = document.getElementById('groupCountText');
    const adminCountText = document.getElementById('adminCountText');

    groupCountText.innerText = hospitalGroupsList.length;
    
    let assignedAdminCount = 0;

    if (hospitalGroupsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-12 text-on-surface-variant text-sm">No hospital groups registered yet.</td>
            </tr>
        `;
        adminCountText.innerText = 0;
        return;
    }

    let rowsHtml = '';
    const defaultLogo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='4' fill='%23dae2ff'/><path d='M19 4H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V8h2v4h4v2z' fill='%23003d9b'/></svg>";

    hospitalGroupsList.forEach(group => {
        const hasAdmin = !!group.admin;
        if (hasAdmin) assignedAdminCount++;

        const logoUrl = group.logo || defaultLogo;
        const adminName = hasAdmin ? `${group.admin.firstName} ${group.admin.lastName}` : 'No Admin Assigned';
        const adminEmail = hasAdmin ? group.admin.credential.email : '—';
        const adminMobile = hasAdmin ? group.admin.credential.mobile : '—';

        const statusColor = group.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
        const statusLabel = group.isActive ? 'Active' : 'Deactivated';

        const actionButton = group.isActive 
            ? `<button onclick="event.stopPropagation(); toggleGroupStatus('${group.id}', 'deactivate')" class="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all">Deactivate</button>`
            : `<button onclick="event.stopPropagation(); toggleGroupStatus('${group.id}', 'activate')" class="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all">Activate</button>`;

        rowsHtml += `
            <tr class="hover:bg-[#f0f3ff] transition-colors cursor-pointer" onclick="window.location.href='/superadmin/analytics?tab=engagement&groupId=${group.id}'">
                <td class="px-md py-4">
                    <div class="flex items-center gap-3">
                        <img src="${logoUrl}" alt="${group.name}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" onerror="this.onerror=null; this.src='${defaultLogo}'">
                        <div>
                            <p class="font-semibold text-on-surface text-sm">${group.name}</p>
                            <p class="text-[10px] text-on-surface-variant">ID: #${group.id}</p>
                        </div>
                    </div>
                </td>
                <td class="px-md py-4 text-sm font-semibold text-on-surface">
                    ${adminName}
                </td>
                <td class="px-md py-4">
                    <p class="text-xs text-on-surface font-medium">${adminEmail}</p>
                    <p class="text-[10px] text-on-surface-variant mt-0.5">${adminMobile}</p>
                </td>
                <td class="px-md py-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}">
                        ${statusLabel}
                    </span>
                </td>
                <td class="px-md py-4 text-right animate-none">
                    ${actionButton}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
    adminCountText.innerText = assignedAdminCount;
}

function populateGroupSelect() {
    const select = document.getElementById('adminGroupSelect');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select Group</option>';
    
    // Only groups that are active can have admins added
    const activeGroups = hospitalGroupsList.filter(g => g.isActive);
    
    activeGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.innerText = group.name;
        select.appendChild(option);
    });
}

async function handleGroupSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('groupName').value;
    const logo = document.getElementById('groupLogo').value;

    try {
        const response = await fetch('http://localhost:3004/api/v1/hospital-group/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, logo })
        });

        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Hospital Group registered successfully!',
                timer: 1500,
                showConfirmButton: false
            });
            document.getElementById('groupForm').reset();
            fetchDirectory();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: result.message || 'Unknown error occurred.'
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to backend service.'
        });
    }
}

async function handleAdminSubmit(event) {
    event.preventDefault();
    const hospitalGroupId = document.getElementById('adminGroupSelect').value;
    const firstName = document.getElementById('adminFirstName').value;
    const lastName = document.getElementById('adminLastName').value;
    const gender = document.getElementById('adminGender').value;
    const dateOfBirth = document.getElementById('adminDOB').value;
    const email = document.getElementById('adminEmail').value;
    const mobile = document.getElementById('adminMobile').value;
    const password = document.getElementById('adminPassword').value;

    const payload = {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        email,
        mobile: Number(mobile),
        password,
        hospitalGroupId: Number(hospitalGroupId)
    };

    try {
        const response = await fetch('http://localhost:3004/api/v1/admin/registerAdmin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Administrator registered successfully!',
                timer: 1500,
                showConfirmButton: false
            });
            document.getElementById('adminForm').reset();
            fetchDirectory();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: result.message || 'Unknown error occurred.'
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to backend service.'
        });
    }
}

async function toggleGroupStatus(groupId, action) {
    const confirmResult = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to ${action} this hospital group?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#003d9b',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: `Yes, ${action}!`
    });

    if (!confirmResult.isConfirmed) return;

    const url = `http://localhost:3004/api/v1/hospital-group/${groupId}`;
    const method = action === 'deactivate' ? 'DELETE' : 'PATCH';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                text: `Hospital group has been successfully ${action}d.`,
                timer: 1500,
                showConfirmButton: false
            });
            fetchDirectory();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: result.message || `Failed to ${action} group.`
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to backend service.'
        });
    }
}

function refreshData() {
    fetchDirectory();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchDirectory();
});
