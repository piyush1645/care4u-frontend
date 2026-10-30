(() => {
  const routes = [
    { id: "nav-dashboard", match: "/patient/dashboard" },
    { id: "nav-doctors", match: "/patient/doctors" },
    { id: "nav-appointments", match: "/patient/appointments" },
    { id: "nav-profile", match: "/patient/profile" },
  ];

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const getApiBaseUrl = () =>
    (window.API_BASE_URL || "http://localhost:3004/api/v1").replace(/\/+$/, "");
  const buildApiUrl = (path) =>
    `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-overlay");
    if (!sidebar || !overlay) return;

    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  }

  function activateNav() {
    const path = window.location.pathname || "/";
    const currentRoute = routes.find(
      (route) => path === route.match || path.startsWith(`${route.match}/`),
    );

    if (!currentRoute) return;

    const link = document.getElementById(currentRoute.id);
    if (!link) return;

    link.classList.remove(
      "text-slate-600",
      "hover:bg-slate-50",
      "hover:text-[#002868]",
    );
    link.classList.add("bg-[#002868]", "text-white", "shadow-sm");
  }

  async function loadHeaderProfile() {
    const token = getCookie("accessToken");
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl("/patient/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const { success, data } = await response.json();
      if (!success || !data) return;

      const nameEl = document.getElementById("headerPatientName");
      if (nameEl) nameEl.textContent = data.firstName;

      const avatarWrap = document.getElementById("headerAvatarWrap");
      if (avatarWrap) {
        avatarWrap.innerHTML = `<img src="${data.profilePhoto || "/images/default-avatar.svg"}" onerror="this.onerror=null; this.src='/images/default-avatar.svg';" class="w-full h-full object-cover rounded-full" />`;
      }
    } catch (error) {
      console.error("Error loading topheader profile:", error);
    }
  }

  function init() {
    window.toggleSidebar = toggleSidebar;
    activateNav();
    loadHeaderProfile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
