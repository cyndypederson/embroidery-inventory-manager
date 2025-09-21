// UI Module
// Handles user interface interactions and lazy loading

// Tab management with lazy loading
const loadedTabs = new Set();
const tabModules = {
    'projects': 'js/modules/tabs/projects.js',
    'inventory': 'js/modules/tabs/inventory.js',
    'customers': 'js/modules/tabs/customers.js',
    'wip': 'js/modules/tabs/wip.js',
    'gallery': 'js/modules/tabs/gallery.js',
    'sales': 'js/modules/tabs/sales.js',
    'ideas': 'js/modules/tabs/ideas.js',
    'reports': 'js/modules/tabs/reports.js'
};

// Load tab module dynamically
async function loadTabModule(tabName) {
    if (loadedTabs.has(tabName)) {
        return; // Already loaded
    }
    
    const modulePath = tabModules[tabName];
    if (!modulePath) {
        console.warn(`No module defined for tab: ${tabName}`);
        return;
    }
    
    try {
        console.log(`🔄 Loading tab module: ${tabName}`);
        await loadModule(modulePath);
        loadedTabs.add(tabName);
        console.log(`✅ Tab module loaded: ${tabName}`);
    } catch (error) {
        console.error(`❌ Failed to load tab module ${tabName}:`, error);
    }
}

// Load module dynamically
function loadModule(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Enhanced tab switching with lazy loading
function switchTab(tabName) {
    // Load tab module if not already loaded
    loadTabModule(tabName);
    
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked nav button
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Call tab-specific initialization if available
    if (window[`init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`]) {
        window[`init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`]();
    }
}

// Basic UI initialization
function initUI() {
    console.log('🔄 Initializing UI...');
    
    // Set up tab navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.closest('.nav-btn').dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Load the default tab (projects)
    switchTab('projects');
    
    console.log('✅ UI initialized');
}

// Load data function for backward compatibility
function loadData() {
    // This function is called by the API module after data is loaded
    // We'll let the original script.js handle the actual UI updates
    console.log('📊 Data loaded, UI will be updated by main script');
}

// Export functions
window.uiModule = {
    switchTab,
    loadTabModule,
    loadData,
    initUI
};
