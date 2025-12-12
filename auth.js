// auth.js - Authentication utilities
class Auth {
    static isAuthenticated() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        return !!(token && user);
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static getToken() {
        return localStorage.getItem('token');
    }

    static getUserRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    static getUserName() {
        const user = this.getUser();
        return user ? user.name : 'User';
    }

    static getUserEmail() {
        const user = this.getUser();
        return user ? user.email : '';
    }

    static getUserInitials() {
        const user = this.getUser();
        if (!user || !user.name) return 'U';
        
        return user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    static logout() {
        // Call backend logout if needed (optional)
        this.callBackendLogout().catch(console.error);
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    static async callBackendLogout() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${API_BASE_URL}/users/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });
            }
        } catch (error) {
            console.log('Backend logout optional - continuing with client logout');
        }
    }

    static requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    static requireRole(requiredRole) {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }

        const userRole = this.getUserRole();
        if (userRole !== requiredRole) {
            alert('You do not have permission to access this page.');
            window.location.href = 'dashboard.html';
            return false;
        }

        return true;
    }

    // API call with authentication
    static async apiCall(endpoint, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const token = this.getToken();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        });

        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    }

    // Initialize authentication on page load
    static init() {
        this.requireAuth();
        this.setupLogoutHandlers();
        this.updateUserInterface();
    }

    // Setup logout handlers for all logout links/buttons
    static setupLogoutHandlers() {
        // Handle logout links
        const logoutLinks = document.querySelectorAll('a[href="login.html"]');
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        });

        // Handle logout buttons with specific class
        const logoutButtons = document.querySelectorAll('.logout-btn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        });
    }

    // Update user information in the UI
    static updateUserInterface() {
        const user = this.getUser();
        if (!user) return;

        // Update user avatar
        const userAvatars = document.querySelectorAll('.user-avatar');
        userAvatars.forEach(avatar => {
            avatar.textContent = this.getUserInitials();
        });

        // Update user name
        const userNames = document.querySelectorAll('.user-name, #userName');
        userNames.forEach(element => {
            if (element.id === 'userName' || element.classList.contains('user-name')) {
                element.textContent = this.getUserName();
            }
        });

        // Update user role
        const userRoles = document.querySelectorAll('.user-role, #userRole');
        userRoles.forEach(element => {
            if (element.id === 'userRole' || element.classList.contains('user-role')) {
                element.textContent = this.getUserRole();
            }
        });

        // Update user email
        const userEmails = document.querySelectorAll('.user-email, #userEmail');
        userEmails.forEach(element => {
            if (element.id === 'userEmail' || element.classList.contains('user-email')) {
                element.textContent = this.getUserEmail();
            }
        });
    }
}

// Global API base URL
const API_BASE_URL = 'https://malexoffice-bkdt.onrender.com/api';