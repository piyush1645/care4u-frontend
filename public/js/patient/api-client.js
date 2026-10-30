/**
 * Centralized API Fetch Client
 */

/**
 * Perform an authenticated HTTP fetch to the backend API
 * @param {string} endpoint - API path (e.g., '/patient/profile')
 * @param {Object} options - Standard fetch options
 * @returns {Promise<any>} Response json data
 */
async function apiFetch(endpoint, options = {}) {
    const token = getCookie('accessToken');
    
    // Set headers
    const headers = {
        'Accept': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type if uploading FormData (let fetch configure boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    let baseUrl = window.API_BASE_URL || 'http://localhost:3004/api/v1';
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    
    let path = endpoint;
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    try {
        const response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers
        });

        // Auto logout on authorization failures
        if (response.status === 401 || response.status === 403) {
            console.warn("API Authorization failure (401/403). Clearing session...");
            deleteAllCookies();
            window.location.href = "/auth/login";
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        let result = {};

        if (response.status === 204) {
            result = {};
        } else if (contentType.includes('application/json')) {
            try {
                result = await response.json();
            } catch {
                result = {};
            }
        } else {
            const text = await response.text().catch(() => '');
            result = text ? { message: text } : {};
        }
        
        return {
            ok: response.ok,
            status: response.status,
            ...result
        };
    } catch (error) {
        console.error(`Fetch API Error for ${endpoint}:`, error);
        throw error;
    }
}
