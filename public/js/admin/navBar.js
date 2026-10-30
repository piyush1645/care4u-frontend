function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentFullPath = currentPath + currentSearch;

    const navLinks = document.querySelectorAll("#sidebar nav a");
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute("href");
        const isSub = link.getAttribute("data-nav-type") === "sub";
        
        const hasQuery = linkPath.includes('?');
        const currentHasQuery = currentFullPath.includes('?');
        
        let isActive = false;
        if (hasQuery) {
            isActive = (linkPath === currentFullPath);
        } else {
            const linkBase = linkPath.split('?')[0];
            if (linkBase === '/admin/doctors') {
                isActive = currentPath.startsWith('/admin/doctors') || currentPath.startsWith('/admin/doctorProfile');
            } else if (linkBase === '/admin/staff') {
                isActive = currentPath === '/admin/staff';
            } else if (linkBase === '/doctor/register') {
                isActive = currentPath === '/doctor/register';
            } else if (linkBase === '/admin/staff/register') {
                isActive = currentPath === '/admin/staff/register';
            } else {
                isActive = (linkBase === currentPath) && !currentHasQuery;
            }
        }

        if (isActive) {
            if (isSub) {
                link.className = "flex items-center gap-4 px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-semibold mb-1 pl-8 shadow-sm";
            } else {
                link.className = "flex items-center gap-4 px-4 py-3 rounded-lg bg-primary text-on-primary font-medium mb-1 shadow-sm";
            }
        } else {
            if (isSub) {
                link.className = "flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 hover:text-primary font-medium mb-1 pl-8";
            } else {
                link.className = "flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 hover:text-primary font-medium mb-1";
            }
        }
    });
});
