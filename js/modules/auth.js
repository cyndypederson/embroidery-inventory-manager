// Authentication Module
// Handles admin authentication and password management

// Authentication state
let isAuthenticated = false;

// Check if running on localhost
function isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '';
}

function checkAuthentication() {
    const authStatus = sessionStorage.getItem('embroideryAuth');
    isAuthenticated = authStatus === 'true';
    return isAuthenticated;
}

function setAuthenticated(status) {
    isAuthenticated = status;
    sessionStorage.setItem('embroideryAuth', status.toString());
}

function requireAuth(tabName) {
    // Skip authentication on localhost
    if (isLocalhost()) {
        return true;
    }
    
    // Only require auth for sales and reports on production
    if (tabName === 'sales' || tabName === 'reports') {
        if (!checkAuthentication()) {
            sessionStorage.setItem('requestedTab', tabName);
            showAuthModal();
            return false;
        }
    }
    return true;
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('adminPassword').focus();
}

function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('authError').style.display = 'none';
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === window.ADMIN_PASSWORD) {
        setAuthenticated(true);
        hideAuthModal();
        // Switch to the requested tab
        const requestedTab = sessionStorage.getItem('requestedTab');
        if (requestedTab) {
            switchTab(requestedTab);
            sessionStorage.removeItem('requestedTab');
        }
    } else {
        document.getElementById('authError').style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

function logout() {
    setAuthenticated(false);
    console.log('Logged out successfully!');
    // Switch to inventory tab
    switchTab('inventory');
}

// Password change functions
function showChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'block';
    document.getElementById('currentPassword').focus();
}

function hideChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordError').style.display = 'none';
    document.getElementById('changePasswordSuccess').style.display = 'none';
}

function handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Clear previous messages
    document.getElementById('changePasswordError').style.display = 'none';
    document.getElementById('changePasswordSuccess').style.display = 'none';
    
    // Validate current password
    if (currentPassword !== window.ADMIN_PASSWORD) {
        document.getElementById('changePasswordErrorText').textContent = 'Current password is incorrect.';
        document.getElementById('changePasswordError').style.display = 'block';
        return;
    }
    
    // Validate new password
    if (newPassword.length < 4) {
        document.getElementById('changePasswordErrorText').textContent = 'New password must be at least 4 characters long.';
        document.getElementById('changePasswordError').style.display = 'block';
        return;
    }
    
    // Validate password confirmation
    if (newPassword !== confirmPassword) {
        document.getElementById('changePasswordErrorText').textContent = 'New passwords do not match.';
        document.getElementById('changePasswordError').style.display = 'block';
        return;
    }
    
    // Update password
    window.ADMIN_PASSWORD = newPassword;
    
    // Show success message
    document.getElementById('changePasswordSuccess').style.display = 'block';
    
    // Hide modal after 2 seconds
    setTimeout(() => {
        hideChangePasswordModal();
    }, 2000);
}

// Function to change password (you can call this from browser console)
function changePassword(newPassword) {
    window.ADMIN_PASSWORD = newPassword;
    console.log('Password changed successfully!');
}

// Initialize auth module
function initAuth() {
    // Check authentication status
    checkAuthentication();
    
    // Set up event listeners
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    document.getElementById('closeAuthModal').addEventListener('click', hideAuthModal);
    document.getElementById('cancelAuth').addEventListener('click', hideAuthModal);
    
    // Close auth modal when clicking outside
    document.getElementById('authModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideAuthModal();
        }
    });
    
    // Password change event listeners
    document.getElementById('changePasswordBtn').addEventListener('click', showChangePasswordModal);
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
    document.getElementById('closeChangePasswordModal').addEventListener('click', hideChangePasswordModal);
    document.getElementById('cancelChangePassword').addEventListener('click', hideChangePasswordModal);
    
    // Close change password modal when clicking outside
    document.getElementById('changePasswordModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideChangePasswordModal();
        }
    });
}

// Export functions for use in other modules
window.authModule = {
    checkAuthentication,
    setAuthenticated,
    requireAuth,
    showAuthModal,
    hideAuthModal,
    logout,
    initAuth
};
