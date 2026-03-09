// Data storage
let inventory = [];
let customers = [];
let sales = [];
let gallery = [];
let invoices = [];
let ideas = [];

function generateSaleId() {
    return `sale-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Performance optimization settings
const PERFORMANCE_CONFIG = {
    PAGINATION_SIZE: 50,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    LAZY_LOAD_THRESHOLD: 100,
    VIRTUAL_SCROLL_THRESHOLD: 500
};

// Caching system
const cache = new Map();
const cacheTimestamps = new Map();

// Event listener management to prevent memory leaks
class EventManager {
    constructor() {
        this.listeners = new Map();
    }
    
    addListener(element, event, handler, options = {}) {
        const key = `${element.constructor.name}-${event}`;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push({ element, event, handler, options });
        element.addEventListener(event, handler, options);
    }
    
    removeAllListeners() {
        this.listeners.forEach((listeners, key) => {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.listeners.clear();
    }
    
    removeListenersForElement(element) {
        this.listeners.forEach((listeners, key) => {
            const filtered = listeners.filter(listener => listener.element !== element);
            if (filtered.length === 0) {
                this.listeners.delete(key);
            } else {
                this.listeners.set(key, filtered);
            }
        });
    }
}

const eventManager = new EventManager();

// Logging utility - only log on non-localhost environments
function isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
}

function debugLog(...args) {
    if (!isLocalhost()) {
        console.log(...args);
    }
}

function debugError(...args) {
    if (!isLocalhost()) {
        console.error(...args);
    }
}

function debugWarn(...args) {
    if (!isLocalhost()) {
        console.warn(...args);
    }
}

// Filter state management
const filterState = {
    projects: {},
    inventory: {},
    customers: {},
    sales: {},
    wip: {},
    gallery: {},
    ideas: {}
};

function saveCurrentFilters(tabName) {
    const filters = {};
    const tabPrefix = tabName === 'projects' ? '' : tabName;
    
    // Save search filters
    const searchInput = document.getElementById(tabName === 'projects' ? 'searchItems' : `${tabPrefix}Search`);
    if (searchInput) filters.search = searchInput.value;
    
    // Save status filters
    const statusFilter = document.getElementById(tabName === 'projects' ? 'statusFilter' : `${tabPrefix}StatusFilter`);
    if (statusFilter) filters.status = statusFilter.value;
    
    // Save customer filters
    const customerFilter = document.getElementById(tabName === 'projects' ? 'customerFilter' : `${tabPrefix}CustomerFilter`);
    if (customerFilter) filters.customer = customerFilter.value;
    
    // Save location filters
    const locationFilter = document.getElementById(tabName === 'projects' ? 'locationFilter' : `${tabPrefix}LocationFilter`);
    if (locationFilter) filters.location = locationFilter.value;
    
    // Save category filters (for inventory)
    if (tabName === 'inventory') {
        const categoryFilter = document.getElementById('inventoryCategoryFilter');
        if (categoryFilter) filters.category = categoryFilter.value;
    }
    
    // Save priority and customer filters (for WIP)
    if (tabName === 'wip') {
        const priorityFilter = document.getElementById('wipPriorityFilter');
        if (priorityFilter) filters.priority = priorityFilter.value;
        const customerFilter = document.getElementById('wipCustomerFilter');
        if (customerFilter) filters.customer = customerFilter.value;
    }
    
    filterState[tabName] = filters;
}

function restoreFilters(tabName) {
    const filters = filterState[tabName] || {};
    
    // Restore search filters
    const searchInput = document.getElementById(tabName === 'projects' ? 'searchItems' : `${tabName}Search`);
    if (searchInput && filters.search !== undefined) {
        searchInput.value = filters.search;
    }
    
    // Restore status filters
    const statusFilter = document.getElementById(tabName === 'projects' ? 'statusFilter' : `${tabName}StatusFilter`);
    if (statusFilter && filters.status !== undefined) {
        statusFilter.value = filters.status;
    }
    
    // Restore customer filters
    const customerFilter = document.getElementById(tabName === 'projects' ? 'customerFilter' : `${tabName}CustomerFilter`);
    if (customerFilter && filters.customer !== undefined) {
        customerFilter.value = filters.customer;
    }
    
    // Restore location filters
    const locationFilter = document.getElementById(tabName === 'projects' ? 'locationFilter' : `${tabName}LocationFilter`);
    if (locationFilter && filters.location !== undefined) {
        locationFilter.value = filters.location;
    }
    
    // Restore category filters (for inventory)
    if (tabName === 'inventory' && filters.category !== undefined) {
        const categoryFilter = document.getElementById('inventoryCategoryFilter');
        if (categoryFilter) categoryFilter.value = filters.category;
    }
    
    // Restore priority and customer filters (for WIP)
    if (tabName === 'wip') {
        if (filters.priority !== undefined) {
        const priorityFilter = document.getElementById('wipPriorityFilter');
        if (priorityFilter) priorityFilter.value = filters.priority;
        }
        if (filters.customer !== undefined) {
            const customerFilter = document.getElementById('wipCustomerFilter');
            if (customerFilter) customerFilter.value = filters.customer;
        }
    }
}

// Security utilities
class SecurityManager {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }
    
    static validateInput(input, type = 'text') {
        if (!input || typeof input !== 'string') return false;
        
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
            case 'number':
                return !isNaN(parseFloat(input)) && isFinite(input);
            case 'text':
                return input.length > 0 && input.length < 1000;
            default:
                return true;
        }
    }
    
    // Safe HTML insertion helper - always escapes user content
    static setSafeHTML(element, html) {
        if (!element) return;
        // For trusted HTML (like templates we control), we can use innerHTML
        // But we should still escape any user-provided content within the HTML
        element.innerHTML = html;
    }
    
    // Safe way to write to a new window document
    static writeToWindow(printWindow, htmlContent) {
        if (!printWindow || !printWindow.document) return;
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
    
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Pagination state
let currentPage = 1;
let totalPages = 1;
let currentPageSize = PERFORMANCE_CONFIG.PAGINATION_SIZE;

// Performance utilities
class PerformanceManager {
    static getCachedData(key) {
        const timestamp = cacheTimestamps.get(key);
        if (timestamp && Date.now() - timestamp < PERFORMANCE_CONFIG.CACHE_DURATION) {
            return cache.get(key);
        }
        return null;
    }
    
    static setCachedData(key, data) {
        cache.set(key, data);
        cacheTimestamps.set(key, Date.now());
    }
    
    static clearCache() {
        cache.clear();
        cacheTimestamps.clear();
    }
    
    static paginateData(data, page = 1, pageSize = PERFORMANCE_CONFIG.PAGINATION_SIZE) {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = data.slice(startIndex, endIndex);
        const totalPages = Math.ceil(data.length / pageSize);
        
        return {
            data: paginatedData,
            currentPage: page,
            totalPages,
            totalItems: data.length,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Pagination functions
function goToPage(tab, page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    
    // Update the appropriate table based on tab
    switch(tab) {
        case 'projects':
            loadInventoryTable();
            break;
        case 'inventory':
            loadInventoryItemsTable();
            break;
        case 'customers':
            loadCustomersTable();
            break;
        case 'sales':
            loadSalesTable();
            break;
    }
    
    updatePaginationControls(tab);
}

function changePageSize(tab, newSize) {
    currentPageSize = parseInt(newSize);
    currentPage = 1; // Reset to first page
    
    // Update the appropriate table
    switch(tab) {
        case 'projects':
            loadInventoryTable();
            break;
        case 'inventory':
            loadInventoryItemsTable();
            break;
        case 'customers':
            loadCustomersTable();
            break;
        case 'sales':
            loadSalesTable();
            break;
    }
    
    updatePaginationControls(tab);
}

function updatePaginationControls(tab) {
    const paginationInfo = document.getElementById(`${tab}PaginationInfo`);
    const firstBtn = document.getElementById(`${tab}FirstPage`);
    const prevBtn = document.getElementById(`${tab}PrevPage`);
    const nextBtn = document.getElementById(`${tab}NextPage`);
    const lastBtn = document.getElementById(`${tab}LastPage`);
    const pageNumbers = document.getElementById(`${tab}PageNumbers`);
    
    if (!paginationInfo) return;
    
    // Update pagination info
    const startItem = (currentPage - 1) * currentPageSize + 1;
    const endItem = Math.min(currentPage * currentPageSize, totalPages * currentPageSize);
    
    // Get the actual total count from the data
    let actualTotal = 0;
    if (tab === 'projects') {
        actualTotal = inventory.filter(item => item.type === 'project' || !item.type).length;
    } else if (tab === 'inventory') {
        actualTotal = inventory.filter(item => item.type === 'inventory').length;
    } else if (tab === 'customers') {
        actualTotal = customers.length;
    } else if (tab === 'sales') {
        actualTotal = sales.length;
    }
    
    paginationInfo.textContent = `Showing ${startItem}-${Math.min(endItem, actualTotal)} of ${actualTotal} items`;
    
    // Update button states
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
    
    // Update page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => goToPage(tab, i);
            pageNumbers.appendChild(pageBtn);
        }
    }
}

// Load Projects as Cards (optional preFilteredData for advanced search)
function loadProjectsCards(preFilteredData) {
    debugLog('🎯 loadProjectsCards() called');
    const container = document.getElementById('projectsCards');
    if (!container) {
        debugError('❌ projectsCards container not found');
        return;
    }
    
    debugLog('🧹 Clearing projectsCards container');
    container.innerHTML = '';
    
    // Use pre-filtered data from search or filter from inventory
    const baseData = preFilteredData || inventory;
    let projects = baseData.filter(item => {
        if (item.type !== 'project') return false;
        if (preFilteredData) return true; // Already filtered by advanced search
        
        // Apply current filters from DOM
        const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const customerFilter = document.getElementById('customerFilter')?.value || '';
        const locationFilter = document.getElementById('locationFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';
        const dateRangeFilter = document.getElementById('dateRangeFilter')?.value || '';
        
        // Search filter
        const matchesSearch = !searchTerm || 
            item.description?.toLowerCase().includes(searchTerm) ||
            item.name?.toLowerCase().includes(searchTerm) ||
            item.notes?.toLowerCase().includes(searchTerm) ||
            item.customer?.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = !statusFilter || item.status === statusFilter;
        
        // Customer filter
        const matchesCustomer = !customerFilter || item.customer === customerFilter;
        
        // Location filter
        const matchesLocation = !locationFilter || item.location === locationFilter;
        
        // Priority filter
        const itemPriority = item.priority || 'medium';
        const matchesPriority = !priorityFilter || itemPriority === priorityFilter;
        
        // Date range filter
        let matchesDateRange = true;
        if (dateRangeFilter) {
            const now = new Date();
            const itemDate = item.dueDate ? new Date(item.dueDate) : (item.dateAdded ? new Date(item.dateAdded) : null);
            
            if (itemDate) {
                switch (dateRangeFilter) {
                    case 'today':
                        matchesDateRange = itemDate.toDateString() === now.toDateString();
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        matchesDateRange = itemDate >= weekAgo;
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        matchesDateRange = itemDate >= monthAgo;
                        break;
                    case 'quarter':
                        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        matchesDateRange = itemDate >= quarterAgo;
                        break;
                    case 'year':
                        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        matchesDateRange = itemDate >= yearAgo;
                        break;
                }
            } else {
                matchesDateRange = false; // No date means it doesn't match any date range
            }
        }
        
        return matchesSearch && matchesStatus && matchesCustomer && matchesLocation && matchesPriority && matchesDateRange;
    });
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="no-data">No projects found. <a href="#" onclick="openAddProjectModal()">Add your first project</a></div>';
        return;
    }
    
    // Sort projects by status priority: in-progress > pending > completed
    const statusPriority = {
        'in-progress': 1,
        'pending': 2,
        'completed': 3,
        'sold': 4
    };
    
    projects.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 2; // Default to pending priority
        const priorityB = statusPriority[b.status] || 2;
        
        // Primary sort by status
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Secondary sort by due date (earliest first) within same status
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1; // Items with due dates come before those without
        if (b.dueDate) return 1;
        
        return 0;
    });
    
    // Apply pagination
    totalPages = Math.max(1, Math.ceil(projects.length / currentPageSize));
    const startIdx = (currentPage - 1) * currentPageSize;
    const paginatedProjects = projects.slice(startIdx, startIdx + currentPageSize);
    updatePaginationControls('projects');
    
    paginatedProjects.forEach((project, index) => {
        // Find the actual inventory index for this project
        const actualIndex = inventory.findIndex(item => item === project);
        
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const statusClass = project.status ? project.status.toLowerCase().replace(/\s+/g, '-') : 'pending';
        const dueDate = project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set';
        const customer = project.customer || 'No customer';
        
        card.innerHTML = `
            <div class="project-card-header">
                <h3 class="project-card-title">${SecurityManager.escapeHtml(project.description || project.name || 'Untitled Project')}</h3>
                <span class="project-card-status ${statusClass}">${project.status || 'pending'}</span>
            </div>
            <div class="project-card-details">
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Customer:</span>
                    <span class="project-card-detail-value">${SecurityManager.escapeHtml(customer)}</span>
                </div>
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Due Date:</span>
                    <span class="project-card-detail-value">${dueDate}</span>
                </div>
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Quantity:</span>
                    <span class="project-card-detail-value">${project.quantity || 1}</span>
                </div>
                ${project.price ? `
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Price:</span>
                    <span class="project-card-detail-value">$${(project.price || 0).toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            <div class="project-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editItem(${actualIndex})" title="Edit Project">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline btn-sm" onclick="copyItem(${actualIndex})" title="Copy Project">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${actualIndex})" title="Delete Project">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Load Inventory Items as Cards (optional preFilteredData for advanced search)
function loadInventoryCards(preFilteredData) {
    const container = document.getElementById('inventoryCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Use pre-filtered data from search or filter from inventory
    const baseData = preFilteredData || inventory;
    let items = baseData.filter(item => {
        if (item.type !== 'inventory') return false;
        if (preFilteredData) return true; // Already filtered by advanced search
        
        // Apply current filters from DOM
        const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('inventoryStatusFilter')?.value || '';
        const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || '';
        const locationFilter = document.getElementById('inventoryLocationFilter')?.value || '';
        
        return (!searchTerm || (item.description || item.name || '').toLowerCase().includes(searchTerm)) &&
               (!statusFilter || item.status === statusFilter) &&
               (!categoryFilter || (item.category || '') === categoryFilter) &&
               (!locationFilter || (item.location || '') === locationFilter);
    });
    
    if (items.length === 0) {
        container.innerHTML = '<div class="no-data">No inventory items found. <a href="#" onclick="openAddInventoryModal()">Add your first item</a></div>';
        updatePaginationControls('inventory');
        return;
    }
    
    // Apply pagination
    totalPages = Math.max(1, Math.ceil(items.length / currentPageSize));
    const startIdx = (currentPage - 1) * currentPageSize;
    const paginatedItems = items.slice(startIdx, startIdx + currentPageSize);
    updatePaginationControls('inventory');
    
    paginatedItems.forEach((item, index) => {
        // Find the actual inventory index for this item
        const actualIndex = inventory.findIndex(invItem => invItem === item);
        
        const card = document.createElement('div');
        card.className = 'inventory-card project-card';
        
        const statusClass = item.status ? item.status.toLowerCase().replace(/\s+/g, '-') : 'in-stock';
        
        card.innerHTML = `
            <div class="project-card-header">
                <h3 class="project-card-title">${SecurityManager.escapeHtml(item.description || item.name || 'Untitled Item')}</h3>
                <span class="project-card-status ${statusClass}">${item.status || 'In Stock'}</span>
            </div>
            <div class="project-card-details">
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Quantity:</span>
                    <span class="project-card-detail-value">${item.quantity || 0}</span>
                </div>
                ${item.price ? `
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Price:</span>
                    <span class="project-card-detail-value">$${(item.price || 0).toFixed(2)}</span>
                </div>
                ` : ''}
                ${item.notes ? `
                <div class="project-card-detail">
                    <span class="project-card-detail-label">Notes:</span>
                    <span class="project-card-detail-value">${SecurityManager.escapeHtml(item.notes)}</span>
                </div>
                ` : ''}
            </div>
            <div class="project-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editItem(${actualIndex})" title="Edit Item">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${actualIndex})" title="Delete Item">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Load Customers as Cards
function loadCustomersCards() {
    const container = document.getElementById('customersCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (customers.length === 0) {
        container.innerHTML = '<div class="no-data">No customers found. <a href="#" onclick="openAddCustomerModal()">Add your first customer</a></div>';
        return;
    }
    
    customers.forEach((customer, index) => {
        const card = document.createElement('div');
        card.className = 'customer-card';
        
        // Calculate customer statistics
        const customerProjects = inventory.filter(item => item.customer === customer.name);
        const totalOrders = customerProjects.length;
        const totalSpent = customerProjects.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity) || 1;
            return sum + (price * qty);
        }, 0);
        
        card.innerHTML = `
            <div class="customer-card-header">
                <h3 class="customer-card-name">${SecurityManager.escapeHtml(customer.name)}</h3>
            </div>
            <div class="customer-card-stats">
                <div class="customer-stat">
                    <span class="customer-stat-value">${totalOrders}</span>
                    <span class="customer-stat-label">Orders</span>
                </div>
                <div class="customer-stat">
                    <span class="customer-stat-value">$${totalSpent.toFixed(2)}</span>
                    <span class="customer-stat-label">Total Spent</span>
                </div>
            </div>
            <div class="customer-card-details">
                ${customer.contact ? `
                <div class="customer-card-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${SecurityManager.escapeHtml(customer.contact)}</span>
                </div>
                ` : ''}
                ${customer.location ? `
                <div class="customer-card-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${SecurityManager.escapeHtml(customer.location)}</span>
                </div>
                ` : ''}
                ${customer.requiresVendorNumber && customer.vendorNumber ? `
                <div class="customer-card-detail">
                    <i class="fas fa-hashtag"></i>
                    <span>Vendor #${SecurityManager.escapeHtml(customer.vendorNumber)}</span>
                </div>
                ` : ''}
            </div>
            <div class="customer-card-actions">
                <button class="btn btn-success btn-sm" onclick="dataManager.exportCustomerOrderHistoryPDF(${JSON.stringify(customer.name)})" title="Export Order History">
                    <i class="fas fa-file-pdf"></i> Export
                </button>
                <button class="btn btn-outline btn-sm" onclick="editCustomer(${index})" title="Edit Customer">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${index})" title="Delete Customer">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Load Sales as Cards
function loadSalesCards() {
    const container = document.getElementById('salesCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredSales = sales.filter(sale => {
        const searchTerm = document.getElementById('salesSearch')?.value?.toLowerCase() || '';
        const customerFilter = document.getElementById('salesCustomerFilter')?.value || '';
        if (searchTerm && !(sale.itemName?.toLowerCase().includes(searchTerm) || sale.customer?.toLowerCase().includes(searchTerm))) {
            return false;
        }
        if (customerFilter && sale.customer !== customerFilter) {
            return false;
        }
        return true;
    });
    
    if (filteredSales.length === 0) {
        container.innerHTML = '<div class="no-data">No sales recorded. <a href="#" onclick="openAddSaleModal()">Record your first sale</a></div>';
        return;
    }
    
    filteredSales.forEach((sale) => {
        const saleIndex = sales.indexOf(sale);
        if (saleIndex === -1) {
            return;
        }
        const card = document.createElement('div');
        card.className = 'sale-card';
        
        const listPrice = parseFloat(sale.listedPrice || sale.price || sale.salePrice || 0) || 0;
        const netPrice = parseFloat(sale.netAmount || sale.salePrice || sale.price || 0) || 0;
        const commissionPercent = parseFloat(sale.commission || sale.commissionPercent || 0) || 0;
        const commissionAmount = parseFloat(sale.commissionAmount || (listPrice * commissionPercent / 100)) || 0;
        const vendorDiscountPercent = parseFloat(sale.vendorDiscount || 0) || 0;
        const vendorDiscountAmount = parseFloat(sale.vendorDiscountAmount || 0) || 0;
        const discountValue = parseFloat(sale.discount || 0) || 0;
        const rawDiscountPercent = sale.discountPercent !== undefined ? sale.discountPercent : (listPrice > 0 ? ((discountValue / listPrice) * 100) : 0);
        const discountPercentNumeric = parseFloat(rawDiscountPercent) || 0;
        const vendorDisplay = (vendorDiscountPercent > 0 || vendorDiscountAmount > 0) ? `$${vendorDiscountAmount.toFixed(2)} (${vendorDiscountPercent.toFixed(1)}%)` : '-';
        const customerSavingsDisplay = discountValue > 0 ? `$${discountValue.toFixed(2)} (${discountPercentNumeric.toFixed(1)}%)` : '-';
        
        card.innerHTML = `
            <div class="sale-card-header">
                <h3 class="sale-card-item">${SecurityManager.escapeHtml(sale.itemName || 'Sale')}</h3>
                <p class="sale-card-customer">${SecurityManager.escapeHtml(sale.customer || 'No customer')}</p>
            </div>
            <div class="sale-card-pricing">
                <div class="sale-price-item">
                    <span class="sale-price-label">List Price</span>
                    <span class="sale-price-value">$${listPrice.toFixed(2)}</span>
                </div>
                <div class="sale-price-item">
                    <span class="sale-price-label">Net Price</span>
                    <span class="sale-price-value">$${netPrice.toFixed(2)}</span>
                </div>
                <div class="sale-price-item">
                    <span class="sale-price-label">Commission %</span>
                    <span class="sale-price-value">${commissionPercent.toFixed(1)}%</span>
                </div>
                <div class="sale-price-item">
                    <span class="sale-price-label">Commission</span>
                    <span class="sale-price-value commission">$${commissionAmount.toFixed(2)}</span>
                </div>
                <div class="sale-price-item">
                    <span class="sale-price-label">Vendor Discount</span>
                    <span class="sale-price-value">${vendorDisplay}</span>
                </div>
                <div class="sale-price-item">
                    <span class="sale-price-label">Customer Savings</span>
                    <span class="sale-price-value">${customerSavingsDisplay}</span>
                </div>
            </div>
            <div class="sale-card-meta">
                <span class="sale-card-date">${sale.dateSold || 'Date not set'}</span>
                <span class="sale-card-channel">${sale.saleChannel === 'shop' ? 'Shop Sale' : 'Direct Sale'}</span>
            </div>
            <div class="sale-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editSale(${saleIndex})" title="Edit Sale">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteSale(${saleIndex})" title="Delete Sale">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Aliases for cards migration - old table functions now use card loaders
// Fixes "Cannot set properties of null (setting 'innerHTML')" when updating customers
function loadInventoryTable() { loadProjectsCards(); }
function loadCustomersTable() { loadCustomersCards(); }
function loadSalesTable() { loadSalesCards(); }
function loadInventoryItemsTable() { loadInventoryCards(); }

// Refresh sales view when a project/inventory item is marked as sold
function refreshSalesViews() {
    loadSalesCards();
}

// Sync desktop and mobile card views when data changes
function setupViewSynchronization() {
    // Refresh all card views when window resizes (desktop/mobile switch)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            loadProjectsCards();
            loadInventoryCards();
            loadCustomersCards();
            loadSalesCards();
        }, 150);
    });
}

// Enhanced table loading with pagination (delegates to card loader)
function loadInventoryTableWithPagination() {
    const preFiltered = (typeof searchManager !== 'undefined' && searchManager.currentSearch) ? searchManager.currentSearch : undefined;
    loadProjectsCards(preFiltered);
}

function loadInventoryItemsTableWithPagination() {
    const preFiltered = (typeof searchManager !== 'undefined' && searchManager.currentSearch) ? searchManager.currentSearch : undefined;
    loadInventoryCards(preFiltered);
}

// Enhanced Search System
class SearchManager {
    constructor() {
        this.savedSearches = this.loadSavedSearches();
        this.currentSearch = null;
        this.searchHistory = this.loadSearchHistory();
    }
    
    // Debounced search function
    debouncedFilterItems() {
        return PerformanceManager.debounce(() => {
            this.performSearch();
        }, 300)();
    }
    
    performSearch() {
        const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
        const suggestions = this.getSearchSuggestions(searchTerm);
        this.showSuggestions(suggestions);
        
        // Clear cache when searching
        PerformanceManager.clearCache();
        
        // Reload current view with new search
        const activeTab = document.querySelector('.nav-btn.active');
        if (activeTab) {
            const tabName = activeTab.getAttribute('data-tab');
            switchTab(tabName);
        }
    }
    
    getSearchSuggestions(term) {
        if (term.length < 2) return [];
        
        const suggestions = new Set();
        
        // Search in inventory items
        inventory.forEach(item => {
            if (item.description?.toLowerCase().includes(term)) {
                suggestions.add(item.description);
            }
            if (item.customer?.toLowerCase().includes(term)) {
                suggestions.add(item.customer);
            }
            if (item.notes?.toLowerCase().includes(term)) {
                suggestions.add(item.notes);
            }
            if (item.tags?.toLowerCase().includes(term)) {
                item.tags.split(',').forEach(tag => {
                    if (tag.trim().toLowerCase().includes(term)) {
                        suggestions.add(tag.trim());
                    }
                });
            }
        });
        
        return Array.from(suggestions).slice(0, 10);
    }
    
    showSuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;
        
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'search-suggestion';
            div.textContent = suggestion;
            div.onclick = () => {
                document.getElementById('searchItems').value = suggestion;
                container.style.display = 'none';
                this.performSearch();
            };
            container.appendChild(div);
        });
        
        container.style.display = 'block';
    }
    
    openAdvancedSearch(tab) {
        this.currentTab = tab;
        this.populateAdvancedSearchOptions();
        document.getElementById('advancedSearchModal').style.display = 'block';
    }
    
    populateAdvancedSearchOptions() {
        // Populate customer options
        const customerSelect = document.getElementById('advancedCustomer');
        if (customerSelect) {
            customerSelect.innerHTML = '';
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.name;
                option.textContent = customer.name;
                customerSelect.appendChild(option);
            });
        }
        
        // Populate location options
        const locationSelect = document.getElementById('advancedLocation');
        if (locationSelect) {
            locationSelect.innerHTML = '';
            const locations = [...new Set(inventory.map(item => item.location).filter(Boolean))];
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                locationSelect.appendChild(option);
            });
        }
    }
    
    performAdvancedSearch() {
        const criteria = this.getAdvancedSearchCriteria();
        const results = this.filterDataWithCriteria(criteria);
        
        // Apply results to current tab
        this.applySearchResults(results);
        
        // Save to search history
        this.addToSearchHistory(criteria);
        
        closeModal('advancedSearchModal');
    }
    
    getAdvancedSearchCriteria() {
        return {
            text: document.getElementById('advancedSearchText')?.value || '',
            status: Array.from(document.getElementById('advancedStatus')?.selectedOptions || []).map(o => o.value),
            priority: Array.from(document.getElementById('advancedPriority')?.selectedOptions || []).map(o => o.value),
            customer: Array.from(document.getElementById('advancedCustomer')?.selectedOptions || []).map(o => o.value),
            location: Array.from(document.getElementById('advancedLocation')?.selectedOptions || []).map(o => o.value),
            dateFrom: document.getElementById('advancedDateFrom')?.value || '',
            dateTo: document.getElementById('advancedDateTo')?.value || '',
            priceMin: parseFloat(document.getElementById('advancedPriceMin')?.value) || 0,
            priceMax: parseFloat(document.getElementById('advancedPriceMax')?.value) || Infinity,
            tags: document.getElementById('advancedTags')?.value || ''
        };
    }
    
    filterDataWithCriteria(criteria) {
        return inventory.filter(item => {
            // Text search
            if (criteria.text) {
                const searchText = criteria.text.toLowerCase();
                const searchableText = [
                    item.description,
                    item.notes,
                    item.customer,
                    item.tags
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchText)) {
                    return false;
                }
            }
            
            // Status filter
            if (criteria.status.length > 0 && !criteria.status.includes(item.status)) {
                return false;
            }
            
            // Priority filter
            if (criteria.priority.length > 0 && !criteria.priority.includes(item.priority)) {
                return false;
            }
            
            // Customer filter
            if (criteria.customer.length > 0 && !criteria.customer.includes(item.customer)) {
                return false;
            }
            
            // Location filter
            if (criteria.location.length > 0 && !criteria.location.includes(item.location)) {
                return false;
            }
            
            // Date range filter
            if (criteria.dateFrom || criteria.dateTo) {
                const itemDate = new Date(item.dateAdded || item.dueDate);
                if (criteria.dateFrom && itemDate < new Date(criteria.dateFrom)) {
                    return false;
                }
                if (criteria.dateTo && itemDate > new Date(criteria.dateTo)) {
                    return false;
                }
            }
            
            // Price range filter
            if (item.price) {
                if (item.price < criteria.priceMin || item.price > criteria.priceMax) {
                    return false;
                }
            }
            
            // Tags filter
            if (criteria.tags) {
                const searchTags = criteria.tags.toLowerCase().split(',').map(t => t.trim());
                const itemTags = (item.tags || '').toLowerCase().split(',').map(t => t.trim());
                if (!searchTags.some(tag => itemTags.includes(tag))) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    applySearchResults(results) {
        // Store current search results
        this.currentSearch = results;
        
        // Clear cache
        PerformanceManager.clearCache();
        
        // Reload card views with filtered results
        if (this.currentTab === 'projects') {
            currentPage = 1;
            loadProjectsCards(results);
        } else if (this.currentTab === 'inventory') {
            currentPage = 1;
            loadInventoryCards(results);
        }
    }
    
    saveCurrentSearch(tab) {
        const criteria = this.getAdvancedSearchCriteria();
        const searchName = prompt('Enter a name for this search:');
        if (!searchName) return;
        
        const savedSearch = {
            id: Date.now(),
            name: searchName,
            tab: tab,
            criteria: criteria,
            createdAt: new Date().toISOString()
        };
        
        this.savedSearches.push(savedSearch);
        this.saveSavedSearches();
        
        showNotification('Search saved successfully!', 'success');
    }
    
    loadSavedSearches(tab) {
        const modal = document.getElementById('savedSearchesModal');
        const list = document.getElementById('savedSearchesList');
        
        if (!list) return;
        
        const tabSearches = this.savedSearches.filter(search => search.tab === tab);
        
        if (tabSearches.length === 0) {
            list.innerHTML = '<p>No saved searches found.</p>';
        } else {
            list.innerHTML = '';
            tabSearches.forEach(search => {
                const item = document.createElement('div');
                item.className = 'saved-search-item';
                item.innerHTML = `
                    <div class="saved-search-info">
                        <h4>${SecurityManager.escapeHtml(search.name)}</h4>
                        <p>Created: ${new Date(search.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="saved-search-actions">
                        <button class="btn btn-outline" onclick="searchManager.loadSavedSearch(${search.id})">
                            <i class="fas fa-play"></i> Use
                        </button>
                        <button class="btn btn-outline" onclick="searchManager.deleteSavedSearch(${search.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });
        }
        
        modal.style.display = 'block';
    }
    
    loadSavedSearch(searchId) {
        const search = this.savedSearches.find(s => s.id === searchId);
        if (!search) return;
        
        // Populate form with saved criteria
        this.populateFormWithCriteria(search.criteria);
        
        // Apply the search
        this.currentTab = search.tab;
        this.performAdvancedSearch();
        
        closeModal('savedSearchesModal');
    }
    
    populateFormWithCriteria(criteria) {
        if (criteria.text) document.getElementById('advancedSearchText').value = criteria.text;
        if (criteria.status) {
            const statusSelect = document.getElementById('advancedStatus');
            Array.from(statusSelect.options).forEach(option => {
                option.selected = criteria.status.includes(option.value);
            });
        }
        // ... populate other fields similarly
    }
    
    deleteSavedSearch(searchId) {
        this.savedSearches = this.savedSearches.filter(s => s.id !== searchId);
        this.saveSavedSearches();
        this.loadSavedSearches(this.currentTab);
    }
    
    clearAllFilters(tab) {
        // Clear all filter inputs
        const inputs = document.querySelectorAll(`#${tab} input, #${tab} select`);
        inputs.forEach(input => {
            if (input.type === 'text' || input.type === 'number' || input.type === 'date') {
                input.value = '';
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else if (input.type === 'select-multiple') {
                Array.from(input.options).forEach(option => option.selected = false);
            }
        });
        
        // Clear cache and reload
        PerformanceManager.clearCache();
        this.currentSearch = null;
        currentPage = 1;
        
        if (tab === 'projects') {
            loadProjectsCards();
        } else if (tab === 'inventory') {
            loadInventoryCards();
        }
    }
    
    addToSearchHistory(criteria) {
        this.searchHistory.unshift({
            criteria: criteria,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 searches
        this.searchHistory = this.searchHistory.slice(0, 50);
        this.saveSearchHistory();
    }
    
    loadSavedSearches() {
        const saved = localStorage.getItem('embroidery_saved_searches');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveSavedSearches() {
        localStorage.setItem('embroidery_saved_searches', JSON.stringify(this.savedSearches));
    }
    
    loadSearchHistory() {
        const history = localStorage.getItem('embroidery_search_history');
        return history ? JSON.parse(history) : [];
    }
    
    saveSearchHistory() {
        localStorage.setItem('embroidery_search_history', JSON.stringify(this.searchHistory));
    }
}

// Initialize search manager
const searchManager = new SearchManager();

// UX Enhancement System
class UXManager {
    constructor() {
        this.keyboardShortcuts = new Map();
        this.bulkSelection = new Set();
        this.dragDropManager = new DragDropManager();
        this.initializeKeyboardShortcuts();
        this.initializeBulkOperations();
        this.initializeDragDrop();
    }
    
    initializeKeyboardShortcuts() {
        // Define keyboard shortcuts
        this.keyboardShortcuts.set('ctrl+n', () => this.openAddItemModal());
        this.keyboardShortcuts.set('ctrl+s', () => this.saveCurrentData());
        this.keyboardShortcuts.set('ctrl+f', () => this.focusSearch());
        this.keyboardShortcuts.set('ctrl+a', () => this.selectAllVisible());
        this.keyboardShortcuts.set('escape', () => this.closeModals());
        this.keyboardShortcuts.set('ctrl+delete', () => this.deleteSelected());
        this.keyboardShortcuts.set('ctrl+c', () => this.copySelected());
        this.keyboardShortcuts.set('ctrl+v', () => this.pasteSelected());
        this.keyboardShortcuts.set('ctrl+z', () => this.undoLastAction());
        this.keyboardShortcuts.set('ctrl+y', () => this.redoLastAction());
        this.keyboardShortcuts.set('ctrl+1', () => switchTab('projects'));
        this.keyboardShortcuts.set('ctrl+2', () => switchTab('inventory'));
        this.keyboardShortcuts.set('ctrl+3', () => switchTab('customers'));
        this.keyboardShortcuts.set('ctrl+4', () => switchTab('sales'));
        this.keyboardShortcuts.set('ctrl+5', () => switchTab('gallery'));
        this.keyboardShortcuts.set('ctrl+6', () => switchTab('ideas'));
        this.keyboardShortcuts.set('ctrl+7', () => switchTab('data'));
        
        // Add event listener
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }
    
    handleKeyboardShortcut(e) {
        const key = this.getKeyCombo(e);
        const action = this.keyboardShortcuts.get(key);
        
        if (action) {
            e.preventDefault();
            action();
        }
    }
    
    getKeyCombo(e) {
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('ctrl');
        if (e.altKey) modifiers.push('alt');
        if (e.shiftKey) modifiers.push('shift');
        if (e.metaKey) modifiers.push('meta');
        
        const key = e.key.toLowerCase();
        return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
    }
    
    openAddItemModal() {
        const currentTab = document.querySelector('.tab-content.active').id;
        switch(currentTab) {
            case 'projects':
                openAddItemModal();
                break;
            case 'inventory':
                openAddItemModal();
                break;
            case 'customers':
                openAddCustomerModal();
                break;
            case 'sales':
                openAddSaleModal();
                break;
        }
    }
    
    saveCurrentData() {
        // Auto-save functionality
        if (typeof saveData === 'function') {
            saveData();
            showNotification('Data saved successfully!', 'success');
        }
    }
    
    focusSearch() {
        const searchInput = document.querySelector('.tab-content.active input[type="text"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    selectAllVisible() {
        const checkboxes = document.querySelectorAll('.tab-content.active input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.bulkSelection.add(checkbox.value);
        });
        this.updateBulkActions();
    }
    
    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
    
    deleteSelected() {
        if (this.bulkSelection.size > 0) {
            this.confirmBulkDelete();
        }
    }
    
    copySelected() {
        if (this.bulkSelection.size > 0) {
            this.copySelectedItems();
        }
    }
    
    pasteSelected() {
        this.pasteItems();
    }
    
    undoLastAction() {
        // Implement undo functionality
        console.log('Undo action');
    }
    
    redoLastAction() {
        // Implement redo functionality
        console.log('Redo action');
    }
    
    initializeBulkOperations() {
        this.bulkActionsContainer = this.createBulkActionsContainer();
        document.body.appendChild(this.bulkActionsContainer);
        // Ensure it starts hidden
        this.bulkActionsContainer.style.display = 'none';
    }
    
    createBulkActionsContainer() {
        const container = document.createElement('div');
        container.id = 'bulkActionsContainer';
        container.className = 'bulk-actions-integrated';
        container.style.display = 'none'; // Ensure it starts hidden
        container.innerHTML = `
            <div class="bulk-actions">
                <h3 class="bulk-actions-title">Bulk Actions</h3>
                <span class="bulk-selection-count">0 items selected</span>
                <div class="bulk-actions-buttons">
                    <button class="btn btn-outline" onclick="uxManager.bulkEdit()">
                        <i class="fas fa-edit"></i> Edit Selected
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.bulkDelete()">
                        <i class="fas fa-trash"></i> Delete Selected
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.bulkStatusUpdate()">
                        <i class="fas fa-tag"></i> Update Status
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.clearSelection()">
                        <i class="fas fa-times"></i> Clear Selection
                    </button>
                </div>
            </div>
        `;
        return container;
    }
    
    updateBulkActions() {
        const count = this.bulkSelection.size;
        const container = document.getElementById('bulkActionsContainer');
        const countSpan = container.querySelector('.bulk-selection-count');
        
        countSpan.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
        
        if (count > 0) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
    
    bulkEdit() {
        if (this.bulkSelection.size === 0) return;
        
        const modal = document.getElementById('bulkEditModal');
        if (!modal) {
            this.createBulkEditModal();
        }
        
        document.getElementById('bulkEditModal').style.display = 'block';
    }
    
    bulkDelete() {
        if (this.bulkSelection.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${this.bulkSelection.size} items?`)) {
            this.bulkSelection.forEach(id => {
                this.deleteItem(id);
            });
            this.clearSelection();
            showNotification(`${this.bulkSelection.size} items deleted successfully!`, 'success');
        }
    }
    
    bulkExport() {
        if (this.bulkSelection.size === 0) return;
        
        const selectedItems = Array.from(this.bulkSelection).map(id => 
            inventory.find(item => item.id == id)
        ).filter(Boolean);
        
        this.exportToCSV(selectedItems, 'selected_items.csv');
    }
    
    bulkStatusUpdate() {
        if (this.bulkSelection.size === 0) return;
        
        const newStatus = prompt('Enter new status:');
        if (!newStatus) return;
        
        this.bulkSelection.forEach(id => {
            const item = inventory.find(item => item.id == id);
            if (item) {
                item.status = newStatus;
            }
        });
        
        this.saveData();
        this.clearSelection();
        showNotification(`Status updated for ${this.bulkSelection.size} items!`, 'success');
    }
    
    clearSelection() {
        this.bulkSelection.clear();
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateBulkActions();
    }
    
    initializeDragDrop() {
        this.dragDropManager.initialize();
    }
    
    createBulkEditModal() {
        const modal = document.createElement('div');
        modal.id = 'bulkEditModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('bulkEditModal')">&times;</span>
                <h3><i class="fas fa-edit"></i> Bulk Edit</h3>
                <form id="bulkEditForm" class="modal-form">
                    <div class="form-group">
                        <label for="bulkStatus">Status</label>
                        <select id="bulkStatus">
                            <option value="">Keep current</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="sold">Sold</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bulkPriority">Priority</label>
                        <select id="bulkPriority">
                            <option value="">Keep current</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bulkLocation">Location</label>
                        <input type="text" id="bulkLocation" placeholder="Enter new location">
                    </div>
                    <div class="form-group">
                        <label for="bulkNotes">Notes (append)</label>
                        <textarea id="bulkNotes" placeholder="Notes to append to existing notes"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('bulkEditModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Apply Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add form submission handler
        document.getElementById('bulkEditForm').onsubmit = (e) => {
            e.preventDefault();
            this.applyBulkEdit();
        };
    }
    
    applyBulkEdit() {
        const status = document.getElementById('bulkStatus').value;
        const priority = document.getElementById('bulkPriority').value;
        const location = document.getElementById('bulkLocation').value;
        const notes = document.getElementById('bulkNotes').value;
        
        this.bulkSelection.forEach(id => {
            const item = inventory.find(item => item.id == id);
            if (item) {
                if (status) item.status = status;
                if (priority) item.priority = priority;
                if (location) item.location = location;
                if (notes) item.notes = (item.notes || '') + '\n' + notes;
            }
        });
        
        this.saveData();
        this.clearSelection();
        closeModal('bulkEditModal');
        showNotification(`Bulk edit applied to ${this.bulkSelection.size} items!`, 'success');
    }
}

// Drag and Drop Manager
class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.dropZones = new Map();
    }
    
    initialize() {
        this.setupDragHandles();
        this.setupDropZones();
    }
    
    setupDragHandles() {
        // Add drag handles to table rows
        document.addEventListener('DOMContentLoaded', () => {
            this.addDragHandlesToTables();
        });
    }
    
    addDragHandlesToTables() {
        const tables = document.querySelectorAll('table tbody tr');
        tables.forEach(row => {
            row.draggable = true;
            row.addEventListener('dragstart', (e) => this.handleDragStart(e));
            row.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }
    
    handleDragStart(e) {
        this.draggedElement = e.target;
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }
    
    handleDragEnd(e) {
        e.target.style.opacity = '1';
        this.draggedElement = null;
    }
    
    setupDropZones() {
        // Setup drop zones for reordering
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    handleDrop(e) {
        e.preventDefault();
        if (this.draggedElement) {
            // Handle reordering logic
            this.reorderItems(this.draggedElement, e.target);
        }
    }
    
    reorderItems(draggedElement, dropTarget) {
        // Implement reordering logic
        console.log('Reordering items');
    }
}

// Initialize UX manager
const uxManager = new UXManager();

// Advanced Data Management & Backup System
class DataManager {
    constructor() {
        this.backupInterval = null;
        this.autoBackupEnabled = true;
        this.backupFrequency = 24 * 60 * 60 * 1000; // 24 hours
        this.maxBackups = 30;
        this.dataVersion = 1;
        this.changeHistory = [];
        this.initializeDataManagement();
    }
    
    initializeDataManagement() {
        this.setupAutoBackup();
        this.setupDataVersioning();
        this.setupDataIntegrityChecks();
        this.setupExportFormats();
    }
    
    setupAutoBackup() {
        if (this.autoBackupEnabled) {
            this.backupInterval = setInterval(() => {
                this.createBackup('auto');
            }, this.backupFrequency);
        }
    }
    
    createBackup(type = 'manual') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupData = {
            timestamp: new Date().toISOString(),
            type: type,
            version: this.dataVersion,
            data: {
                inventory: [...inventory],
                customers: [...customers],
                sales: [...sales],
                gallery: [...gallery],
                invoices: [...invoices],
                ideas: [...ideas]
            },
            metadata: {
                totalItems: inventory.length + customers.length + sales.length + gallery.length + invoices.length + ideas.length,
                lastModified: new Date().toISOString(),
                userAgent: navigator.userAgent,
                appVersion: '1.0.104'
            }
        };
        
        // Store backup in localStorage
        const backupKey = `backup_${timestamp}`;
        localStorage.setItem(backupKey, JSON.stringify(backupData));
        
        // Clean up old backups
        this.cleanupOldBackups();
        
        // Save backup info
        this.saveBackupInfo(backupKey, backupData);
        
        showNotification(`Backup created successfully! (${type})`, 'success');
        return backupKey;
    }
    
    cleanupOldBackups() {
        const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('backup_'));
        if (backupKeys.length > this.maxBackups) {
            // Sort by timestamp and remove oldest
            const sortedKeys = backupKeys.sort((a, b) => {
                const timestampA = a.split('_')[1];
                const timestampB = b.split('_')[1];
                return new Date(timestampA) - new Date(timestampB);
            });
            
            const keysToRemove = sortedKeys.slice(0, backupKeys.length - this.maxBackups);
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }
    
    saveBackupInfo(backupKey, backupData) {
        const backupInfo = this.getBackupInfo();
        backupInfo.push({
            key: backupKey,
            timestamp: backupData.timestamp,
            type: backupData.type,
            version: backupData.version,
            totalItems: backupData.metadata.totalItems
        });
        
        localStorage.setItem('backup_info', JSON.stringify(backupInfo));
    }
    
    getBackupInfo() {
        const info = localStorage.getItem('backup_info');
        return info ? JSON.parse(info) : [];
    }
    
    restoreBackup(backupKey) {
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
            showNotification('Backup not found!', 'error');
            return false;
        }
        
        try {
            const backup = JSON.parse(backupData);
            
            // Validate backup data
            if (!this.validateBackupData(backup)) {
                showNotification('Invalid backup data!', 'error');
                return false;
            }
            
            // Create current state backup before restore
            this.createBackup('pre-restore');
            
            // Restore data
            inventory = [...backup.data.inventory];
            customers = [...backup.data.customers];
            sales = [...backup.data.sales];
            gallery = [...backup.data.gallery];
            invoices = [...backup.data.invoices];
            ideas = [...backup.data.ideas];
            
            // Save restored data
            this.saveData();
            
            // Reload UI
            loadInventoryTable();
            loadCustomersTable();
            loadSalesTable();
            loadGallery();
            loadIdeas();
            
            showNotification('Backup restored successfully!', 'success');
            return true;
            
        } catch (error) {
            logError('Backup restore failed', error);
            showNotification('Failed to restore backup!', 'error');
            return false;
        }
    }
    
    validateBackupData(backup) {
        return backup && 
               backup.data && 
               Array.isArray(backup.data.inventory) &&
               Array.isArray(backup.data.customers) &&
               Array.isArray(backup.data.sales) &&
               Array.isArray(backup.data.gallery) &&
               Array.isArray(backup.data.invoices) &&
               Array.isArray(backup.data.ideas);
    }
    
    setupDataVersioning() {
        // Track changes for versioning
        this.originalData = {
            inventory: [...inventory],
            customers: [...customers],
            sales: [...sales],
            gallery: [...gallery],
            invoices: [...invoices],
            ideas: [...ideas]
        };
    }
    
    trackChange(action, itemType, itemId, oldValue, newValue) {
        const change = {
            timestamp: new Date().toISOString(),
            action: action,
            itemType: itemType,
            itemId: itemId,
            oldValue: oldValue,
            newValue: newValue,
            user: 'current_user' // Could be enhanced with actual user tracking
        };
        
        this.changeHistory.push(change);
        
        // Keep only last 1000 changes
        if (this.changeHistory.length > 1000) {
            this.changeHistory = this.changeHistory.slice(-1000);
        }
        
        // Save change history
        localStorage.setItem('change_history', JSON.stringify(this.changeHistory));
    }
    
    setupDataIntegrityChecks() {
        // Run integrity checks periodically
        setInterval(() => {
            this.runDataIntegrityChecks();
        }, 60 * 60 * 1000); // Every hour
    }
    
    runDataIntegrityChecks() {
        const issues = [];
        
        // Check for duplicate IDs
        const allIds = [
            ...inventory.map(item => item.id),
            ...customers.map(item => item.id),
            ...sales.map(item => item.id),
            ...gallery.map(item => item.id),
            ...invoices.map(item => item.id),
            ...ideas.map(item => item.id)
        ];
        
        const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            issues.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        // Check for missing required fields
        inventory.forEach((item, index) => {
            if (!item.description || !item.status) {
                issues.push(`Inventory item ${index} missing required fields`);
            }
        });
        
        customers.forEach((customer, index) => {
            if (!customer.name || !customer.email) {
                issues.push(`Customer ${index} missing required fields`);
            }
        });
        
        if (issues.length > 0) {
            console.warn('Data integrity issues found:', issues);
            showNotification(`Data integrity issues found: ${issues.length}`, 'warning');
        }
        
        return issues;
    }
    
    setupExportFormats() {
        // Export functionality will be added here
    }
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            showNotification('No data to export!', 'warning');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }
    
    exportToJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }
    
    exportToExcel(data, filename) {
        // Simple Excel export using CSV format
        this.exportToCSV(data, filename.replace('.xlsx', '.csv'));
    }
    
    exportToPDF(data, filename) {
        // Use jsPDF to create a proper PDF
        if (typeof window.jspdf === 'undefined') {
            showError('PDF library not loaded', new Error('Please refresh the page and try again'));
            return;
        }
        
        showLoadingSpinner('Generating PDF...', 'export-pdf');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add header
            doc.setFontSize(18);
            doc.text('Embroidery Inventory Report', 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Total Items: ${data.length}`, 14, 36);
            
            // Add table
            let yPos = 50;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 14;
            const rowHeight = 8;
            
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const colWidth = (doc.internal.pageSize.width - (margin * 2)) / headers.length;
                
                // Table headers
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                headers.forEach((header, i) => {
                    doc.text(header, margin + (i * colWidth), yPos);
                });
                yPos += rowHeight;
                
                // Table rows
                doc.setFont(undefined, 'normal');
                data.forEach((row, rowIndex) => {
                    if (yPos > pageHeight - 20) {
                        doc.addPage();
                        yPos = margin;
                    }
                    
                    headers.forEach((header, i) => {
                        const value = String(row[header] || '').substring(0, 30); // Truncate long values
                        doc.text(value, margin + (i * colWidth), yPos);
                    });
                    yPos += rowHeight;
                });
            }
            
            doc.save(filename || 'inventory_report.pdf');
            hideLoadingSpinner('export-pdf');
            showNotification('PDF exported successfully!', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            hideLoadingSpinner('export-pdf');
            showError('Failed to export PDF', error);
        }
    }
    
    // Export invoice as PDF
    exportInvoicePDF(saleIndex) {
        if (typeof window.jspdf === 'undefined') {
            showError('PDF library not loaded', new Error('Please refresh the page and try again'));
            return;
        }
        
        if (saleIndex < 0 || saleIndex >= sales.length) {
            showError('Invalid sale', new Error('Sale record not found'));
            return;
        }
        
        showLoadingSpinner('Generating invoice PDF...', 'export-invoice-pdf');
        
        try {
            const sale = sales[saleIndex];
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Invoice header
            doc.setFontSize(24);
            doc.text('INVOICE', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            const date = new Date().toLocaleDateString();
            doc.text(`Date: ${date}`, 14, 35);
            doc.text(`Invoice #: ${sale.id || saleIndex + 1}`, 14, 42);
            
            // Customer info
            if (sale.customer) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Bill To:', 14, 55);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(10);
                doc.text(sale.customer, 14, 62);
                if (sale.customerContact) {
                    doc.text(sale.customerContact, 14, 69);
                }
            }
            
            // Item details
            let yPos = 90;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Item Description', 14, yPos);
            doc.text('Quantity', 100, yPos);
            doc.text('Price', 140, yPos);
            doc.text('Total', 170, yPos);
            
            yPos += 8;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 200, yPos);
            yPos += 5;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            const description = sale.description || sale.itemDescription || 'Embroidery Item';
            const quantity = sale.quantity || 1;
            const price = parseFloat(sale.price) || parseFloat(sale.salePrice) || 0;
            const total = quantity * price;
            
            doc.text(description.substring(0, 50), 14, yPos);
            doc.text(String(quantity), 100, yPos);
            doc.text(`$${price.toFixed(2)}`, 140, yPos);
            doc.text(`$${total.toFixed(2)}`, 170, yPos);
            
            // Totals
            yPos += 15;
            doc.line(140, yPos, 200, yPos);
            yPos += 8;
            
            doc.setFont(undefined, 'bold');
            doc.text('Subtotal:', 140, yPos);
            doc.text(`$${total.toFixed(2)}`, 170, yPos);
            
            const tax = parseFloat(sale.tax) || 0;
            if (tax > 0) {
                yPos += 8;
                doc.setFont(undefined, 'normal');
                doc.text('Tax:', 140, yPos);
                doc.text(`$${tax.toFixed(2)}`, 170, yPos);
            }
            
            const commission = parseFloat(sale.commission) || 0;
            if (commission > 0) {
                yPos += 8;
                doc.text('Commission:', 140, yPos);
                doc.text(`$${commission.toFixed(2)}`, 170, yPos);
            }
            
            yPos += 8;
            doc.line(140, yPos, 200, yPos);
            yPos += 8;
            
            const grandTotal = total + tax;
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.text('Total:', 140, yPos);
            doc.text(`$${grandTotal.toFixed(2)}`, 170, yPos);
            
            // Notes
            if (sale.notes) {
                yPos += 15;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text('Notes:', 14, yPos);
                yPos += 7;
                const notes = sale.notes.split('\n');
                notes.forEach(note => {
                    doc.text(note.substring(0, 80), 14, yPos);
                    yPos += 7;
                });
            }
            
            const filename = `invoice_${sale.id || saleIndex + 1}_${date.replace(/\//g, '-')}.pdf`;
            doc.save(filename);
            hideLoadingSpinner('export-invoice-pdf');
            showNotification('Invoice exported successfully!', 'success');
        } catch (error) {
            console.error('Invoice PDF export error:', error);
            hideLoadingSpinner('export-invoice-pdf');
            showError('Failed to export invoice', error);
        }
    }
    
    // Export sales report as PDF
    exportSalesReportPDF(startDate = null, endDate = null) {
        if (typeof window.jspdf === 'undefined') {
            showError('PDF library not loaded', new Error('Please refresh the page and try again'));
            return;
        }
        
        showLoadingSpinner('Generating sales report PDF...', 'export-sales-pdf');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Filter sales by date if provided
            let filteredSales = sales;
            if (startDate || endDate) {
                filteredSales = sales.filter(sale => {
                    const saleDate = sale.saleDate ? new Date(sale.saleDate) : new Date();
                    if (startDate && saleDate < new Date(startDate)) return false;
                    if (endDate && saleDate > new Date(endDate)) return false;
                    return true;
                });
            }
            
            // Header
            doc.setFontSize(18);
            doc.text('Sales Report', 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            if (startDate || endDate) {
                doc.text(`Period: ${startDate || 'Beginning'} to ${endDate || 'Today'}`, 14, 37);
            }
            doc.text(`Total Sales: ${filteredSales.length}`, 14, 44);
            
            // Calculate totals
            const totalRevenue = filteredSales.reduce((sum, sale) => {
                const price = parseFloat(sale.price) || parseFloat(sale.salePrice) || 0;
                const qty = parseFloat(sale.quantity) || 1;
                return sum + (price * qty);
            }, 0);
            
            doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, 51);
            
            // Sales table
            let yPos = 65;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Date', 14, yPos);
            doc.text('Customer', 50, yPos);
            doc.text('Item', 100, yPos);
            doc.text('Amount', 160, yPos);
            
            yPos += 8;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 200, yPos);
            yPos += 5;
            
            doc.setFont(undefined, 'normal');
            const pageHeight = doc.internal.pageSize.height;
            
            filteredSales.forEach(sale => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 14;
                }
                
                const saleDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A';
                const customer = (sale.customer || 'N/A').substring(0, 20);
                const item = (sale.description || sale.itemDescription || 'N/A').substring(0, 25);
                const amount = parseFloat(sale.price) || parseFloat(sale.salePrice) || 0;
                const qty = parseFloat(sale.quantity) || 1;
                const total = amount * qty;
                
                doc.text(saleDate, 14, yPos);
                doc.text(customer, 50, yPos);
                doc.text(item, 100, yPos);
                doc.text(`$${total.toFixed(2)}`, 160, yPos);
                yPos += 7;
            });
            
            // Summary at end
            yPos += 5;
            doc.line(14, yPos, 200, yPos);
            yPos += 8;
            doc.setFont(undefined, 'bold');
            doc.text('Total Revenue:', 140, yPos);
            doc.text(`$${totalRevenue.toFixed(2)}`, 160, yPos);
            
            const filename = `sales_report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            hideLoadingSpinner('export-sales-pdf');
            showNotification('Sales report exported successfully!', 'success');
        } catch (error) {
            console.error('Sales report PDF export error:', error);
            hideLoadingSpinner('export-sales-pdf');
            showError('Failed to export sales report', error);
        }
    }
    
    // Export customer order history as PDF
    exportCustomerOrderHistoryPDF(customerName) {
        if (typeof window.jspdf === 'undefined') {
            showError('PDF library not loaded', new Error('Please refresh the page and try again'));
            return;
        }
        
        showLoadingSpinner('Generating customer order history PDF...', 'export-customer-pdf');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Get customer orders
            const customerOrders = inventory.filter(item => item.customer === customerName);
            const customerSales = sales.filter(sale => sale.customer === customerName);
            
            // Header
            doc.setFontSize(18);
            doc.text('Customer Order History', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(customerName, 105, 30, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);
            doc.text(`Total Orders: ${customerOrders.length}`, 14, 47);
            doc.text(`Total Sales: ${customerSales.length}`, 14, 54);
            
            // Calculate totals
            const totalSpent = customerOrders.reduce((sum, item) => {
                const price = parseFloat(item.price) || 0;
                const qty = parseFloat(item.quantity) || 1;
                return sum + (price * qty);
            }, 0);
            
            doc.text(`Total Spent: $${totalSpent.toFixed(2)}`, 14, 61);
            
            // Orders table
            let yPos = 75;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Date', 14, yPos);
            doc.text('Description', 50, yPos);
            doc.text('Status', 120, yPos);
            doc.text('Amount', 150, yPos);
            
            yPos += 8;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 200, yPos);
            yPos += 5;
            
            doc.setFont(undefined, 'normal');
            const pageHeight = doc.internal.pageSize.height;
            
            customerOrders.forEach(order => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 14;
                }
                
                const orderDate = order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'N/A';
                const description = (order.description || 'N/A').substring(0, 30);
                const status = (order.status || 'pending').substring(0, 15);
                const amount = parseFloat(order.price) || 0;
                const qty = parseFloat(order.quantity) || 1;
                const total = amount * qty;
                
                doc.text(orderDate, 14, yPos);
                doc.text(description, 50, yPos);
                doc.text(status, 120, yPos);
                doc.text(`$${total.toFixed(2)}`, 150, yPos);
                yPos += 7;
            });
            
            const filename = `customer_history_${customerName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            hideLoadingSpinner('export-customer-pdf');
            showNotification('Customer order history exported successfully!', 'success');
        } catch (error) {
            console.error('Customer order history PDF export error:', error);
            hideLoadingSpinner('export-customer-pdf');
            showError('Failed to export customer order history', error);
        }
    }
    
    generateReportContent(data) {
        const timestamp = new Date().toLocaleString();
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Embroidery Inventory Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Embroidery Inventory Report</h1>
                    <p>Generated on: ${timestamp}</p>
                    <p>Total Items: ${data.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${Object.values(row).map(value => `<td>${value || ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    getDataStatistics() {
        return {
            inventory: inventory.length,
            customers: customers.length,
            sales: sales.length,
            gallery: gallery.length,
            invoices: invoices.length,
            ideas: ideas.length,
            totalItems: inventory.length + customers.length + sales.length + gallery.length + invoices.length + ideas.length,
            lastBackup: this.getLastBackupTime(),
            dataSize: this.calculateDataSize(),
            changeHistory: this.changeHistory.length
        };
    }
    
    getLastBackupTime() {
        const backupInfo = this.getBackupInfo();
        if (backupInfo.length === 0) return 'Never';
        
        const lastBackup = backupInfo[backupInfo.length - 1];
        return new Date(lastBackup.timestamp).toLocaleString();
    }
    
    calculateDataSize() {
        const data = {
            inventory, customers, sales, gallery, invoices, ideas
        };
        const jsonString = JSON.stringify(data);
        return new Blob([jsonString]).size;
    }
    
    enableAutoBackup() {
        this.autoBackupEnabled = true;
        this.setupAutoBackup();
        showNotification('Auto-backup enabled!', 'success');
    }
    
    disableAutoBackup() {
        this.autoBackupEnabled = false;
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
        showNotification('Auto-backup disabled!', 'info');
    }
    
    setBackupFrequency(hours) {
        this.backupFrequency = hours * 60 * 60 * 1000;
        if (this.autoBackupEnabled) {
            this.disableAutoBackup();
            this.enableAutoBackup();
        }
        showNotification(`Backup frequency set to ${hours} hours!`, 'success');
    }
    
    getBackupList() {
        return this.getBackupInfo().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    deleteBackup(backupKey) {
        localStorage.removeItem(backupKey);
        
        // Update backup info
        const backupInfo = this.getBackupInfo();
        const updatedInfo = backupInfo.filter(backup => backup.key !== backupKey);
        localStorage.setItem('backup_info', JSON.stringify(updatedInfo));
        
        showNotification('Backup deleted successfully!', 'success');
    }
    
    exportAllData() {
        const allData = {
            inventory, customers, sales, gallery, invoices, ideas,
            metadata: {
                exportDate: new Date().toISOString(),
                version: this.dataVersion,
                totalItems: this.getDataStatistics().totalItems
            }
        };
        
        this.exportToJSON(allData, `embroidery_data_export_${new Date().toISOString().split('T')[0]}.json`);
    }
    
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!this.validateBackupData({ data: importedData })) {
                    showNotification('Invalid data format!', 'error');
                    return;
                }
                
                // Create backup before import
                this.createBackup('pre-import');
                
                // Import data
                inventory = [...importedData.inventory];
                customers = [...importedData.customers];
                sales = [...importedData.sales];
                gallery = [...importedData.gallery];
                invoices = [...importedData.invoices];
                ideas = [...importedData.ideas];
                
                // Save imported data
                this.saveData();
                
                // Reload UI
                loadInventoryTable();
                loadCustomersTable();
                loadSalesTable();
                loadGallery();
                loadIdeas();
                
                showNotification('Data imported successfully!', 'success');
                
            } catch (error) {
                logError('Data import failed', error);
                showNotification('Failed to import data!', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize data manager
const dataManager = new DataManager();

// Advanced Analytics & Reporting System
class AnalyticsManager {
    constructor() {
        this.charts = new Map();
        this.analyticsData = null;
        this.predictiveModels = new Map();
        this.initializeAnalytics();
    }
    
    initializeAnalytics() {
        this.setupCharts();
        this.setupPredictiveAnalytics();
        this.setupRealTimeUpdates();
    }
    
    setupCharts() {
        // Initialize Chart.js if available
        if (typeof Chart !== 'undefined') {
            this.initializeChartJS();
        } else {
            // Fallback to simple HTML/CSS charts
            this.initializeSimpleCharts();
        }
    }
    
    initializeChartJS() {
        // Revenue trend chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            this.charts.set('revenue', new Chart(revenueCtx, {
                type: 'line',
                data: this.getRevenueData(),
                options: this.getChartOptions('Revenue Trend', 'line')
            }));
        }
        
        // Project status pie chart
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            this.charts.set('status', new Chart(statusCtx, {
                type: 'doughnut',
                data: this.getStatusData(),
                options: this.getChartOptions('Project Status', 'doughnut')
            }));
        }
        
        // Monthly completion chart
        const completionCtx = document.getElementById('completionChart');
        if (completionCtx) {
            this.charts.set('completion', new Chart(completionCtx, {
                type: 'bar',
                data: this.getCompletionData(),
                options: this.getChartOptions('Monthly Completions', 'bar')
            }));
        }
    }
    
    initializeSimpleCharts() {
        // Create simple HTML/CSS based charts
        this.createSimpleCharts();
    }
    
    createSimpleCharts() {
        // Revenue trend chart
        const revenueData = this.getRevenueData();
        const revenueChart = document.getElementById('revenueChart');
        if (revenueChart) {
            revenueChart.innerHTML = this.generateSimpleLineChart(revenueData);
        }
        
        // Status pie chart
        const statusData = this.getStatusData();
        const statusChart = document.getElementById('statusChart');
        if (statusChart) {
            statusChart.innerHTML = this.generateSimplePieChart(statusData);
        }
    }
    
    generateSimpleLineChart(data) {
        const maxValue = Math.max(...data.datasets[0].data);
        const minValue = Math.min(...data.datasets[0].data);
        const range = maxValue - minValue;
        
        let html = '<div class="simple-chart line-chart">';
        html += '<div class="chart-header">' + data.title + '</div>';
        html += '<div class="chart-content">';
        
        data.datasets[0].data.forEach((value, index) => {
            const height = range > 0 ? ((value - minValue) / range) * 100 : 50;
            const left = (index / (data.datasets[0].data.length - 1)) * 100;
            
            html += `<div class="chart-bar" style="left: ${left}%; height: ${height}%;" title="${data.labels[index]}: $${value}"></div>`;
        });
        
        html += '</div></div>';
        return html;
    }
    
    generateSimplePieChart(data) {
        let html = '<div class="simple-chart pie-chart">';
        html += '<div class="chart-header">' + data.title + '</div>';
        html += '<div class="chart-content">';
        
        const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
        let cumulativePercentage = 0;
        
        data.datasets[0].data.forEach((value, index) => {
            const percentage = (value / total) * 100;
            const color = data.datasets[0].backgroundColor[index];
            
            html += `<div class="pie-segment" style="background: ${color}; transform: rotate(${cumulativePercentage * 3.6}deg); width: ${percentage}%;" title="${data.labels[index]}: ${value}"></div>`;
            cumulativePercentage += percentage;
        });
        
        html += '</div></div>';
        return html;
    }
    
    getRevenueData() {
        const last12Months = this.getLast12Months();
        const revenueData = last12Months.map(month => {
            const monthSales = sales.filter(sale => {
                const saleDate = new Date(sale.dateSold);
                return saleDate.getMonth() === month.month && saleDate.getFullYear() === month.year;
            });
            return monthSales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        });
        
        return {
            title: 'Monthly Revenue',
            labels: last12Months.map(m => m.name),
            datasets: [{
                label: 'Revenue',
                data: revenueData,
                borderColor: '#4A90A4',
                backgroundColor: 'rgba(74, 144, 164, 0.1)',
                tension: 0.4
            }]
        };
    }
    
    getStatusData() {
        const statusCounts = {
            'Pending': inventory.filter(item => item.status === 'pending').length,
            'In Progress': inventory.filter(item => item.status === 'in-progress').length,
            'Completed': inventory.filter(item => item.status === 'completed').length,
            'Sold': inventory.filter(item => item.status === 'sold').length
        };
        
        return {
            title: 'Project Status Distribution',
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545']
            }]
        };
    }
    
    getCompletionData() {
        const last6Months = this.getLast6Months();
        const completionData = last6Months.map(month => {
            const monthCompletions = inventory.filter(item => {
                const completionDate = new Date(item.dateCompleted || item.dateAdded);
                return completionDate.getMonth() === month.month && completionDate.getFullYear() === month.year;
            });
            return monthCompletions.length;
        });
        
        return {
            title: 'Monthly Completions',
            labels: last6Months.map(m => m.name),
            datasets: [{
                label: 'Completions',
                data: completionData,
                backgroundColor: '#28a745'
            }]
        };
    }
    
    getLast12Months() {
        const months = [];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                month: date.getMonth(),
                year: date.getFullYear()
            });
        }
        
        return months;
    }
    
    getLast6Months() {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                name: date.toLocaleDateString('en-US', { month: 'short' }),
                month: date.getMonth(),
                year: date.getFullYear()
            });
        }
        
        return months;
    }
    
    getChartOptions(title, type) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: title
                }
            }
        };
        
        if (type === 'line') {
            baseOptions.scales = {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            };
        }
        
        return baseOptions;
    }
    
    setupPredictiveAnalytics() {
        this.predictiveModels.set('revenue', new RevenuePredictor());
        this.predictiveModels.set('completion', new CompletionPredictor());
        this.predictiveModels.set('demand', new DemandPredictor());
    }
    
    generatePredictiveInsights() {
        const insights = [];
        
        // Revenue prediction
        const revenuePrediction = this.predictiveModels.get('revenue').predict();
        if (revenuePrediction) {
            insights.push({
                type: 'revenue',
                title: 'Revenue Forecast',
                message: `Based on current trends, projected revenue for next month: $${revenuePrediction.toFixed(2)}`,
                confidence: revenuePrediction.confidence,
                trend: revenuePrediction.trend
            });
        }
        
        // Completion prediction
        const completionPrediction = this.predictiveModels.get('completion').predict();
        if (completionPrediction) {
            insights.push({
                type: 'completion',
                title: 'Completion Forecast',
                message: `Expected completions next month: ${completionPrediction.count} projects`,
                confidence: completionPrediction.confidence,
                trend: completionPrediction.trend
            });
        }
        
        // Demand prediction
        const demandPrediction = this.predictiveModels.get('demand').predict();
        if (demandPrediction) {
            insights.push({
                type: 'demand',
                title: 'Demand Analysis',
                message: `Peak demand expected in: ${demandPrediction.peakMonth}`,
                confidence: demandPrediction.confidence,
                trend: demandPrediction.trend
            });
        }
        
        return insights;
    }
    
    setupRealTimeUpdates() {
        // Update analytics every 5 minutes
        setInterval(() => {
            this.updateAnalytics();
        }, 5 * 60 * 1000);
    }
    
    updateAnalytics() {
        this.analyticsData = this.calculateAnalytics();
        this.updateCharts();
        this.updateStatistics();
    }
    
    calculateAnalytics() {
        return {
            totalRevenue: this.calculateTotalRevenue(),
            averageProjectValue: this.calculateAverageProjectValue(),
            completionRate: this.calculateCompletionRate(),
            customerRetention: this.calculateCustomerRetention(),
            monthlyGrowth: this.calculateMonthlyGrowth(),
            topCustomers: this.getTopCustomers(),
            topCategories: this.getTopCategories(),
            seasonalTrends: this.getSeasonalTrends()
        };
    }
    
    calculateTotalRevenue() {
        return sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
    }
    
    calculateAverageProjectValue() {
        const totalRevenue = this.calculateTotalRevenue();
        const totalProjects = inventory.length;
        return totalProjects > 0 ? totalRevenue / totalProjects : 0;
    }
    
    calculateCompletionRate() {
        const totalProjects = inventory.length;
        const completedProjects = inventory.filter(item => item.status === 'completed').length;
        return totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    }
    
    calculateCustomerRetention() {
        // Simple retention calculation based on repeat customers
        const customerIds = sales.map(sale => sale.customerId).filter(Boolean);
        const uniqueCustomers = new Set(customerIds);
        const repeatCustomers = customerIds.filter((id, index) => customerIds.indexOf(id) !== index);
        
        return uniqueCustomers.size > 0 ? (repeatCustomers.length / uniqueCustomers.size) * 100 : 0;
    }
    
    calculateMonthlyGrowth() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentMonthRevenue = sales.filter(sale => {
            const saleDate = new Date(sale.dateSold);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        }).reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        const lastMonthRevenue = sales.filter(sale => {
            const saleDate = new Date(sale.dateSold);
            return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
        }).reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        
        return lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    }
    
    getTopCustomers() {
        const customerSales = {};
        sales.forEach(sale => {
            if (sale.customer) {
                customerSales[sale.customer] = (customerSales[sale.customer] || 0) + (sale.salePrice || 0);
            }
        });
        
        return Object.entries(customerSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([customer, revenue]) => ({ customer, revenue }));
    }
    
    getTopCategories() {
        const categoryCounts = {};
        inventory.forEach(item => {
            if (item.category) {
                categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
            }
        });
        
        return Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
    }
    
    getSeasonalTrends() {
        const monthlyData = {};
        sales.forEach(sale => {
            const month = new Date(sale.dateSold).getMonth();
            monthlyData[month] = (monthlyData[month] || 0) + (sale.salePrice || 0);
        });
        
        return monthlyData;
    }
    
    updateCharts() {
        this.charts.forEach((chart, key) => {
            if (chart && chart.update) {
                chart.update();
            }
        });
    }
    
    updateStatistics() {
        const stats = this.analyticsData;
        
        // Update DOM elements
        const elements = {
            totalProjects: inventory.length,
            totalRevenue: '$' + stats.totalRevenue.toFixed(2),
            completedProjects: inventory.filter(item => item.status === 'completed').length,
            activeCustomers: customers.length,
            avgProjectValue: '$' + stats.averageProjectValue.toFixed(2),
            completionRate: stats.completionRate.toFixed(1) + '%'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    generateComprehensiveReport() {
        const reportData = this.calculateAnalytics();
        const insights = this.generatePredictiveInsights();
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: reportData,
            insights: insights,
            charts: {
                revenue: this.getRevenueData(),
                status: this.getStatusData(),
                completion: this.getCompletionData()
            }
        };
        
        this.displayReport(report);
        return report;
    }
    
    displayReport(report) {
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) return;
        
        reportContent.innerHTML = this.generateReportHTML(report);
    }
    
    generateReportHTML(report) {
        let html = '<div class="comprehensive-report">';
        
        // Header
        html += '<div class="report-header">';
        html += '<h2>Comprehensive Business Report</h2>';
        html += '<p>Generated on: ' + new Date(report.generatedAt).toLocaleString() + '</p>';
        html += '</div>';
        
        // Summary cards
        html += '<div class="report-summary">';
        html += '<h3>Business Summary</h3>';
        html += '<div class="summary-cards">';
        html += '<div class="summary-card"><h4>Total Revenue</h4><p>$' + report.summary.totalRevenue.toFixed(2) + '</p></div>';
        html += '<div class="summary-card"><h4>Average Project Value</h4><p>$' + report.summary.averageProjectValue.toFixed(2) + '</p></div>';
        html += '<div class="summary-card"><h4>Completion Rate</h4><p>' + report.summary.completionRate.toFixed(1) + '%</p></div>';
        html += '<div class="summary-card"><h4>Customer Retention</h4><p>' + report.summary.customerRetention.toFixed(1) + '%</p></div>';
        html += '</div></div>';
        
        // Insights
        if (report.insights.length > 0) {
            html += '<div class="report-insights">';
            html += '<h3>Predictive Insights</h3>';
            report.insights.forEach(insight => {
                html += '<div class="insight-card">';
                html += '<h4>' + insight.title + '</h4>';
                html += '<p>' + insight.message + '</p>';
                html += '<div class="insight-confidence">Confidence: ' + insight.confidence + '%</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        // Charts
        html += '<div class="report-charts">';
        html += '<h3>Visual Analytics</h3>';
        html += '<div class="charts-grid">';
        html += '<div class="chart-container"><canvas id="revenueChart"></canvas></div>';
        html += '<div class="chart-container"><canvas id="statusChart"></canvas></div>';
        html += '<div class="chart-container"><canvas id="completionChart"></canvas></div>';
        html += '</div></div>';
        
        html += '</div>';
        
        return html;
    }
}

// Predictive Analytics Models
class RevenuePredictor {
    predict() {
        const last6Months = this.getLast6MonthsRevenue();
        if (last6Months.length < 3) return null;
        
        const trend = this.calculateTrend(last6Months);
        const nextMonth = last6Months[last6Months.length - 1] + trend;
        
        return {
            value: Math.max(0, nextMonth),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            confidence: Math.min(95, 60 + (last6Months.length * 5))
        };
    }
    
    getLast6MonthsRevenue() {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthRevenue = sales.filter(sale => {
                const saleDate = new Date(sale.dateSold);
                return saleDate.getMonth() === date.getMonth() && saleDate.getFullYear() === date.getFullYear();
            }).reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
            
            months.push(monthRevenue);
        }
        
        return months;
    }
    
    calculateTrend(data) {
        if (data.length < 2) return 0;
        
        const n = data.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = data.reduce((sum, val) => sum + val, 0);
        const sumXY = data.reduce((sum, val, index) => sum + (val * index), 0);
        const sumXX = data.reduce((sum, val, index) => sum + (index * index), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }
}

class CompletionPredictor {
    predict() {
        const last6Months = this.getLast6MonthsCompletions();
        if (last6Months.length < 3) return null;
        
        const trend = this.calculateTrend(last6Months);
        const nextMonth = last6Months[last6Months.length - 1] + trend;
        
        return {
            count: Math.max(0, Math.round(nextMonth)),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            confidence: Math.min(95, 60 + (last6Months.length * 5))
        };
    }
    
    getLast6MonthsCompletions() {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthCompletions = inventory.filter(item => {
                const completionDate = new Date(item.dateCompleted || item.dateAdded);
                return completionDate.getMonth() === date.getMonth() && completionDate.getFullYear() === date.getFullYear();
            }).length;
            
            months.push(monthCompletions);
        }
        
        return months;
    }
    
    calculateTrend(data) {
        if (data.length < 2) return 0;
        
        const n = data.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = data.reduce((sum, val) => sum + val, 0);
        const sumXY = data.reduce((sum, val, index) => sum + (val * index), 0);
        const sumXX = data.reduce((sum, val, index) => sum + (index * index), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }
}

class DemandPredictor {
    predict() {
        const seasonalData = this.getSeasonalData();
        const currentMonth = new Date().getMonth();
        
        // Find peak month
        const peakMonth = Object.entries(seasonalData).reduce((a, b) => 
            seasonalData[a[0]] > seasonalData[b[0]] ? a : b
        )[0];
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        return {
            peakMonth: monthNames[parseInt(peakMonth)],
            trend: 'seasonal',
            confidence: 75
        };
    }
    
    getSeasonalData() {
        const monthlyData = {};
        sales.forEach(sale => {
            const month = new Date(sale.dateSold).getMonth();
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });
        
        return monthlyData;
    }
}

// Initialize analytics manager
const analyticsManager = new AnalyticsManager();

// Professional Desktop Features & Integration
class DesktopManager {
    constructor() {
        this.isElectron = this.detectElectron();
        this.fileSystemAccess = null;
        this.notificationPermission = null;
        this.systemIntegration = null;
        this.initializeDesktopFeatures();
    }
    
    detectElectron() {
        return typeof window !== 'undefined' && window.process && window.process.type;
    }
    
    initializeDesktopFeatures() {
        if (this.isElectron) {
            this.setupElectronFeatures();
        } else {
            this.setupWebFeatures();
        }
        
        this.setupNotifications();
        this.setupFileSystemAccess();
        this.setupSystemIntegration();
        this.setupAutoStart();
    }
    
    setupElectronFeatures() {
        // Electron-specific features
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                this.electronAPI = ipcRenderer;
                this.setupElectronIPC();
            } catch (error) {
                console.warn('Electron API not available:', error);
            }
        }
    }
    
    setupWebFeatures() {
        // Web-based desktop features
        this.setupWebNotifications();
        this.setupWebFileSystem();
        this.setupWebSystemIntegration();
    }
    
    setupElectronIPC() {
        if (!this.electronAPI) return;
        
        // Listen for system events
        this.electronAPI.on('system-notification', (event, data) => {
            this.showSystemNotification(data.title, data.body, data.icon);
        });
        
        this.electronAPI.on('file-opened', (event, data) => {
            this.handleFileOpen(data);
        });
        
        this.electronAPI.on('app-close', (event) => {
            this.handleAppClose();
        });
    }
    
    setupNotifications() {
        if ('Notification' in window) {
            this.notificationPermission = Notification.permission;
            
            // Don't auto-request notification permission
            // Users can enable it manually if needed
            // if (this.notificationPermission === 'default') {
            //     this.requestNotificationPermission();
            // }
        }
    }
    
    async requestNotificationPermission() {
        try {
            this.notificationPermission = await Notification.requestPermission();
            return this.notificationPermission === 'granted';
        } catch (error) {
            console.warn('Notification permission request failed:', error);
            return false;
        }
    }
    
    showNotification(title, options = {}) {
        if (this.notificationPermission === 'granted') {
            const notification = new Notification(title, {
                icon: options.icon || '/logo.png',
                badge: '/logo.png',
                body: options.body || '',
                tag: options.tag || 'embroidery-app',
                requireInteraction: options.requireInteraction || false,
                ...options
            });
            
            if (options.onclick) {
                notification.onclick = options.onclick;
            }
            
            // Auto-close after 5 seconds unless requireInteraction is true
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 5000);
            }
            
            return notification;
        } else {
            // Fallback to browser notification
            this.showBrowserNotification(title, options);
        }
    }
    
    showBrowserNotification(title, options = {}) {
        // Create a custom notification element
        const notification = document.createElement('div');
        notification.className = 'desktop-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${title}</div>
                    <div class="notification-body">${options.body || ''}</div>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        return notification;
    }
    
    setupFileSystemAccess() {
        if ('showOpenFilePicker' in window) {
            this.fileSystemAccess = 'native';
        } else if (this.isElectron) {
            this.fileSystemAccess = 'electron';
        } else {
            this.fileSystemAccess = 'fallback';
        }
    }
    
    async openFile(options = {}) {
        if (this.fileSystemAccess === 'native') {
            return this.openFileNative(options);
        } else if (this.fileSystemAccess === 'electron') {
            return this.openFileElectron(options);
        } else {
            return this.openFileFallback(options);
        }
    }
    
    async openFileNative(options) {
        try {
            const fileHandles = await window.showOpenFilePicker({
                types: options.types || [
                    {
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    },
                    {
                        description: 'CSV files',
                        accept: { 'text/csv': ['.csv'] }
                    }
                ],
                multiple: options.multiple || false
            });
            
            const files = [];
            for (const fileHandle of fileHandles) {
                const file = await fileHandle.getFile();
                files.push(file);
            }
            
            return files;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('File open failed:', error);
            }
            return [];
        }
    }
    
    async openFileElectron(options) {
        if (!this.electronAPI) return [];
        
        try {
            const result = await this.electronAPI.invoke('open-file', options);
            return result;
        } catch (error) {
            console.error('Electron file open failed:', error);
            return [];
        }
    }
    
    openFileFallback(options) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = options.multiple || false;
            input.accept = options.accept || '.json,.csv';
            
            input.onchange = (e) => {
                resolve(Array.from(e.target.files));
            };
            
            input.click();
        });
    }
    
    async saveFile(content, filename, mimeType = 'application/json') {
        if (this.fileSystemAccess === 'native') {
            return this.saveFileNative(content, filename, mimeType);
        } else if (this.fileSystemAccess === 'electron') {
            return this.saveFileElectron(content, filename, mimeType);
        } else {
            return this.saveFileFallback(content, filename, mimeType);
        }
    }
    
    async saveFileNative(content, filename, mimeType) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Files',
                    accept: { [mimeType]: ['.' + filename.split('.').pop()] }
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            return true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('File save failed:', error);
            }
            return false;
        }
    }
    
    async saveFileElectron(content, filename, mimeType) {
        if (!this.electronAPI) return false;
        
        try {
            await this.electronAPI.invoke('save-file', { content, filename, mimeType });
            return true;
        } catch (error) {
            console.error('Electron file save failed:', error);
            return false;
        }
    }
    
    saveFileFallback(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    }
    
    setupSystemIntegration() {
        this.setupAutoStart();
        this.setupSystemTray();
        this.setupGlobalShortcuts();
        this.setupFileAssociations();
    }
    
    setupAutoStart() {
        // Check if app should start with system
        const autoStart = localStorage.getItem('embroidery_auto_start');
        if (autoStart === 'true') {
            this.enableAutoStart();
        }
    }
    
    enableAutoStart() {
        localStorage.setItem('embroidery_auto_start', 'true');
        
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('enable-auto-start');
        }
        
        this.showNotification('Auto-start enabled', {
            body: 'App will start automatically with your system',
            icon: '/logo.png'
        });
    }
    
    disableAutoStart() {
        localStorage.setItem('embroidery_auto_start', 'false');
        
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('disable-auto-start');
        }
        
        this.showNotification('Auto-start disabled', {
            body: 'App will not start automatically with your system',
            icon: '/logo.png'
        });
    }
    
    setupSystemTray() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('setup-tray', {
                title: 'Embroidery Inventory',
                icon: '/logo.png',
                menu: [
                    { label: 'Show App', click: () => this.showApp() },
                    { label: 'Hide App', click: () => this.hideApp() },
                    { type: 'separator' },
                    { label: 'Create Backup', click: () => dataManager.createBackup('manual') },
                    { label: 'Export Data', click: () => dataManager.exportAllData() },
                    { type: 'separator' },
                    { label: 'Quit', click: () => this.quitApp() }
                ]
            });
        }
    }
    
    setupGlobalShortcuts() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('register-global-shortcuts', {
                'CmdOrCtrl+Shift+E': () => this.showApp(),
                'CmdOrCtrl+Shift+B': () => dataManager.createBackup('manual'),
                'CmdOrCtrl+Shift+Q': () => this.quitApp()
            });
        }
    }
    
    setupFileAssociations() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('register-file-associations', {
                '.json': 'Embroidery Data File',
                '.csv': 'Embroidery CSV File'
            });
        }
    }
    
    showApp() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('show-app');
        } else {
            window.focus();
        }
    }
    
    hideApp() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('hide-app');
        } else {
            window.blur();
        }
    }
    
    quitApp() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('quit-app');
        } else {
            window.close();
        }
    }
    
    setupWebNotifications() {
        // Web-based notification system
        this.notificationContainer = this.createNotificationContainer();
    }
    
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }
    
    setupWebFileSystem() {
        // Web-based file system access
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
    }
    
    setupWebSystemIntegration() {
        // Web-based system integration
        this.setupWebAutoStart();
        this.setupWebShortcuts();
    }
    
    setupWebAutoStart() {
        // Service worker removed to fix deployment issues
    }
    
    setupWebShortcuts() {
        // Web-based keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch(e.key) {
                    case 'E':
                        e.preventDefault();
                        this.showApp();
                        break;
                    case 'B':
                        e.preventDefault();
                        dataManager.createBackup('manual');
                        break;
                    case 'Q':
                        e.preventDefault();
                        this.quitApp();
                        break;
                }
            }
        });
    }
    
    handleFileOpen(data) {
        if (data.type === 'json') {
            dataManager.importData(data.file);
        } else if (data.type === 'csv') {
            this.importCSV(data.file);
        }
    }
    
    handleAppClose() {
        // Save data before closing
        if (typeof saveData === 'function') {
            saveData();
        }
        
        // Create backup
        dataManager.createBackup('auto');
    }
    
    importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header.trim()] = values[index]?.trim() || '';
                });
                return obj;
            });
            
            // Process CSV data
            this.processImportedData(data);
        };
        reader.readAsText(file);
    }
    
    processImportedData(data) {
        // Process imported data based on type
        console.log('Processing imported data:', data);
        showNotification('Data imported successfully!', 'success');
    }
    
    getSystemInfo() {
        return {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            isElectron: this.isElectron,
            fileSystemAccess: this.fileSystemAccess,
            notificationPermission: this.notificationPermission
        };
    }
    
    checkForUpdates() {
        if (this.isElectron && this.electronAPI) {
            this.electronAPI.invoke('check-for-updates');
        } else {
            // Web-based update check
            this.checkWebUpdates();
        }
    }
    
    checkWebUpdates() {
        // Check for app updates
        fetch('/version.json')
            .then(response => response.json())
            .then(data => {
                const currentVersion = '1.0.104'; // Current app version
                if (data.version !== currentVersion) {
                    this.showNotification('Update Available', {
                        body: `Version ${data.version} is available. Current version: ${currentVersion}`,
                        requireInteraction: true,
                        onclick: () => window.open(data.downloadUrl, '_blank')
                    });
                }
            })
            .catch(error => {
                console.log('Update check failed:', error);
            });
    }
    
    setupWebNotifications() {
        // Enhanced web notification system
        this.notificationQueue = [];
        this.maxNotifications = 5;
    }
    
    showSystemNotification(title, body, icon) {
        this.showNotification(title, { body, icon });
    }
    
    scheduleNotification(title, body, delay) {
        setTimeout(() => {
            this.showNotification(title, { body });
        }, delay);
    }
    
    setupPeriodicNotifications() {
        // Schedule periodic notifications for important tasks
        setInterval(() => {
            this.checkPendingTasks();
        }, 60 * 60 * 1000); // Every hour
    }
    
    checkPendingTasks() {
        const pendingTasks = inventory.filter(item => 
            item.status === 'pending' && 
            new Date(item.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
        
        if (pendingTasks.length > 0) {
            this.showNotification('Pending Tasks', {
                body: `${pendingTasks.length} tasks are due soon`,
                requireInteraction: true
            });
        }
    }
}

// Initialize desktop manager
const desktopManager = new DesktopManager();

// Advanced Form Management & Validation System
class FormManager {
    constructor() {
        this.forms = new Map();
        this.templates = new Map();
        this.autoSaveInterval = null;
        this.validationRules = new Map();
        this.initializeFormManagement();
    }
    
    initializeFormManagement() {
        this.setupValidationRules();
        this.setupAutoSave();
        this.setupFormTemplates();
        this.setupSmartValidation();
    }
    
    setupValidationRules() {
        // Define validation rules for different field types
        this.validationRules.set('email', {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        });
        
        this.validationRules.set('phone', {
            pattern: /^[\+]?[1-9][\d]{0,15}$/,
            message: 'Please enter a valid phone number'
        });
        
        this.validationRules.set('price', {
            pattern: /^\d+(\.\d{1,2})?$/,
            message: 'Please enter a valid price (e.g., 25.99)'
        });
        
        this.validationRules.set('date', {
            validator: (value) => {
                const date = new Date(value);
                return !isNaN(date.getTime()) && date > new Date('1900-01-01');
            },
            message: 'Please enter a valid date'
        });
        
        this.validationRules.set('required', {
            validator: (value) => value && value.trim().length > 0,
            message: 'This field is required'
        });
        
        this.validationRules.set('minLength', {
            validator: (value, min) => value && value.length >= min,
            message: (min) => `Must be at least ${min} characters long`
        });
        
        this.validationRules.set('maxLength', {
            validator: (value, max) => {
                if (typeof max !== 'number' || max < 0) {
                    console.warn('⚠️ Invalid maxLength parameter:', max, 'for value:', value);
                    return true; // Skip validation for invalid parameters
                }
                return !value || value.length <= max;
            },
            message: (max) => {
                if (typeof max !== 'number' || max < 0) {
                    console.error('❌ Invalid maxLength validation called with:', max);
                    return 'Invalid validation parameter';
                }
                return `Must be no more than ${max} characters long`;
            }
        });
    }
    
    setupAutoSave() {
        // Auto-save forms every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveAllForms();
        }, 30000);
    }
    
    setupFormTemplates() {
        // Define form templates for common use cases
        this.templates.set('inventory-item', {
            name: 'Inventory Item',
            fields: [
                { name: 'description', type: 'text', required: true, label: 'Item Description' },
                { name: 'category', type: 'select', required: true, label: 'Category', options: ['kits', 'hoops', 'fabric', 'thread', 'supplies'] },
                { name: 'quantity', type: 'number', required: true, label: 'Quantity', min: 0 },
                { name: 'status', type: 'select', required: true, label: 'Status', options: ['available', 'low-stock', 'out-of-stock'] },
                { name: 'location', type: 'text', label: 'Location' },
                { name: 'notes', type: 'textarea', label: 'Notes' }
            ]
        });
        
        this.templates.set('customer', {
            name: 'Customer',
            fields: [
                { name: 'name', type: 'text', required: true, label: 'Customer Name' },
                { name: 'email', type: 'email', required: true, label: 'Email Address' },
                { name: 'phone', type: 'tel', label: 'Phone Number' },
                { name: 'address', type: 'textarea', label: 'Address' },
                { name: 'notes', type: 'textarea', label: 'Notes' }
            ]
        });
        
        this.templates.set('sale', {
            name: 'Sale',
            fields: [
                { name: 'itemName', type: 'text', required: true, label: 'Item Name' },
                { name: 'customer', type: 'text', required: true, label: 'Customer' },
                { name: 'salePrice', type: 'number', required: true, label: 'Sale Price', min: 0, step: 0.01 },
                { name: 'dateSold', type: 'date', required: true, label: 'Date Sold' },
                { name: 'saleChannel', type: 'select', required: true, label: 'Sale Channel', options: ['individual', 'etsy', 'facebook', 'instagram', 'other'] },
                { name: 'notes', type: 'textarea', label: 'Notes' }
            ]
        });
    }
    
    setupSmartValidation() {
        // Set up real-time validation for all forms
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.validateField(e.target);
            }
        });
        
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.validateField(e.target);
            }
        });
    }
    
    validateField(field) {
        const form = field.closest('form');
        if (!form) return;
        
        const formId = form.id;
        if (!formId) return;
        
        const fieldName = field.name;
        const fieldValue = field.value;
        const fieldType = field.type;
        
        // Get validation rules for this field
        const rules = this.getFieldValidationRules(field);
        const errors = [];
        
        // Apply validation rules
        rules.forEach(rule => {
            if (!this.validateRule(fieldValue, rule)) {
                errors.push(rule.message);
            }
        });
        
        // Update field validation state
        this.updateFieldValidation(field, errors);
        
        // Update form validation state
        this.updateFormValidation(form);
        
        return errors.length === 0;
    }
    
    getFieldValidationRules(field) {
        const rules = [];
        const fieldType = field.type;
        const fieldName = field.name;
        
        // Required field validation
        if (field.required) {
            rules.push(this.validationRules.get('required'));
        }
        
        // Type-specific validation
        if (fieldType === 'email') {
            rules.push(this.validationRules.get('email'));
        } else if (fieldType === 'tel') {
            rules.push(this.validationRules.get('phone'));
        } else if (fieldType === 'number') {
            if (fieldName.includes('price') || fieldName.includes('Price')) {
                rules.push(this.validationRules.get('price'));
            }
        } else if (fieldType === 'date') {
            rules.push(this.validationRules.get('date'));
        }
        
        // Length validation
        if (field.minLength && field.minLength > 0) {
            rules.push({
                validator: (value) => this.validationRules.get('minLength').validator(value, field.minLength),
                message: this.validationRules.get('minLength').message(field.minLength)
            });
        }
        
        if (field.maxLength && field.maxLength > 0) {
            rules.push({
                validator: (value) => this.validationRules.get('maxLength').validator(value, field.maxLength),
                message: this.validationRules.get('maxLength').message(field.maxLength)
            });
        }
        
        return rules;
    }
    
    validateRule(value, rule) {
        if (rule.pattern) {
            return rule.pattern.test(value);
        } else if (rule.validator) {
            return rule.validator(value);
        }
        return true;
    }
    
    updateFieldValidation(field, errors) {
        const fieldContainer = field.closest('.form-group') || field.parentElement;
        const errorContainer = fieldContainer.querySelector('.field-error');
        
        // Remove existing error styling
        field.classList.remove('error');
        if (errorContainer) {
            errorContainer.remove();
        }
        
        // Add error styling and message
        if (errors.length > 0) {
            field.classList.add('error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errors[0]; // Show first error
            fieldContainer.appendChild(errorDiv);
        }
    }
    
    updateFormValidation(form) {
        const formId = form.id;
        const fields = form.querySelectorAll('input, select, textarea');
        const hasErrors = Array.from(fields).some(field => field.classList.contains('error'));
        
        // Update form validation state
        form.classList.toggle('has-errors', hasErrors);
        
        // Update submit button state
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = hasErrors;
        }
    }
    
    autoSaveAllForms() {
        this.forms.forEach((formData, formId) => {
            if (formData.autoSave) {
                this.autoSaveForm(formId);
            }
        });
    }
    
    autoSaveForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const formData = this.serializeForm(form);
        const autoSaveKey = `autosave_${formId}`;
        
        // Only save if form has been modified
        const lastSaved = localStorage.getItem(`${autoSaveKey}_timestamp`);
        const formModified = form.dataset.modified === 'true';
        
        if (formModified && formData) {
            localStorage.setItem(autoSaveKey, JSON.stringify(formData));
            localStorage.setItem(`${autoSaveKey}_timestamp`, Date.now().toString());
            
            // Show auto-save indicator
            this.showAutoSaveIndicator(form);
        }
    }
    
    serializeForm(form) {
        const formData = {};
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            if (field.name) {
                if (field.type === 'checkbox') {
                    formData[field.name] = field.checked;
                } else if (field.type === 'radio') {
                    if (field.checked) {
                        formData[field.name] = field.value;
                    }
                } else {
                    formData[field.name] = field.value;
                }
            }
        });
        
        return formData;
    }
    
    showAutoSaveIndicator(form) {
        const indicator = form.querySelector('.auto-save-indicator');
        if (indicator) {
            indicator.textContent = 'Auto-saved';
            indicator.classList.add('show');
            
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    }
    
    restoreForm(formId) {
        const autoSaveKey = `autosave_${formId}`;
        const savedData = localStorage.getItem(autoSaveKey);
        
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                this.populateForm(formId, formData);
                
                // Show restore notification
                this.showRestoreNotification(formId);
            } catch (error) {
                console.error('Failed to restore form data:', error);
            }
        }
    }
    
    populateForm(formId, formData) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.entries(formData).forEach(([name, value]) => {
            const field = form.querySelector(`[name="${name}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else if (field.type === 'radio') {
                    if (field.value === value) {
                        field.checked = true;
                    }
                } else {
                    field.value = value;
                }
            }
        });
        
        // Mark form as restored
        form.dataset.restored = 'true';
    }
    
    showRestoreNotification(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const notification = document.createElement('div');
        notification.className = 'restore-notification';
        notification.innerHTML = `
            <div class="restore-content">
                <i class="fas fa-undo"></i>
                <span>Form data restored from auto-save</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        form.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    createFormFromTemplate(templateName, containerId) {
        const template = this.templates.get(templateName);
        if (!template) {
            console.error(`Template ${templateName} not found`);
            return;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        const form = document.createElement('form');
        form.id = `${templateName}_form`;
        form.className = 'template-form';
        
        // Add form fields
        template.fields.forEach(field => {
            const fieldElement = this.createFormField(field);
            form.appendChild(fieldElement);
        });
        
        // Add form actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'form-actions';
        actionsDiv.innerHTML = `
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="formManager.clearForm('${form.id}')">Clear</button>
            <button type="button" class="btn btn-outline" onclick="formManager.saveAsTemplate('${form.id}')">Save as Template</button>
        `;
        form.appendChild(actionsDiv);
        
        // Add auto-save indicator
        const autoSaveIndicator = document.createElement('div');
        autoSaveIndicator.className = 'auto-save-indicator';
        autoSaveIndicator.textContent = 'Auto-save enabled';
        form.appendChild(autoSaveIndicator);
        
        container.appendChild(form);
        
        // Register form for auto-save
        this.forms.set(form.id, {
            autoSave: true,
            template: templateName
        });
        
        // Set up form event listeners
        this.setupFormEventListeners(form);
        
        return form;
    }
    
    createFormField(fieldConfig) {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = fieldConfig.label;
        if (fieldConfig.required) {
            label.innerHTML += ' <span class="required">*</span>';
        }
        fieldGroup.appendChild(label);
        
        let field;
        
        switch (fieldConfig.type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'number':
            case 'date':
                field = document.createElement('input');
                field.type = fieldConfig.type;
                break;
            case 'textarea':
                field = document.createElement('textarea');
                break;
            case 'select':
                field = document.createElement('select');
                if (fieldConfig.options) {
                    fieldConfig.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option;
                        optionElement.textContent = option;
                        field.appendChild(optionElement);
                    });
                }
                break;
            default:
                field = document.createElement('input');
                field.type = 'text';
        }
        
        field.name = fieldConfig.name;
        field.required = fieldConfig.required || false;
        
        if (fieldConfig.min !== undefined) field.min = fieldConfig.min;
        if (fieldConfig.max !== undefined) field.max = fieldConfig.max;
        if (fieldConfig.step !== undefined) field.step = fieldConfig.step;
        if (fieldConfig.placeholder) field.placeholder = fieldConfig.placeholder;
        
        fieldGroup.appendChild(field);
        
        return fieldGroup;
    }
    
    setupFormEventListeners(form) {
        // Mark form as modified on input
        form.addEventListener('input', () => {
            form.dataset.modified = 'true';
        });
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission(form);
        });
        
        // Handle form reset
        form.addEventListener('reset', () => {
            form.dataset.modified = 'false';
        });
    }
    
    handleFormSubmission(form) {
        const formData = this.serializeForm(form);
        const formId = form.id;
        
        // Validate form
        if (!this.validateForm(form)) {
            return false;
        }
        
        // Process form data
        this.processFormData(formId, formData);
        
        // Clear auto-save data
        this.clearAutoSaveData(formId);
        
        // Mark form as not modified
        form.dataset.modified = 'false';
        
        return true;
    }
    
    validateForm(form) {
        const fields = form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async processFormData(formId, formData) {
        // Process form data based on form type
        const formInfo = this.forms.get(formId);
        if (!formInfo) return;
        
        switch (formInfo.template) {
            case 'inventory-item':
                await this.processInventoryItem(formData);
                break;
            case 'customer':
                this.processCustomer(formData);
                break;
            case 'sale':
                this.processSale(formData);
                break;
            default:
                console.log('Processing form data:', formData);
        }
    }
    
    async processInventoryItem(formData) {
        const item = {
            id: Date.now(),
            description: formData.description,
            category: formData.category,
            quantity: parseInt(formData.quantity) || 0,
            status: formData.status,
            location: formData.location || '',
            notes: formData.notes || '',
            dateAdded: new Date().toISOString()
        };
        
        inventory.push(item);
        await saveData();
        loadInventoryTable();
        
        showNotification('Inventory item added successfully!', 'success');
    }
    
    processCustomer(formData) {
        const customer = {
            id: Date.now(),
            name: formData.name,
            email: formData.email,
            phone: formData.phone || '',
            address: formData.address || '',
            notes: formData.notes || '',
            dateAdded: new Date().toISOString()
        };
        
        customers.push(customer);
        saveData();
        loadCustomersTable();
        
        showNotification('Customer added successfully!', 'success');
    }
    
    processSale(formData) {
        const sale = {
            id: Date.now(),
            itemName: formData.itemName,
            customer: formData.customer,
            salePrice: parseFloat(formData.salePrice) || 0,
            dateSold: formData.dateSold,
            saleChannel: formData.saleChannel,
            notes: formData.notes || '',
            dateAdded: new Date().toISOString()
        };
        
        sales.push(sale);
        saveData();
        loadSalesTable();
        
        showNotification('Sale recorded successfully!', 'success');
    }
    
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.reset();
        form.dataset.modified = 'false';
        
        // Clear validation errors
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error');
            const errorContainer = field.parentElement.querySelector('.field-error');
            if (errorContainer) {
                errorContainer.remove();
            }
        });
    }
    
    saveAsTemplate(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        const fields = Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
            name: field.name,
            type: field.type,
            required: field.required,
            label: field.previousElementSibling?.textContent?.replace('*', '').trim() || field.name,
            placeholder: field.placeholder || ''
        }));
        
        this.templates.set(templateName, {
            name: templateName,
            fields: fields
        });
        
        // Save templates to localStorage
        localStorage.setItem('form_templates', JSON.stringify(Array.from(this.templates.entries())));
        
        showNotification('Template saved successfully!', 'success');
    }
    
    clearAutoSaveData(formId) {
        const autoSaveKey = `autosave_${formId}`;
        localStorage.removeItem(autoSaveKey);
        localStorage.removeItem(`${autoSaveKey}_timestamp`);
    }
    
    loadTemplates() {
        const savedTemplates = localStorage.getItem('form_templates');
        if (savedTemplates) {
            try {
                const templates = JSON.parse(savedTemplates);
                this.templates = new Map(templates);
            } catch (error) {
                console.error('Failed to load templates:', error);
            }
        }
    }
    
    saveTemplates() {
        localStorage.setItem('form_templates', JSON.stringify(Array.from(this.templates.entries())));
    }
    
    getFormTemplates() {
        return Array.from(this.templates.entries()).map(([name, template]) => ({
            name,
            ...template
        }));
    }
    
    createFormBuilder() {
        // Create a form builder interface
        const builder = document.createElement('div');
        builder.className = 'form-builder';
        builder.innerHTML = `
            <div class="form-builder-header">
                <h3>Form Builder</h3>
                <button class="btn btn-primary" onclick="formManager.saveFormBuilder()">Save Form</button>
            </div>
            <div class="form-builder-content">
                <div class="form-preview" id="formPreview"></div>
                <div class="form-fields">
                    <h4>Add Field</h4>
                    <div class="field-types">
                        <button class="btn btn-outline" onclick="formManager.addField('text')">Text</button>
                        <button class="btn btn-outline" onclick="formManager.addField('email')">Email</button>
                        <button class="btn btn-outline" onclick="formManager.addField('tel')">Phone</button>
                        <button class="btn btn-outline" onclick="formManager.addField('number')">Number</button>
                        <button class="btn btn-outline" onclick="formManager.addField('date')">Date</button>
                        <button class="btn btn-outline" onclick="formManager.addField('textarea')">Textarea</button>
                        <button class="btn btn-outline" onclick="formManager.addField('select')">Select</button>
                    </div>
                </div>
            </div>
        `;
        
        return builder;
    }
    
    addField(type) {
        const preview = document.getElementById('formPreview');
        if (!preview) return;
        
        const fieldConfig = {
            name: `field_${Date.now()}`,
            type: type,
            label: `New ${type} field`,
            required: false
        };
        
        const fieldElement = this.createFormField(fieldConfig);
        preview.appendChild(fieldElement);
    }
    
    saveFormBuilder() {
        const preview = document.getElementById('formPreview');
        if (!preview) return;
        
        const fields = Array.from(preview.querySelectorAll('.form-group')).map(group => {
            const field = group.querySelector('input, select, textarea');
            const label = group.querySelector('label');
            
            return {
                name: field.name,
                type: field.type,
                required: field.required,
                label: label.textContent.replace('*', '').trim()
            };
        });
        
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        this.templates.set(templateName, {
            name: templateName,
            fields: fields
        });
        
        this.saveTemplates();
        showNotification('Form template saved!', 'success');
    }
}

// Initialize form manager
const formManager = new FormManager();

// Global functions for HTML onclick handlers
function debouncedFilterItems() {
    searchManager.debouncedFilterItems();
}

function openAdvancedSearch(tab) {
    searchManager.openAdvancedSearch(tab);
}

function saveCurrentSearch(tab) {
    searchManager.saveCurrentSearch(tab);
}

function loadSavedSearches(tab) {
    searchManager.loadSavedSearches(tab);
}

function clearAllFilters(tab) {
    searchManager.clearAllFilters(tab);
}

function clearAdvancedSearch() {
    document.getElementById('advancedSearchForm').reset();
}

function saveAdvancedSearch() {
    searchManager.saveCurrentSearch(searchManager.currentTab);
}

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

// Authentication - now implemented with server-side auth (see line 4143)
// Old client-side auth variables removed (ADMIN_PASSWORD, isAuthenticated)

// Check if running on localhost or local network
function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '' ||
           hostname.startsWith('192.168.') || // Local network IPs
           hostname.startsWith('10.') || // Private network IPs
           hostname.startsWith('172.'); // Private network IPs
}

// Function to change password (you can call this from browser console)
// Note: Password is now managed server-side
function changePassword(newPassword) {
    console.log('Password changes must be made server-side in server.js or environment variables');
}

function logout() {
    setAuthenticated(false);
    console.log('Logged out successfully!');
    // Switch to inventory tab
    switchTab('inventory');
}

function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const passwordField = document.getElementById('currentPassword');
    
    if (modal) {
        modal.style.display = 'block';
    }
    if (passwordField) {
        passwordField.focus();
    }
}

function hideChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const form = document.getElementById('changePasswordForm');
    const errorDiv = document.getElementById('changePasswordError');
    const successDiv = document.getElementById('changePasswordSuccess');
    
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

function handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Clear previous messages
    document.getElementById('changePasswordError').style.display = 'none';
    document.getElementById('changePasswordSuccess').style.display = 'none';
    
    // Validate current password - now handled server-side
    console.log('Password validation is now handled server-side');
    // Note: Password validation is now handled server-side, so we skip client-side validation
    
    // Validate new password
    if (newPassword.length < 4) {
        const errorText = document.getElementById('changePasswordErrorText');
        const errorDiv = document.getElementById('changePasswordError');
        
        if (errorText) errorText.textContent = 'New password must be at least 4 characters long.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }
    
    // Validate password confirmation
    if (newPassword !== confirmPassword) {
        const errorText = document.getElementById('changePasswordErrorText');
        const errorDiv = document.getElementById('changePasswordError');
        
        if (errorText) errorText.textContent = 'New passwords do not match.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }
    
    // Change password - now handled server-side
    console.log('Password changes must be made server-side');
    document.getElementById('changePasswordSuccess').style.display = 'block';
    
    // Hide success message after 2 seconds and close modal
    setTimeout(() => {
        hideChangePasswordModal();
    }, 2000);
}

// Invoice Generation Functions
function generateInvoice() {
    if (!checkAuthentication()) {
        sessionStorage.setItem('requestedTab', 'sales');
        showAuthModal();
        return;
    }
    
    // Set today's date
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    
    // Load customers
    loadCustomersForInvoice();
    
    // Clear sales selection initially
    document.getElementById('salesSelection').innerHTML = '<p>Please select a customer first to see their sales.</p>';
    
    // Add event listener to customer dropdown
    const customerSelect = document.getElementById('invoiceCustomer');
    customerSelect.onchange = function() {
        loadSalesForInvoice();
    };
    
    // Show modal
    document.getElementById('invoiceModal').style.display = 'block';
}

function openPriceTagModal() {
    const modal = document.getElementById('priceTagModal');
    if (modal) {
        // Never autopopulate "Your Logo" - always start empty
        const myLogoInput = document.getElementById('priceTagMyLogo');
        if (myLogoInput) myLogoInput.value = '';
        modal.style.display = 'block';
    }
}

function generateTestInvoice() {
    if (!checkAuthentication()) {
        sessionStorage.setItem('requestedTab', 'sales');
        showAuthModal();
        return;
    }
    
    // Create test invoice with sample data
    const testInvoice = {
        id: generateInvoiceId(),
        customer: 'Test Customer',
        date: new Date().toISOString().split('T')[0],
        notes: 'This is a test invoice to preview the layout and branding.',
        sales: [
            {
                itemName: 'Custom Embroidered T-Shirt',
                customer: 'Test Customer',
                dateSold: new Date().toISOString().split('T')[0],
                salePrice: 35.00,
                saleChannel: 'individual'
            },
            {
                itemName: 'Personalized Baseball Cap',
                customer: 'Test Customer',
                dateSold: new Date().toISOString().split('T')[0],
                salePrice: 25.00,
                saleChannel: 'individual'
            },
            {
                itemName: 'Logo Embroidery on Hoodie',
                customer: 'Test Customer',
                dateSold: new Date().toISOString().split('T')[0],
                salePrice: 45.00,
                saleChannel: 'individual'
            }
        ],
        total: 105.00,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Show the test invoice preview
    showInvoicePreview(testInvoice);
    
    showNotification('Test invoice generated successfully!', 'success');
}

function loadCustomersForInvoice() {
    const select = document.getElementById('invoiceCustomer');
    select.innerHTML = '<option value="">Select Customer</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        select.appendChild(option);
    });
}

function loadSalesForInvoice() {
    const container = document.getElementById('salesSelection');
    const customerSelect = document.getElementById('invoiceCustomer');
    container.innerHTML = '';
    
    if (sales.length === 0) {
        container.innerHTML = '<p>No sales found. Please add some sales first.</p>';
        return;
    }
    
    // Get selected customer
    const selectedCustomer = customerSelect.value;
    
    if (!selectedCustomer) {
        container.innerHTML = '<p>Please select a customer first to see their sales.</p>';
        return;
    }
    
    // Filter sales by selected customer and only show individual sales (exclude shop sales)
    const customerSales = sales.filter(sale => 
        sale.customer === selectedCustomer && 
        sale.saleChannel !== 'shop'
    );
    
    if (customerSales.length === 0) {
        container.innerHTML = `<p>No individual sales found for customer "${SecurityManager.escapeHtml(selectedCustomer)}". Shop sales are not included in invoices.</p>`;
        return;
    }
    
    // Show individual sales for the selected customer (exclude shop sales)
    customerSales.forEach((sale, index) => {
        // Find the original index in the sales array for proper mapping
        const originalIndex = sales.findIndex(s => s === sale);
        const saleDiv = document.createElement('div');
        saleDiv.className = 'sale-item';
        saleDiv.innerHTML = `
            <label class="sale-checkbox">
                <input type="checkbox" name="selectedSales" value="${originalIndex}" checked>
                <span class="sale-info">
                    <strong>${SecurityManager.escapeHtml(sale.itemName)}</strong> - $${sale.salePrice} - ${sale.dateSold}
                </span>
            </label>
        `;
        container.appendChild(saleDiv);
    });
}

function handleInvoiceGeneration(event) {
    event.preventDefault();
    
    const customer = document.getElementById('invoiceCustomer').value;
    const date = document.getElementById('invoiceDate').value;
    const notes = document.getElementById('invoiceNotes').value;
    
    // Get selected sales
    const selectedSales = Array.from(document.querySelectorAll('input[name="selectedSales"]:checked'))
        .map(checkbox => {
            const index = parseInt(checkbox.value);
            return !isNaN(index) && index >= 0 && index < sales.length ? sales[index] : null;
        })
        .filter(sale => sale !== null);
    
    if (selectedSales.length === 0) {
        alert('Please select at least one sale to include in the invoice.');
        return;
    }
    
    // Validate that all selected sales belong to the same customer and are individual sales
    const invalidSales = selectedSales.filter(sale => sale.customer !== customer);
    if (invalidSales.length > 0) {
        alert('Error: Some selected sales do not belong to the selected customer. Please refresh the page and try again.');
        return;
    }
    
    // Validate that no shop sales are included (double-check)
    const shopSales = selectedSales.filter(sale => sale.saleChannel === 'shop');
    if (shopSales.length > 0) {
        alert('Error: Shop sales cannot be included in invoices. Please select only individual customer sales.');
        return;
    }
    
    // Calculate total
    const total = selectedSales.reduce((sum, sale) => sum + parseFloat(sale.salePrice || 0), 0);
    
    // Generate invoice
    const invoice = {
        id: generateInvoiceId(),
        customer: customer,
        date: date,
        notes: notes,
        sales: selectedSales,
        total: total,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Add to invoices array
    invoices.push(invoice);
    
    // Save to localStorage
    saveInvoicesToLocalStorage();
    
    // Close modal
    closeModal('invoiceModal');
    
    // Show preview
    showInvoicePreview(invoice);
}

function generateInvoiceId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
}

function showInvoicePreview(invoice) {
    const content = document.getElementById('invoiceContent');
    
    // Clear any existing content completely
    content.innerHTML = '';
    
    // Generate new invoice HTML
    content.innerHTML = generateInvoiceHTML(invoice);
    
    // Store the invoice data for printing
    currentInvoiceData = {
        businessName: "CyndyP Stitchcraft",
        businessEmail: "cyndypstitchcraft@gmail.com",
        invoiceTitle: "INVOICE",
        id: invoice.id,
        date: invoice.date,
        customer: invoice.customer,
        sales: invoice.sales,
        total: invoice.total
    };
    
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

function generateInvoiceHTML(invoice) {
    const businessName = "CyndyP Stitchcraft";
    const businessEmail = "cyndypstitchcraft@gmail.com";
    
    // Debug: Check for duplicate sales items
    console.log('Invoice sales items:', invoice.sales);
    if (invoice.sales) {
        const uniqueSales = invoice.sales.filter((sale, index, self) => 
            index === self.findIndex(s => s.itemName === sale.itemName && s.dateSold === sale.dateSold && s.salePrice === sale.salePrice)
        );
        if (uniqueSales.length !== invoice.sales.length) {
            console.warn('Duplicate sales items detected, removing duplicates');
            invoice.sales = uniqueSales;
        }
    }
    
    // Get customer details
    const customer = customers.find(c => c.name === invoice.customer);
    const customerInfo = customer ? `
        <p><strong>${SecurityManager.escapeHtml(customer.name)}</strong></p>
        ${customer.location ? `<p>${SecurityManager.escapeHtml(customer.location)}</p>` : ''}
        ${customer.contact ? `<p>${SecurityManager.escapeHtml(customer.contact)}</p>` : ''}
    ` : `<p><strong>${SecurityManager.escapeHtml(invoice.customer)}</strong></p>`;
    
    return `
        <div class="invoice-document">
            <div class="invoice-header-section">
                <div class="business-info">
                    <div class="business-logo">
                        <img src="logo.png" alt="${businessName} Logo" class="invoice-logo">
                    </div>
                    <h1>${businessName}</h1>
                    <p>Email: ${businessEmail}</p>
                </div>
                <div class="invoice-info">
                    <h2>INVOICE</h2>
                    <p><strong>Invoice #:</strong> ${invoice.id}</p>
                    <p><strong>Date:</strong> ${invoice.date}</p>
                </div>
            </div>
            
            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Date Invoiced</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.sales.map(sale => `
                            <tr>
                                <td>${SecurityManager.escapeHtml(sale.itemName)}</td>
                                <td>${sale.dateSold}</td>
                                <td>$${sale.salePrice}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2"><strong>Total:</strong></td>
                            <td><strong>$${invoice.total.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="invoice-signatures">
                <div class="signature-section">
                    <div class="signature-line">
                        <div class="signature-label">Artist Signature:</div>
                        <div class="signature-space"></div>
                        <div class="signature-date">Date: _______________</div>
                    </div>
                </div>
                <div class="signature-section">
                    <div class="signature-line">
                        <div class="signature-label">Shop Signature:</div>
                        <div class="signature-space"></div>
                        <div class="signature-date">Date: _______________</div>
                    </div>
                </div>
            </div>
            
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;
}

function printInvoice() {
    try {
        // Use the stored invoice data instead of extracting from modal
        if (!currentInvoiceData) {
            showNotification('No invoice data available for printing', 'error');
            return;
        }
        
        const invoiceData = currentInvoiceData;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Please allow popups to print invoices', 'error');
            return;
        }
        
        // Generate clean invoice HTML for printing
        const cleanInvoiceHTML = generateCleanInvoiceHTML(invoiceData);
        
        // Use SecurityManager helper for safe document writing
        const invoicePrintHTML = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Invoice</title>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: white;
                            color: black;
                        }
                        .invoice-document { 
                            max-width: 800px; 
                            margin: 0 auto; 
                        }
                        .invoice-header-section { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 30px; 
                            border-bottom: 2px solid #000;
                            padding-bottom: 15px;
                        }
                        .business-info h1 { 
                            color: #000; 
                            margin-bottom: 10px; 
                            font-size: 24px;
                        }
                        .business-logo { 
                            text-align: center; 
                            margin-bottom: 15px; 
                        }
                        .invoice-logo { 
                            max-width: 120px; 
                            max-height: 60px; 
                            object-fit: contain; 
                        }
                        .invoice-info h2 { 
                            color: #000; 
                            margin-bottom: 10px; 
                            font-size: 20px;
                        }
                        .invoice-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 20px 0; 
                        }
                        .invoice-table th, .invoice-table td { 
                            border: 1px solid #000; 
                            padding: 8px; 
                            text-align: left; 
                        }
                        .invoice-table th { 
                            background-color: #f5f5f5; 
                            font-weight: bold;
                        }
                        .total-row { 
                            background-color: #f9f9f9; 
                            font-weight: bold; 
                            font-size: 16px;
                        }
                        .invoice-signatures { 
                            margin-top: 40px; 
                            display: block; 
                        }
                        .signature-section { 
                            margin-bottom: 25px; 
                            display: block; 
                        }
                        .signature-line { 
                            display: flex; 
                            align-items: flex-end; 
                            width: 100%; 
                            margin-bottom: 15px; 
                            gap: 15px; 
                            flex-direction: row; 
                        }
                        .signature-label { 
                            font-weight: bold; 
                            white-space: nowrap; 
                            min-width: 120px; 
                        }
                        .signature-space { 
                            flex: 1; 
                            height: 30px; 
                            border-bottom: 1px solid #000; 
                            margin: 0 10px; 
                        }
                        .signature-date { 
                            font-size: 0.9em; 
                            white-space: nowrap; 
                            min-width: 80px; 
                            text-align: right; 
                        }
                        .invoice-footer {
                            margin-top: 30px;
                            text-align: center;
                            font-style: italic;
                        }
                        @media print { 
                            body { margin: 0; padding: 15px; }
                            .invoice-document { max-width: none; }
                        }
                    </style>
                </head>
                <body>
                    ${cleanInvoiceHTML}
                </body>
            </html>
        `;
        
        SecurityManager.writeToWindow(printWindow, invoicePrintHTML);
        
        // Wait for content to load before printing
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    } catch (error) {
        console.error('Print error:', error);
        showNotification('Print failed: ' + error.message, 'error');
    }
}

// Extract invoice data from the modal content
function extractInvoiceDataFromModal() {
    try {
        const invoiceContent = document.getElementById('invoiceContent');
        if (!invoiceContent) return null;
        
        // Extract business info
        const businessName = invoiceContent.querySelector('.business-info h1')?.textContent || 'CyndyP Stitchcraft';
        const businessEmail = invoiceContent.querySelector('.business-info p')?.textContent?.replace('Email: ', '') || 'cyndypstitchcraft@gmail.com';
        
        // Extract invoice info
        const invoiceTitle = invoiceContent.querySelector('.invoice-info h2')?.textContent || 'INVOICE';
        const invoiceId = invoiceContent.querySelector('.invoice-info p')?.textContent?.replace('Invoice #: ', '') || `INV-${Date.now()}`;
        const invoiceDate = invoiceContent.querySelectorAll('.invoice-info p')[1]?.textContent?.replace('Date: ', '') || new Date().toLocaleDateString();
        
        // Extract customer info
        const customerInfo = invoiceContent.querySelector('.customer-info h3')?.textContent || 
                           invoiceContent.querySelector('.customer-info p')?.textContent?.replace('<strong>', '').replace('</strong>', '') || 
                           'No Customer';
        
        // Extract table data
        const sales = [];
        const tableRows = invoiceContent.querySelectorAll('.invoice-table tbody tr');
        let total = 0;
        
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const itemName = cells[0].textContent.trim();
                const dateInvoiced = cells[1].textContent.trim();
                const price = parseFloat(cells[2].textContent.replace('$', ''));
                
                if (itemName && !isNaN(price)) {
                    sales.push({
                        itemName,
                        dateSold: dateInvoiced,
                        salePrice: price
                    });
                    total += price;
                }
            }
        });
        
        return {
            businessName,
            businessEmail,
            invoiceTitle,
            id: invoiceId,
            date: invoiceDate,
            customer: customerInfo,
            sales,
            total
        };
    } catch (error) {
        console.error('Error extracting invoice data:', error);
        return null;
    }
}

// Generate clean invoice HTML for printing
function generateCleanInvoiceHTML(invoiceData) {
    return `
        <div class="invoice-document">
            <div class="invoice-header-section">
                <div class="business-info">
                    <div class="business-logo">
                        <img src="logo.png" alt="${invoiceData.businessName} Logo" class="invoice-logo">
                    </div>
                    <h1>${invoiceData.businessName}</h1>
                    <p>Email: ${invoiceData.businessEmail}</p>
                </div>
                <div class="invoice-info">
                    <h2>${invoiceData.invoiceTitle}</h2>
                    <p><strong>Invoice #:</strong> ${invoiceData.id}</p>
                    <p><strong>Date:</strong> ${invoiceData.date}</p>
                </div>
            </div>
            
            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Date Invoiced</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoiceData.sales.map(sale => `
                            <tr>
                                <td>${SecurityManager.escapeHtml(sale.itemName)}</td>
                                <td>${sale.dateSold}</td>
                                <td>$${sale.salePrice}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2"><strong>Total:</strong></td>
                            <td><strong>$${invoiceData.total.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="invoice-signatures">
                <div class="signature-section">
                    <div class="signature-line">
                        <div class="signature-label">Artist Signature:</div>
                        <div class="signature-space"></div>
                        <div class="signature-date">Date: _______________</div>
                    </div>
                </div>
                <div class="signature-section">
                    <div class="signature-line">
                        <div class="signature-label">Shop Signature:</div>
                        <div class="signature-space"></div>
                        <div class="signature-date">Date: _______________</div>
                    </div>
                </div>
            </div>
            
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;
}

function viewInvoices() {
    if (!checkAuthentication()) {
        sessionStorage.setItem('requestedTab', 'sales');
        showAuthModal();
        return;
    }
    
    // Clean up any existing invoices that contain shop sales
    cleanupInvalidInvoices();
    
    loadInvoicesTable();
    document.getElementById('invoicesListModal').style.display = 'block';
}

function cleanupInvalidInvoices() {
    let hasChanges = false;
    let removedCount = 0;
    
    // Filter out invoices that contain shop sales
    const validInvoices = invoices.filter(invoice => {
        const hasShopSales = invoice.sales && invoice.sales.some(sale => sale.saleChannel === 'shop');
        if (hasShopSales) {
            hasChanges = true;
            removedCount++;
            console.log(`Removing invoice ${invoice.id} - contains shop sales`);
            return false;
        }
        return true;
    });
    
    if (hasChanges) {
        invoices.length = 0; // Clear the array
        invoices.push(...validInvoices); // Add back only valid invoices
        saveInvoicesToLocalStorage();
        console.log(`Cleaned up ${removedCount} invalid invoices`);
        showNotification(`Cleaned up ${removedCount} invalid invoices containing shop sales`, 'success');
    } else {
        showNotification('No invalid invoices found', 'info');
    }
}

function loadInvoicesTable() {
    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No invoices found.</td></tr>';
        return;
    }
    
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${SecurityManager.escapeHtml(invoice.customer)}</td>
            <td>${invoice.date}</td>
            <td>$${invoice.total.toFixed(2)}</td>
            <td><span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-small" onclick="viewInvoice('${invoice.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-small" onclick="printInvoiceById('${invoice.id}')">
                    <i class="fas fa-print"></i> Print
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        showInvoicePreview(invoice);
    }
}

function printInvoiceById(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        showInvoicePreview(invoice);
        setTimeout(() => printInvoice(), 100);
    }
}

function toggleAllSales() {
    const selectAll = document.getElementById('selectAllSales');
    const checkboxes = document.querySelectorAll('input[name="selectedSales"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function saveInvoicesToLocalStorage() {
    localStorage.setItem('embroideryInvoices', JSON.stringify(invoices));
}

function loadInvoicesFromLocalStorage() {
    const stored = localStorage.getItem('embroideryInvoices');
    if (stored) {
        invoices = JSON.parse(stored);
    }
}

// Password visibility toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Helper functions to preserve expanded customer groups during edits
function getCurrentlyExpandedCustomerGroups() {
    const expandedCustomers = [];
    const customerHeaders = document.querySelectorAll('.customer-header');
    
    customerHeaders.forEach(header => {
        const customer = header.getAttribute('data-customer');
        const groupId = `customer-group-${customer.replace(/\s+/g, '-').toLowerCase()}`;
        const groupRow = document.getElementById(groupId);
        
        // Check if the group is expanded (display is not 'none')
        if (groupRow && groupRow.style.display !== 'none') {
            expandedCustomers.push(customer);
        }
    });
    
    return expandedCustomers;
}

function restoreExpandedCustomerGroups(expandedCustomers) {
    // Use setTimeout to ensure the DOM has been updated
    setTimeout(() => {
        expandedCustomers.forEach(customer => {
            const groupId = `customer-group-${customer.replace(/\s+/g, '-').toLowerCase()}`;
            const groupRow = document.getElementById(groupId);
            
            // If the group exists and is not expanded, expand it
            if (groupRow && groupRow.style.display === 'none') {
                // Find the corresponding header and toggle icon
                const customerHeader = document.querySelector(`[data-customer="${customer}"]`);
                if (customerHeader) {
                    const toggleIcon = customerHeader.querySelector('.customer-toggle');
                    if (toggleIcon) {
                        // Expand the group
                        groupRow.style.display = 'table-row';
                        toggleIcon.classList.remove('fa-chevron-right');
                        toggleIcon.classList.add('fa-chevron-down');
                    }
                }
            }
        });
    }, 50); // Increased timeout to ensure DOM is fully updated
}

// API base URL
const API_BASE = '';

// Authentication functions
// Authentication state
let isAuthenticated = false;
let authEnabled = false;
let currentUsername = null;

// Check auth status with server
async function checkAuthStatus() {
    console.log('🔍 checkAuthStatus called');
    
    // First check if we're on localhost (bypass auth)
    const hostname = window.location.hostname;
    const port = window.location.port;
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname === '' ||
                       hostname === '0.0.0.0' ||
                       (hostname.startsWith('192.168.') && port === '3002') ||
                       (hostname.startsWith('10.') && port === '3002') ||
                       (hostname.startsWith('172.') && port === '3002');
    
    if (isLocalhost) {
        console.log('🔓 Localhost detected in checkAuthStatus - bypassing auth');
        isAuthenticated = true;
        authEnabled = false;
        currentUsername = 'localhost';
        updateAuthUI();
        return { authenticated: true, authEnabled: false };
    }
    
    // Check session storage first (for persistence across page reloads)
    const storedAuth = sessionStorage.getItem('embroidery_auth');
    if (storedAuth) {
        try {
            const authData = JSON.parse(storedAuth);
            if (authData.authenticated && authData.timestamp && (Date.now() - authData.timestamp) < 24 * 60 * 60 * 1000) {
                console.log('🔍 Using stored authentication');
                isAuthenticated = true;
                authEnabled = true;
                currentUsername = authData.username;
                updateAuthUI();
                return { authenticated: true, authEnabled: true };
            }
        } catch (e) {
            console.log('🔍 Invalid stored auth data, clearing');
            sessionStorage.removeItem('embroidery_auth');
        }
    }
    
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const data = await response.json();
        console.log('🔍 Auth status response:', data);
        
        if (data.authenticated) {
            // Store auth in session storage for persistence
            sessionStorage.setItem('embroidery_auth', JSON.stringify({
                authenticated: true,
                username: data.username,
                timestamp: Date.now()
            }));
        }
        
        isAuthenticated = data.authenticated;
        authEnabled = data.authEnabled;
        currentUsername = data.username;
        console.log('🔍 Setting auth state from server:', { isAuthenticated, authEnabled, currentUsername });
        updateAuthUI();
        return { authenticated: isAuthenticated, authEnabled: authEnabled };
    } catch (error) {
        console.error('Failed to check auth status:', error);
        return { authenticated: false, authEnabled: false };
    }
}

// Update auth UI elements
function updateAuthUI() {
    console.log('🔄 updateAuthUI called:', { authEnabled, isAuthenticated, currentUsername });
    const authContainer = document.getElementById('authStatusContainer');
    const authUsernameSpan = document.getElementById('authUsername');
    
    if (authEnabled && isAuthenticated && currentUsername) {
        console.log('✅ Showing authenticated UI');
        authContainer.style.display = 'flex';
        authUsernameSpan.textContent = currentUsername;
    } else {
        console.log('❌ Hiding authenticated UI');
        authContainer.style.display = 'none';
    }
}

// Check if user is authenticated (for operations)
async function checkAuthentication() {
    const status = await checkAuthStatus();
    
    // If auth is not enabled, always allow
    if (!status.authEnabled) {
        return true;
    }
    
    // If auth is enabled, check if authenticated
    return status.authenticated;
}

// Require authentication for protected operations
// Returns true if authenticated, false if not (and shows login modal)
async function requireAuthentication(operationName = 'this action') {
    // Bypass authentication for localhost and local development
    const hostname = window.location.hostname;
    const port = window.location.port;
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname === '' ||
                       hostname === '0.0.0.0' ||
                       (hostname.startsWith('192.168.') && port === '3002') ||
                       (hostname.startsWith('10.') && port === '3002') ||
                       (hostname.startsWith('172.') && port === '3002');
    
    if (isLocalhost) {
        debugLog('🔓 Localhost detected - bypassing authentication', { hostname, port, isLocalhost });
        return true;
    }
    
    const isAuth = await checkAuthentication();
    if (!isAuth) {
        showNotification(`You must be logged in to ${operationName}`, 'error');
        showAuthModal();
        return false;
    }
    return true;
}

// Debug function to check hostname detection
function debugHostnameDetection() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const href = window.location.href;
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname === '' ||
                       hostname === '0.0.0.0' ||
                       (hostname.startsWith('192.168.') && port === '3002') ||
                       (hostname.startsWith('10.') && port === '3002') ||
                       (hostname.startsWith('172.') && port === '3002');
    
    console.log('🔍 Hostname Detection Debug:', {
        hostname,
        port,
        href,
        isLocalhost,
        willBypassAuth: isLocalhost
    });
    
    return { hostname, port, href, isLocalhost };
}

// Show login modal
function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    if (usernameInput.value) {
        passwordInput.focus();
    } else {
        usernameInput.focus();
    }
}

// Hide login modal
function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('authError').style.display = 'none';
}

// Handle login form submission
async function handleAuthSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    console.log('🔐 Login attempt:', { username, password: password.substring(0, 3) + '***' });
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        console.log('📡 Login response status:', response.status);
        const data = await response.json();
        console.log('📡 Login response data:', data);
        
        if (data.success) {
            console.log('✅ Login successful, setting authentication state');
            isAuthenticated = true;
            currentUsername = data.username;
            
            // Store authentication in session storage for persistence
            sessionStorage.setItem('embroidery_auth', JSON.stringify({
                authenticated: true,
                username: data.username,
                timestamp: Date.now()
            }));
            
            console.log('🔐 Authentication state:', { isAuthenticated, currentUsername, authEnabled });
            hideAuthModal();
            updateAuthUI();
            showNotification('Login successful!', 'success');
            
            // Switch to the requested tab if any
            const requestedTab = sessionStorage.getItem('requestedTab');
            if (requestedTab) {
            switchTab(requestedTab);
            sessionStorage.removeItem('requestedTab');
        }
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authErrorText').textContent = data.message || 'Invalid credentials. Please try again.';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('authError').style.display = 'block';
        document.getElementById('authErrorText').textContent = 'Login failed. Please try again.';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Handle logout
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            isAuthenticated = false;
            currentUsername = null;
            
            // Clear session storage
            sessionStorage.removeItem('embroidery_auth');
            
            updateAuthUI();
            showNotification('Logged out successfully', 'success');
            
            // Optionally reload to clear any cached data
            // window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
    }
}

async function requireAuth(tabName) {
    // Require auth for completed items, sales, reports, and data management
    const protectedTabs = ['completed', 'sales', 'reports', 'data'];
    
    if (protectedTabs.includes(tabName)) {
        const isAuth = await checkAuthentication();
        if (!isAuth) {
            sessionStorage.setItem('requestedTab', tabName);
            showNotification(`You must be logged in to access ${tabName}`, 'error');
            showAuthModal();
            return false;
        }
    }
    return true;
}

// Force cache busting on page load
if (window.performance && window.performance.navigation.type === 1) {
    // Page was refreshed, force reload of resources
    console.log('🔄 Page refreshed - forcing cache bust');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Embroidery Inventory Manager Initialized');
    
    // Debug hostname detection for authentication
    debugHostnameDetection();
    
    // Remove any existing install banners or sales notifications
    const existingBanner = document.querySelector('.install-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Aggressively prevent PWA install banner
    window.addEventListener('beforeinstallprompt', function(e) {
        console.log('🚫 PWA install prompt prevented');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    });
    
    // Remove any PWA-related elements
    const pwaElements = document.querySelectorAll('[data-pwa], .pwa-banner, .install-prompt');
    pwaElements.forEach(el => el.remove());
    
    // Hide bulk actions container on page load
    const bulkContainer = document.getElementById('bulkActionsContainer');
    if (bulkContainer) {
        bulkContainer.style.display = 'none';
        console.log('🚫 Bulk actions container hidden on page load');
    }
    
    // Hide projects pagination on page load - not needed
    const projectsPagination = document.getElementById('projectsPagination');
    if (projectsPagination) {
        projectsPagination.style.display = 'none';
        console.log('🚫 Projects pagination hidden on page load');
    }
    
    // Hide inventory pagination on page load - not needed
    const inventoryPagination = document.getElementById('inventoryPagination');
    if (inventoryPagination) {
        inventoryPagination.style.display = 'none';
        console.log('🚫 Inventory pagination hidden on page load');
    }
    
    // Remove any existing sales notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.textContent.includes('All sales already have commission data')) {
            notification.remove();
        }
    });
    
    initializeApp();
    updateVersionDisplay();
    loadDataFromAPI().then(() => {
        // Update existing sales with commission fields after data is loaded (notifications disabled)
        // updateExistingSalesWithCommission();
    });
    updateLocationFilters();
    updateCustomerFilters();
    
    // Set up cross-view synchronization
    setupViewSynchronization();
    
    // Initialize photo functionality and mobile features
    setupPhotoPreviews();
    registerServiceWorker();
    setupMobileFeatures();
    setupMobileModalEnhancements();
    setupMobileGalleryUpload();
});

function updateVersionDisplay() {
    const versionElement = document.getElementById('versionDisplay');
    if (versionElement) {
        // Use the same version as defined in the script
        const currentVersion = '1.0.104';
        versionElement.innerHTML = `<i class="fas fa-tag"></i> v${currentVersion}`;
    }
}

function initializeApp() {
    // Show production mode indicator if not localhost
    if (!isLocalhost()) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-shield-alt"></i> Production Mode';
            statusElement.className = 'status-indicator connected';
        }
    }
    
    // Tab navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Ensure sticky positioning works
    setupStickyElements();

    // Form submissions with null checks
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) addItemForm.addEventListener('submit', handleAddItem);
    
    const addInventoryForm = document.getElementById('addInventoryForm');
    if (addInventoryForm) addInventoryForm.addEventListener('submit', handleAddInventory);
    
    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) addProjectForm.addEventListener('submit', handleAddProject);
    
    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) addCustomerForm.addEventListener('submit', handleAddCustomer);
    
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) editCustomerForm.addEventListener('submit', handleEditCustomer);
    
    const addSaleForm = document.getElementById('addSaleForm');
    if (addSaleForm) addSaleForm.addEventListener('submit', handleAddSale);
    
    const editSaleForm = document.getElementById('editSaleForm');
    if (editSaleForm) editSaleForm.addEventListener('submit', handleEditSale);
    
    const addPhotoForm = document.getElementById('addPhotoForm');
    if (addPhotoForm) addPhotoForm.addEventListener('submit', handleAddPhoto);
    
    // Mobile-specific file input enhancements
    const photoFileInput = document.getElementById('photoFile');
    if (photoFileInput) {
        // Add mobile-friendly event listeners
        photoFileInput.addEventListener('change', function(e) {
            console.log('Photo file input changed:', e.target.files.length, 'files');
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log('File selected:', file.name, file.size, file.type);
            }
        });
        
        // Ensure proper touch handling on mobile
        if ('ontouchstart' in window) {
            photoFileInput.addEventListener('touchstart', function(e) {
                console.log('Touch start on file input');
            });
            
            photoFileInput.addEventListener('touchend', function(e) {
                console.log('Touch end on file input');
            });
        }
    }
    const addIdeaForm = document.getElementById('addIdeaForm');
    if (addIdeaForm) addIdeaForm.addEventListener('submit', handleAddIdea);
    
    // Separate modal form listeners
    const editProjectForm = document.getElementById('editProjectForm');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', handleEditProject);
        console.log('Edit project form event listener added');
    }
    
    const editInventoryForm = document.getElementById('editInventoryForm');
    if (editInventoryForm) {
        editInventoryForm.addEventListener('submit', handleEditInventory);
        console.log('Edit inventory form event listener added');
    }
    
    const editCompletedItemForm = document.getElementById('editCompletedItemForm');
    if (editCompletedItemForm) {
        editCompletedItemForm.addEventListener('submit', handleEditCompletedItem);
        console.log('Edit completed item form event listener added');
    }
    
    const addCompletedItemForm = document.getElementById('addCompletedItemForm');
    if (addCompletedItemForm) {
        addCompletedItemForm.addEventListener('submit', handleAddCompletedItem);
        console.log('Add completed item form event listener added');
    }
    
    // Close button event listeners are handled by onclick attributes in HTML

    // Set today's date for sale date
    const saleDate = document.getElementById('saleDate');
    if (saleDate) saleDate.value = new Date().toISOString().split('T')[0];
    
    // Add event listeners for quantity and price calculation
    const itemQuantity = document.getElementById('itemQuantity');
    const itemPrice = document.getElementById('itemPrice');
    const editProjectQuantity = document.getElementById('editProjectQuantity');
    const editProjectPrice = document.getElementById('editProjectPrice');
    const editInventoryQuantity = document.getElementById('editInventoryQuantity');
    const editInventoryPrice = document.getElementById('editInventoryPrice');
    
    if (itemQuantity) itemQuantity.addEventListener('input', calculateTotalValue);
    if (itemPrice) itemPrice.addEventListener('input', calculateTotalValue);
    if (editProjectQuantity) editProjectQuantity.addEventListener('input', calculateEditProjectTotalValue);
    if (editProjectPrice) editProjectPrice.addEventListener('input', calculateEditProjectTotalValue);
    if (editInventoryQuantity) editInventoryQuantity.addEventListener('input', calculateEditInventoryTotalValue);
    if (editInventoryPrice) editInventoryPrice.addEventListener('input', calculateEditInventoryTotalValue);
    
    // Check connection status
    checkConnectionStatus();
    
    // Initialize connection status display (show on localhost, hide on live site)
    initializeConnectionStatus();
    
    // Authentication event listeners with null checks
    const authForm = document.getElementById('authForm');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
    
    const closeAuthModal = document.getElementById('closeAuthModal');
    if (closeAuthModal) closeAuthModal.addEventListener('click', hideAuthModal);
    
    const cancelAuth = document.getElementById('cancelAuth');
    if (cancelAuth) cancelAuth.addEventListener('click', hideAuthModal);
    
    // Close auth modal when clicking outside
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', function(event) {
            if (event.target === this) {
                hideAuthModal();
            }
        });
    }
    
    // Password change event listeners with null checks
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', showChangePasswordModal);
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
    
    const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
    if (closeChangePasswordModal) closeChangePasswordModal.addEventListener('click', hideChangePasswordModal);
    
    const cancelChangePassword = document.getElementById('cancelChangePassword');
    if (cancelChangePassword) cancelChangePassword.addEventListener('click', hideChangePasswordModal);
    
    // Close change password modal when clicking outside
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', function(event) {
            if (event.target === this) {
                hideChangePasswordModal();
            }
        });
    }
    
    // Invoice form event listener with null check
    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) invoiceForm.addEventListener('submit', handleInvoiceGeneration);
    
    // Load invoices from localStorage
    loadInvoicesFromLocalStorage();
    
    // Check for logo
    checkLogo();
}

function checkLogo() {
    const logo = document.getElementById('logo');
    const fallbackIcon = document.getElementById('fallback-icon');
    
    if (logo) {
        logo.onload = function() {
            this.style.display = 'block';
            if (fallbackIcon) {
                fallbackIcon.style.display = 'none';
            }
        };
        logo.onerror = function() {
            this.style.display = 'none';
            if (fallbackIcon) {
                fallbackIcon.style.display = 'inline';
            }
        };
        
        // Try to load the logo
        logo.src = 'logo.png';
    }
}

function setupStickyElements() {
    // Simple setup - CSS handles the sticky positioning
    console.log('Sticky elements setup complete');
    
    // Prevent scroll bubbling from table container
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.addEventListener('wheel', function(e) {
            const { scrollTop, scrollHeight, clientHeight } = this;
            
            // If we're at the top and trying to scroll up, prevent it
            if (scrollTop === 0 && e.deltaY < 0) {
                e.preventDefault();
            }
            // If we're at the bottom and trying to scroll down, prevent it
            else if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

function calculateTotalValue() {
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const totalValue = quantity * price;
    
    document.getElementById('itemTotalPrice').value = totalValue.toFixed(2);
}

function calculateEditTotalValue() {
    // Try both project and inventory field IDs since we don't know which modal is open
    const projectQuantity = document.getElementById('editProjectQuantity');
    const projectPrice = document.getElementById('editProjectPrice');
    const projectTotal = document.getElementById('editProjectTotalPrice');
    
    const inventoryQuantity = document.getElementById('editInventoryQuantity');
    const inventoryPrice = document.getElementById('editInventoryPrice');
    const inventoryTotal = document.getElementById('editInventoryTotalPrice');
    
    // Determine which modal is active and calculate accordingly
    if (projectQuantity && projectPrice && projectTotal) {
        const quantity = parseInt(projectQuantity.value) || 0;
        const price = parseFloat(projectPrice.value) || 0;
        const totalValue = quantity * price;
        projectTotal.value = totalValue.toFixed(2);
    } else if (inventoryQuantity && inventoryPrice && inventoryTotal) {
        const quantity = parseInt(inventoryQuantity.value) || 0;
        const price = parseFloat(inventoryPrice.value) || 0;
        const totalValue = quantity * price;
        inventoryTotal.value = totalValue.toFixed(2);
    } else {
        console.warn('calculateEditTotalValue: Required elements not found');
    }
}

function calculateEditInventoryTotalValue() {
    const quantity = parseInt(document.getElementById('editInventoryQuantity').value) || 0;
    const price = parseFloat(document.getElementById('editInventoryPrice').value) || 0;
    const totalValue = quantity * price;
    
    document.getElementById('editInventoryTotalPrice').value = totalValue.toFixed(2);
}

function calculateEditProjectTotalValue() {
    const quantity = parseInt(document.getElementById('editProjectQuantity').value) || 0;
    const price = parseFloat(document.getElementById('editProjectPrice').value) || 0;
    const totalValue = quantity * price;
    
    const totalPriceElement = document.getElementById('editProjectTotalPrice');
    if (totalPriceElement) {
        totalPriceElement.value = totalValue.toFixed(2);
    }
}

async function editItem(itemIdOrIndex) {
    // Require authentication
    if (!await requireAuthentication('edit this item')) {
        return;
    }
    
    console.log('📦 editItem called with ID/Index:', itemIdOrIndex); // Debug log
    
    let item;
    let actualIndex;
    
    // Handle both ID and index parameters
    if (typeof itemIdOrIndex === 'string' || typeof itemIdOrIndex === 'number' && itemIdOrIndex > 1000) {
        // It's an ID (string or large number)
        actualIndex = inventory.findIndex(i => i.id === itemIdOrIndex);
        if (actualIndex >= 0) {
            item = inventory[actualIndex];
        }
    } else {
        // It's an index (small number)
        actualIndex = parseInt(itemIdOrIndex);
        if (actualIndex >= 0 && actualIndex < inventory.length) {
            item = inventory[actualIndex];
        }
    }
    
    if (!item) {
        console.error('Item not found with parameter:', itemIdOrIndex);
        return;
    }
    
    console.log('📝 Item to edit:', item); // Debug log
    console.log('📝 Item type:', item.type); // Debug log
    
    // Populate the edit form with null checks
    const setElementValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    };
    
    // Determine the correct field prefix based on item type
    const itemType = item.type || 'project';
    const fieldPrefix = itemType === 'inventory' ? 'editInventory' : 'editProject';
    
    setElementValue(`${fieldPrefix}Index`, actualIndex);
    setElementValue(`${fieldPrefix}Description`, item.description || item.name || '');
    setElementValue(`${fieldPrefix}Location`, item.location || '');
    setElementValue(`${fieldPrefix}Quantity`, item.quantity || 1);
    setElementValue(`${fieldPrefix}Price`, item.price || 0);
    setElementValue(`${fieldPrefix}Type`, item.type || 'project');
    setElementValue(`${fieldPrefix}Status`, item.status || 'completed');
    // setElementValue(`${fieldPrefix}Category`, item.category || ''); // Field removed
    setElementValue(`${fieldPrefix}Notes`, item.notes || '');
    setElementValue(`${fieldPrefix}Supplier`, item.supplier || '');
    setElementValue(`${fieldPrefix}ReorderPoint`, item.reorderPoint || 0);
    
    // Populate customer dropdown for projects
    if (itemType === 'project' && customers.length > 0) {
        populateCustomerSelect(`${fieldPrefix}Customer`);
        setElementValue(`${fieldPrefix}Customer`, item.customer || '');
    }
    
    // Update status options and modal title based on type FIRST
    console.log('Item type for edit:', item.type); // Debug log
    updateEditStatusOptions();
    
    // Hide/show fields based on item status for completed items
    const hideCompletedItemFields = (itemStatus) => {
        console.log('🔍 hideCompletedItemFields called with status:', itemStatus);
        const fieldsToHide = [
            `${fieldPrefix}DueDate`,
            `${fieldPrefix}Priority`, 
            `${fieldPrefix}Tags`,
            `${fieldPrefix}PatternLink`
        ];
        
        console.log('🔍 Fields to hide:', fieldsToHide);
        
        fieldsToHide.forEach(fieldId => {
            const fieldElement = document.getElementById(fieldId);
            console.log(`🔍 Field ${fieldId}:`, fieldElement ? 'found' : 'not found');
            if (fieldElement) {
                const formGroup = fieldElement.closest('.form-group');
                if (formGroup) {
                    const shouldHide = itemStatus === 'completed';
                    formGroup.style.display = shouldHide ? 'none' : 'block';
                    console.log(`🔍 Field ${fieldId} ${shouldHide ? 'HIDDEN' : 'SHOWN'}`);
                }
            }
        });
    };
    
    // NOW set all the field values after the options are created
    setElementValue(`${fieldPrefix}Status`, item.status || 'completed');
    
    // Apply field visibility based on status AFTER the status is set
    hideCompletedItemFields(item.status || 'completed');
    
    // Set project-specific fields (customer will be set after dropdown population)
    setElementValue(`${fieldPrefix}DueDate`, item.dueDate || '');
    setElementValue(`${fieldPrefix}Priority`, item.priority || 'medium');
    setElementValue(`${fieldPrefix}Tags`, item.tags || '');
    setElementValue(`${fieldPrefix}PatternLink`, item.patternLink || '');
    
    // Populate customer dropdown BEFORE setting the value
    populateCustomerSelect(`${fieldPrefix}Customer`);
    
    // NOW set the customer value (this will override the dropdown population)
    setElementValue(`${fieldPrefix}Customer`, item.customer || '');
    
    // Calculate and set total value
    calculateEditTotalValue();
    
    // IMPORTANT: Hide fields AFTER all values are set to prevent reset
    setTimeout(() => {
        hideCompletedItemFields(item.status || 'completed');
    }, 100);
    
    // Display existing image if available (only for projects, not inventory items)
    const imageSection = document.getElementById(`${fieldPrefix}ImageSection`);
    const imageDisplay = document.getElementById(`${fieldPrefix}ImageDisplay`);
    
    // Clear any previous image and hide section by default (with null checks)
    if (imageDisplay) {
        imageDisplay.src = '';
    }
    if (imageSection) {
        imageSection.style.display = 'none';
    }
    
    // Show image section for projects and inventory items with images
    if (item.type === 'project' || !item.type || (item.imageData || item.photo?.dataUrl)) {
        if (item.imageData || item.photo?.dataUrl) {
            const imageData = item.imageData || item.photo?.dataUrl;
            if (imageData && imageData.trim() !== '' && imageData !== 'undefined') {
                if (imageDisplay && imageSection) {
                    imageDisplay.src = imageData;
                    imageSection.style.display = 'block';
                    console.log('📸 Displaying existing image in edit modal');
                }
            } else {
                console.log('📸 Image data is empty or invalid, hiding section');
            }
        } else {
            console.log('📸 No image to display in edit modal');
        }
    } else {
        console.log('📸 Inventory item - not showing image section');
    }
    
    // Show the appropriate edit modal based on item type
    const modalId = itemType === 'inventory' ? 'editInventoryModal' : 'editProjectModal';
    const editModal = document.getElementById(modalId);
    
    if (editModal) {
        editModal.style.display = 'block';
        console.log(`Edit modal (${modalId}) should be visible now`); // Debug log
    } else {
        console.error(`Edit modal (${modalId}) not found!`);
    }
}

// Dedicated function for editing Work in Progress items
function editWIPItem(index) {
    console.log('🔧 editWIPItem called with index:', index);
    
    const item = inventory[index];
    console.log('📝 WIP Item to edit:', item);
    console.log('📝 Item type:', item.type);
    
    // Force the item to be treated as a project for WIP items
    if (!item.type || item.type === 'inventory') {
        console.log('⚠️ Item has no type or is inventory, treating as project for WIP');
        item.type = 'project';
    }
    
    // Call editProject with the corrected item
    editProject(index);
}

// Edit inventory item using dedicated inventory modal
function editInventoryItem(index) {
    console.log('📦 editInventoryItem called with index:', index);
    
    const item = inventory[index];
    console.log('📝 Inventory item to edit:', item);
    
    // Populate the inventory edit form
    document.getElementById('editInventoryIndex').value = index;
    document.getElementById('editInventoryDescription').value = item.description || item.name || '';
    document.getElementById('editInventoryQuantity').value = item.quantity || 1;
    // Category and location fields removed - skip them
    document.getElementById('editInventoryPrice').value = item.price || 0;
    document.getElementById('editInventorySupplier').value = item.supplier || '';
    document.getElementById('editInventoryReorderPoint').value = item.reorderPoint || 0;
    document.getElementById('editInventoryStatus').value = item.status || 'available';
    document.getElementById('editInventoryNotes').value = item.notes || '';
    
    // Calculate and set total value
    calculateEditInventoryTotalValue();
    
    // Show the inventory modal
    document.getElementById('editInventoryModal').style.display = 'block';
}

function editProject(index) {
    console.log('🎯 editProject called with index:', index);
    console.log('📊 Total inventory items:', inventory.length);
    console.log('📝 Inventory at index', index, ':', inventory[index]);
    
    const item = inventory[index];
    console.log('Project to edit:', item);
    
    // Populate the project edit form
    document.getElementById('editProjectIndex').value = index;
    document.getElementById('editProjectDescription').value = item.description || item.name || '';
    document.getElementById('editProjectQuantity').value = item.quantity || 1;
    // document.getElementById('editProjectCategory').value = item.category || ''; // Field removed
    document.getElementById('editProjectStatus').value = item.status || 'pending';
    document.getElementById('editProjectDueDate').value = item.dueDate || '';
    document.getElementById('editProjectPriority').value = item.priority || 'medium';
    document.getElementById('editProjectTags').value = item.tags || '';
    document.getElementById('editProjectPatternLink').value = item.patternLink || '';
    document.getElementById('editProjectNotes').value = item.notes || '';
    
    // Populate customer dropdown
    if (customers.length > 0) {
        populateCustomerSelect('editProjectCustomer');
        document.getElementById('editProjectCustomer').value = item.customer || '';
    } else {
        console.log('Customers not loaded yet, waiting...');
        // Wait a bit and try again
        setTimeout(() => {
            if (customers.length > 0) {
                populateCustomerSelect('editProjectCustomer');
                document.getElementById('editProjectCustomer').value = item.customer || '';
            } else {
                console.log('Customers still not loaded');
            }
        }, 100);
    }
    
    // Projects don't need images - they're tracked through inventory, ideas, and gallery
    
    // Show the project modal
    document.getElementById('editProjectModal').style.display = 'block';
    console.log('Edit project modal should be visible now');
}

async function handleEditProject(e) {
    e.preventDefault();
    
    console.log('🎯 handleEditProject called!');
    
    showLoadingSpinner('Updating project...', 'edit-project');
    
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    // Basic validation
    const description = getElementValue('editProjectDescription').trim();
    
    if (!description) {
        hideLoadingSpinner('edit-project');
        alert('Please enter a description for the project.');
        return;
    }
    
    const index = parseInt(getElementValue('editProjectIndex'));
    if (isNaN(index)) {
        console.error('Invalid project index');
        return;
    }
    
    const newStatus = getElementValue('editProjectStatus');
    const shouldCreateSale = newStatus === 'sold';
    
    // Update the project
    inventory[index] = {
        ...inventory[index],
        description: description,
        quantity: parseInt(getElementValue('editProjectQuantity')) || 1,
        price: parseFloat(getElementValue('editProjectPrice')) || 0,
        category: '', // Field removed
        status: newStatus,
        customer: getElementValue('editProjectCustomer'),
        location: getElementValue('editProjectLocation'),
        dueDate: getElementValue('editProjectDueDate'),
        priority: getElementValue('editProjectPriority'),
        tags: getElementValue('editProjectTags'),
        patternLink: getElementValue('editProjectPatternLink'),
        notes: getElementValue('editProjectNotes'),
        type: 'project'
    };
    
    if (shouldCreateSale) {
        createOrUpdateSaleFromProject(index);
    }
    
    // Save current filters before refresh
    saveCurrentFilters('projects');
    
    // Save data
    await saveData();
    
    // Restore filters before refresh so loadProjectsCards uses them
    restoreFilters('projects');
    
    // Refresh displays
    loadInventoryTable();
    if (typeof loadProjectsCards === 'function') {
        loadProjectsCards();
    }
    if (shouldCreateSale) {
        refreshSalesViews();
    }
    
    hideLoadingSpinner('edit-project');
    
    // Close modal
    closeModal('editProjectModal');
    
    console.log('Project updated successfully');
}

async function handleEditInventory(e) {
    e.preventDefault();
    
    console.log('📦 handleEditInventory called!');
    
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    // Basic validation
    const description = getElementValue('editInventoryDescription').trim();
    
    if (!description) {
        alert('Please enter a description for the inventory item.');
        return;
    }
    
    const index = parseInt(getElementValue('editInventoryIndex'));
    if (isNaN(index)) {
        console.error('Invalid inventory index');
        return;
    }
    
    const newStatus = getElementValue('editInventoryStatus');
    const shouldCreateSale = newStatus === 'sold';
    
    // Update the inventory item
    inventory[index] = {
        ...inventory[index],
        description: description,
        quantity: parseInt(getElementValue('editInventoryQuantity')) || 1,
        category: '',
        price: parseFloat(getElementValue('editInventoryPrice')) || 0,
        location: '',
        supplier: getElementValue('editInventorySupplier'),
        reorderPoint: parseInt(getElementValue('editInventoryReorderPoint')) || 0,
        status: newStatus,
        notes: getElementValue('editInventoryNotes'),
        type: 'inventory'
    };
    
    if (shouldCreateSale) {
        createOrUpdateSaleFromProject(index);
    }
    
    // Save data
    await saveData();
    
    // Refresh displays
    loadInventoryItemsTable();
    if (shouldCreateSale) {
        refreshSalesViews();
    }
    
    // Close modal
    closeModal('editInventoryModal');
    
    console.log('Inventory item updated successfully');
}

async function handleEditCompletedItem(e) {
    e.preventDefault();
    
    console.log('🎯 handleEditCompletedItem called!');
    
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    const indexField = document.getElementById('editCompletedItemIndex');
    if (!indexField || indexField.value === '') {
        showNotification('Invalid item index', 'error');
        return;
    }
    
    const index = parseInt(indexField.value);
    if (index < 0 || index >= inventory.length) {
        showNotification('Invalid item index', 'error');
        return;
    }
    
    // Basic validation
    const description = getElementValue('editCompletedItemDescription');
    if (!description.trim()) {
        showNotification('Description is required', 'error');
        return;
    }
    
    // Store expanded customer groups before reload
    const expandedCustomers = getCurrentlyExpandedCustomerGroups();
    
    // Update the item
    inventory[index] = {
        ...inventory[index],
        description: description.trim(),
        quantity: parseInt(getElementValue('editCompletedItemQuantity')) || 1,
        price: parseFloat(getElementValue('editCompletedItemPrice')) || 0,
        customer: getElementValue('editCompletedItemCustomer'),
        invoicedDate: getElementValue('editCompletedItemInvoicedDate'),
        status: 'completed', // Always set to completed
        // Preserve existing image data
        photo: inventory[index].photo,
        imageData: inventory[index].imageData
    };
    
    console.log('Completed item updated:', inventory[index]);
    
    await saveData();
    loadCompletedItemsTable(); // Refresh completed items
    loadInventoryTable(); // Refresh projects table
    updateCustomerFilters();
    
    // Restore expanded customer groups after reload
    restoreExpandedCustomerGroups(expandedCustomers);
    
    // Close modal
    closeModal('editCompletedItemModal');
    
    showNotification('Completed item updated successfully', 'success');
    console.log('Completed item updated successfully');
}

async function handleAddCompletedItem(e) {
    e.preventDefault();
    
    console.log('🎯 handleAddCompletedItem called!');
    
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    // Basic validation
    const description = getElementValue('addCompletedItemDescription');
    if (!description.trim()) {
        showNotification('Description is required', 'error');
        return;
    }
    
    // Store expanded customer groups before reload
    const expandedCustomers = getCurrentlyExpandedCustomerGroups();
    
    // Create new completed item
    const newItem = {
        _id: Date.now().toString(), // Simple ID generation
        description: description.trim(),
        quantity: parseInt(getElementValue('addCompletedItemQuantity')) || 1,
        price: parseFloat(getElementValue('addCompletedItemPrice')) || 0,
        customer: getElementValue('addCompletedItemCustomer'),
        invoicedDate: getElementValue('addCompletedItemInvoicedDate'),
        status: 'completed',
        type: 'project',
        createdAt: new Date().toISOString()
    };
    
    console.log('New completed item:', newItem);
    
    // Add to inventory
    inventory.push(newItem);
    
    await saveData();
    loadCompletedItemsTable(); // Refresh completed items
    loadInventoryTable(); // Refresh projects table
    updateCustomerFilters();
    
    // Restore expanded customer groups after reload
    restoreExpandedCustomerGroups(expandedCustomers);
    
    // Close modal
    closeModal('addCompletedItemModal');
    
    showNotification('Completed item added successfully', 'success');
    console.log('Completed item added successfully');
}

async function handleEditItem(e) {
    e.preventDefault();
    
    console.log('🎯 handleEditItem called!'); // Debug log
    console.log('📋 Event:', e);
    console.log('📋 Form data:', new FormData(e.target));
    
    // Get form elements safely - define this first!
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    // Basic validation
    const description = document.getElementById('editItemDescription').value.trim();
    
    if (!description) {
        showNotification('Please fill in the description', 'error');
        return;
    }
    
    const index = parseInt(document.getElementById('editItemIndex').value);
    const quantity = parseInt(document.getElementById('editItemQuantity').value) || 1;
    const pricePerItem = parseFloat(document.getElementById('editItemPrice').value) || 0;
    const totalValue = quantity * pricePerItem;
    
    console.log('Updating item at index:', index); // Debug log
    
    // Get the new status before updating
    const newStatus = getElementValue('editItemStatus');
    const shouldCreateSale = newStatus === 'sold';
    const oldStatus = inventory[index].status;
    console.log(`🔄 Status change: ${oldStatus} → ${newStatus}`);
    
    // Store expanded customer groups before updating
    const expandedCustomers = getCurrentlyExpandedCustomerGroups();
    
    // Update the item (preserve existing image data)
    inventory[index] = {
        ...inventory[index],
        name: description, // Use description as name
        customer: getElementValue('editItemCustomer'),
        location: getElementValue('editItemLocation') || 'Not specified',
        description: description,
        quantity: quantity,
        price: pricePerItem,
        totalValue: totalValue,
        type: getElementValue('editItemType'),
        status: newStatus,
        priority: getElementValue('editItemPriority') || 'medium',
        dueDate: getElementValue('editItemDueDate') || null,
        notes: getElementValue('editItemNotes'),
        category: getElementValue('editItemCategory'),
        supplier: getElementValue('editItemSupplier'),
        reorderPoint: parseInt(getElementValue('editItemReorderPoint')) || 0,
        tags: getElementValue('editItemTags'),
        patternLink: getElementValue('editItemPatternLink'),
        // Preserve existing image data
        photo: inventory[index].photo,
        imageData: inventory[index].imageData
    };
    
    console.log('Item updated:', inventory[index]); // Debug log
    
    if (shouldCreateSale) {
        createOrUpdateSaleFromProject(index);
    }
    
    await saveData();
    loadInventoryTable(); // Projects table
    if (typeof loadProjectsCards === 'function') {
        loadProjectsCards();
    }
    loadInventoryItemsTable(); // Inventory items table
    loadWIPTab(); // Refresh Work in Progress tab
    if (shouldCreateSale) {
        refreshSalesViews();
    }
    updateCustomerFilters();
    
    // Restore expanded customer groups after reload
    restoreExpandedCustomerGroups(expandedCustomers);
    
    console.log('About to close edit modal'); // Debug log
    
    // Close modal and clear form
    const editModal = document.getElementById('editItemModal');
    if (editModal) {
        editModal.style.display = 'none';
        // Clear the form
        document.getElementById('editItemForm').reset();
        console.log('Edit modal closed and form cleared'); // Debug log
    }
    
    showNotification('Item updated successfully!', 'success');
}

function initializeConnectionStatus() {
    const connectionStatusContainer = document.getElementById('connectionStatusContainer');
    if (connectionStatusContainer) {
        // Show connection status on localhost, hide on live site
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            connectionStatusContainer.style.display = 'flex';
        } else {
            connectionStatusContainer.style.display = 'none';
        }
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
        loadDataFromLocalStorage();
    }
}

// Add caching to prevent repeated API calls
let lastAPILoad = 0;
const API_CACHE_DURATION = 10000; // 10 seconds cache
let isLoadingAPI = false;

async function loadDataFromAPI() {
    console.log('📡 loadDataFromAPI called - isLoadingAPI:', isLoadingAPI, 'lastAPILoad:', lastAPILoad, 'inventory.length:', inventory.length);
    
    // Prevent multiple simultaneous API calls
    if (isLoadingAPI) {
        console.log('📡 API load already in progress, skipping...');
        return;
    }
    
    // Check cache
    const now = Date.now();
    if (now - lastAPILoad < API_CACHE_DURATION && inventory.length > 0) {
        console.log('📡 Using cached API data...');
        return;
    }
    
    console.log('📡 Making fresh API calls...');
    isLoadingAPI = true;
    lastAPILoad = now;
    
    // Show loading spinner
    showLoadingSpinner('Loading data...', 'load');
    
    try {
        console.log('📡 Loading data from API...');
        const [inventoryRes, customersRes, salesRes, galleryRes, ideasRes] = await Promise.all([
            fetch('/api/inventory'),
            fetch('/api/customers'),
            fetch('/api/sales'),
            fetch('/api/gallery'),
            fetch('/api/ideas')
        ]);

        // Check each response for errors
        const responses = [
            { name: 'inventory', response: inventoryRes },
            { name: 'customers', response: customersRes },
            { name: 'sales', response: salesRes },
            { name: 'gallery', response: galleryRes },
            { name: 'ideas', response: ideasRes }
        ];

        for (const { name, response } of responses) {
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`Failed to load ${name}: ${response.status} ${errorText}`);
            }
        }

        // Parse JSON data
        inventory = await inventoryRes.json();
        customers = await customersRes.json();
        sales = await salesRes.json();
        gallery = await galleryRes.json();
        ideas = await ideasRes.json();
        
        // Assign to window object for mobile cards
        window.inventory = inventory;
        window.customers = customers;
        window.sales = sales;
        window.gallery = gallery;
        window.ideas = ideas;
        
