// Optimized Script - Embroidery Inventory Management System
// Hybrid approach: Uses performance optimizations with fallback to original script

// Performance optimizations
const PERFORMANCE_MODE = true;

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map();

// Enhanced error handling utilities
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

// Enhanced API loading with caching
async function loadDataFromAPI() {
    try {
        const endpoints = ['inventory', 'customers', 'sales', 'gallery', 'ideas'];
        const promises = endpoints.map(async (endpoint) => {
            // Check cache first
            if (PERFORMANCE_MODE) {
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
            if (PERFORMANCE_MODE) {
                setCachedData(endpoint, data);
            }
            
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
        inventory = data.inventory;
        customers = data.customers;
        sales = data.sales;
        gallery = data.gallery;
        ideas = data.ideas;
        
        // Load the data into UI
        loadData();
        updateConnectionStatus('connected');
    } catch (error) {
        console.error('❌ API data loading failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        loadDataFromLocalStorage();
        updateConnectionStatus('disconnected');
    }
}

// Enhanced API saving with cache invalidation
async function saveDataToAPI() {
    try {
        const savePromises = [
            { name: 'inventory', data: inventory },
            { name: 'customers', data: customers },
            { name: 'sales', data: sales },
            { name: 'gallery', data: gallery },
            { name: 'ideas', data: ideas }
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
        if (PERFORMANCE_MODE) {
            clearCache();
        }
        
    } catch (error) {
        console.error('❌ API save failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        saveDataToLocalStorage();
    }
}

// Load the original script for all other functionality
function loadOriginalScript() {
    console.log('🔄 Loading original script for full functionality...');
    
    // Create a script element to load the original script
    const script = document.createElement('script');
    script.src = 'script.js';
    script.onload = () => {
        console.log('✅ Original script loaded successfully');
        console.log('🚀 Application ready with performance optimizations!');
    };
    script.onerror = () => {
        console.error('❌ Failed to load original script');
    };
    
    document.head.appendChild(script);
}

// Initialize performance optimizations
function initPerformanceOptimizations() {
    console.log('🚀 Initializing performance optimizations...');
    
    // Override the original loadDataFromAPI and saveDataToAPI functions
    // This will be done after the original script loads
    
    // Set up periodic connection checks
    setInterval(checkConnectionStatus, 30000); // Check every 30 seconds
    
    console.log('✅ Performance optimizations initialized');
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Starting optimized application...');
    
    // Initialize performance optimizations first
    initPerformanceOptimizations();
    
    // Load the original script for full functionality
    loadOriginalScript();
});
