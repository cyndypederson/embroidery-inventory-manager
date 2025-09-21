// Main Script - Embroidery Inventory Management System
// This is the main entry point that loads and coordinates all modules

// Global configuration
window.ADMIN_PASSWORD = 'embroidery2025'; // Default password - change this to your desired password

// Module loading order
const modules = [
    'js/modules/data.js',
    'js/modules/api.js', 
    'js/modules/auth.js',
    'js/modules/ui.js'  // We'll create this next
];

// Load modules dynamically
function loadModule(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load all modules
async function loadModules() {
    console.log('🔄 Loading application modules...');
    
    try {
        for (const module of modules) {
            await loadModule(module);
            console.log(`✅ Loaded: ${module}`);
        }
        
        console.log('✅ All modules loaded successfully');
        
        // Initialize modules in order
        window.dataModule.initData();
        window.apiModule.initAPI();
        window.authModule.initAuth();
        window.uiModule.initUI();
        
        console.log('🚀 Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to load modules:', error);
        // Fallback to original script if modules fail to load
        loadFallbackScript();
    }
}

// Fallback to original script if modules fail
function loadFallbackScript() {
    console.log('🔄 Loading fallback script...');
    const script = document.createElement('script');
    script.src = 'script.js';
    document.head.appendChild(script);
}

// Start the application
document.addEventListener('DOMContentLoaded', loadModules);
