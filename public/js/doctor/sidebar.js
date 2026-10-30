function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('doctorId');
    const navLinks = document.querySelectorAll("#sidebar nav a");
    
    navLinks.forEach(link => {
        let linkPath = link.getAttribute("href");
        if (doctorId && linkPath.startsWith('/doctor') && !linkPath.includes('doctorId=')) {
            linkPath = `${linkPath}${linkPath.includes('?') ? '&' : '?'}doctorId=${doctorId}`;
            link.setAttribute('href', linkPath);
        }
        
        const cleanLinkPath = linkPath.split('?')[0];
        if (cleanLinkPath === currentPath) {
            link.className = "flex items-center gap-4 px-4 py-3 rounded-lg bg-[#002868] text-white font-medium mb-1 shadow-sm";
        } else {
            link.className = "flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 hover:text-[#002868] font-medium mb-1";
        }
    });
});
