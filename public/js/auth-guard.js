(function() {
    const token = localStorage.getItem('navaritha_token');
    const user = localStorage.getItem('navaritha_user');
    
    // Normalize path to ignore domain/port
    const fullPath = window.location.pathname;
    const fileName = fullPath.split('/').pop().toLowerCase();
    const isLandingPage = fileName === 'index.html' || fileName === '' || fullPath === '/';

    console.log('[AuthGuard] Path Analysis:', { fullPath, fileName, isLandingPage, authenticated: !!token });

    if (token && user) {
        // --- LOGGED IN ---
        if (isLandingPage) {
            console.log('[AuthGuard] User identified. Redirecting to Marketplace...');
            window.location.replace('listings.html');
        }
    } else {
        // --- NOT LOGGED IN ---
        if (!isLandingPage) {
            console.warn('[AuthGuard] Blocked access to restricted page. Redirecting to Login...');
            window.location.replace('index.html?view=login');
        } else {
            // Force login toggle if requested
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('view') === 'login') {
                const checkExist = setInterval(() => {
                    const container = document.getElementById('authContainer');
                    if (container) {
                        container.classList.add('show-login');
                        clearInterval(checkExist);
                    }
                }, 50);
                setTimeout(() => clearInterval(checkExist), 2000); // safety
            }
        }
    }

    window.logout = function() {
        localStorage.clear();
        window.location.replace('index.html');
    };
})();
