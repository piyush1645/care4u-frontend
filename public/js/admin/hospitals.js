/**
 * admin/hospitals.js
 * JS for Hospital Network management page in Admin Dashboard.
 */

// Micro-interactions for grid cards
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
});
