// API Module
// Handles all API communication and data management with caching

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map();

// Error handling utilities
function logError(context, error, additionalInfo = {}) {
    console.error(`❌ ${context}:`, {
        message: error.message,
        stack: error.stack,
        ...additionalInfo
    });
}

function handleApiError(operation, error) {
    logError(`API ${operation} failed`, error);
    // For internal use, just log - no user notifications needed
}

// Connection status management
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    const connectionStatusContainer = document.getElementById('connectionStatusContainer');
    
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
        statusElement.className = 'status-indicator connected';
        if (connectionStatusContainer) {
            connectionStatusContainer.style.display = 'flex';
        }
    } else if (status === 'disconnected') {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Offline Mode';
        statusElement.className = 'status-indicator disconnected';
        if (connectionStatusContainer) {
            connectionStatusContainer.style.display = 'flex';
        } else {
            connectionStatusContainer.style.display = 'none';
        }
    } else {
        connectionStatusContainer.style.display = 'none';
    }
}

async function checkConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    try {
        const response = await fetch('/api/inventory');
        if (response.ok) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
            statusElement.className = 'status-indicator connected';
        } else {
            throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Connection check failed:', error.message);
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Offline Mode';
        statusElement.className = 'status-indicator disconnected';
        // Fallback to localStorage
        window.dataModule.loadDataFromLocalStorage();
    }
}

// Cache management functions
function getCachedData(endpoint) {
    const cached = apiCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(endpoint, data) {
    apiCache.set(endpoint, {
        data,
        timestamp: Date.now()
    });
}

function clearCache() {
    apiCache.clear();
    console.log('🗑️ API cache cleared');
}

async function loadDataFromAPI(forceRefresh = false) {
    try {
        const endpoints = ['inventory', 'customers', 'sales', 'gallery', 'ideas'];
        const promises = endpoints.map(async (endpoint) => {
            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = getCachedData(endpoint);
                if (cached) {
                    console.log(`📦 Using cached data for ${endpoint}`);
                    return { name: endpoint, data: cached, fromCache: true };
                }
            }
            
            // Fetch from API
            const response = await fetch(`/api/${endpoint}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${endpoint}: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            setCachedData(endpoint, data);
            
            return { name: endpoint, data, fromCache: false };
        });

        const results = await Promise.all(promises);
        
        // Organize data
        const data = {};
        let fromCacheCount = 0;
        
        results.forEach(result => {
            data[result.name] = result.data;
            if (result.fromCache) fromCacheCount++;
        });
        
        console.log('✅ Data loaded from API successfully:');
        console.log(`  📦 Inventory items: ${data.inventory.length}`);
        console.log(`  👥 Customers: ${data.customers.length}`);
        console.log(`  💰 Sales records: ${data.sales.length}`);
        console.log(`  🖼️ Gallery items: ${data.gallery.length}`);
        console.log(`  💡 Ideas: ${data.ideas.length}`);
        
        if (fromCacheCount > 0) {
            console.log(`  🚀 ${fromCacheCount} endpoints loaded from cache`);
        }

        // Update global data
        window.dataModule.setData(data);
        
        // Load the data into UI
        window.uiModule.loadData();
        updateConnectionStatus('connected');
    } catch (error) {
        console.error('❌ API data loading failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        window.dataModule.loadDataFromLocalStorage();
        updateConnectionStatus('disconnected');
    }
}

async function saveDataToAPI() {
    const data = window.dataModule.getData();
    
    try {
        const savePromises = [
            { name: 'inventory', data: data.inventory },
            { name: 'customers', data: data.customers },
            { name: 'sales', data: data.sales },
            { name: 'gallery', data: data.gallery },
            { name: 'ideas', data: data.ideas }
        ].map(async ({ name, data }) => {
            const response = await fetch(`/api/${name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save ${name}: ${response.status} ${response.statusText}`);
            }
            
            return { name, success: true };
        });

        const results = await Promise.all(savePromises);
        console.log('✅ Data saved to API successfully:', results.map(r => r.name).join(', '));
        
        // Clear cache after successful save to ensure fresh data on next load
        clearCache();
        
    } catch (error) {
        console.error('❌ API save failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        window.dataModule.saveDataToLocalStorage();
    }
}

// Initialize API module
function initAPI() {
    // Check connection status on load
    checkConnectionStatus();
    
    // Set up periodic connection checks
    setInterval(checkConnectionStatus, 30000); // Check every 30 seconds
}

// Export functions for use in other modules
window.apiModule = {
    loadDataFromAPI,
    saveDataToAPI,
    checkConnectionStatus,
    updateConnectionStatus,
    clearCache,
    initAPI
};
