function switchTab(tabId, button) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('block');
    });
    
    // Show target tab content
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    // Reset all buttons styling
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-primary', 'border-b-2', 'border-primary', 'font-semibold');
        btn.classList.add('text-on-surface-variant', 'font-medium');
    });

    // Set active button style
    button.classList.remove('text-on-surface-variant', 'font-medium');
    button.classList.add('text-primary', 'border-b-2', 'border-primary', 'font-semibold');
}
