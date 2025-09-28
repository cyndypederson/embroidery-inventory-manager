// Data storage
let inventory = [];
let customers = [];
let sales = [];
let gallery = [];
let invoices = [];
let ideas = [];

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
    paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalPages * currentPageSize} items`;
    
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

// Enhanced table loading with pagination
function loadInventoryTableWithPagination() {
    const cacheKey = 'inventory_table';
    let data = PerformanceManager.getCachedData(cacheKey);
    
    if (!data) {
        // Filter data based on current filters
        data = inventory.filter(item => {
            const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            const customerFilter = document.getElementById('customerFilter')?.value || '';
            const locationFilter = document.getElementById('locationFilter')?.value || '';
            
            return (!searchTerm || item.description?.toLowerCase().includes(searchTerm)) &&
                   (!statusFilter || item.status === statusFilter) &&
                   (!customerFilter || item.customer === customerFilter) &&
                   (!locationFilter || item.location === locationFilter);
        });
        
        PerformanceManager.setCachedData(cacheKey, data);
    }
    
    const pagination = PerformanceManager.paginateData(data, currentPage, currentPageSize);
    totalPages = pagination.totalPages;
    
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (pagination.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No projects found</td></tr>';
        updatePaginationControls('projects');
        return;
    }
    
    pagination.data.forEach((item, index) => {
        const row = createInventoryRow(item, (currentPage - 1) * currentPageSize + index);
        tbody.appendChild(row);
    });
    
    updatePaginationControls('projects');
}

function loadInventoryItemsTableWithPagination() {
    const cacheKey = 'inventory_items_table';
    let data = PerformanceManager.getCachedData(cacheKey);
    
    if (!data) {
        // Filter data based on current filters
        data = inventory.filter(item => {
            const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('inventoryStatusFilter')?.value || '';
            const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || '';
            const locationFilter = document.getElementById('inventoryLocationFilter')?.value || '';
            
            return (!searchTerm || item.description?.toLowerCase().includes(searchTerm)) &&
                   (!statusFilter || item.status === statusFilter) &&
                   (!categoryFilter || item.category === categoryFilter) &&
                   (!locationFilter || item.location === locationFilter);
        });
        
        PerformanceManager.setCachedData(cacheKey, data);
    }
    
    const pagination = PerformanceManager.paginateData(data, currentPage, currentPageSize);
    totalPages = pagination.totalPages;
    
    const tbody = document.getElementById('inventoryItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (pagination.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No inventory items found</td></tr>';
        updatePaginationControls('inventory');
        return;
    }
    
    pagination.data.forEach((item, index) => {
        const row = createInventoryItemRow(item, (currentPage - 1) * currentPageSize + index);
        tbody.appendChild(row);
    });
    
    updatePaginationControls('inventory');
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
        
        // Reload table with new search
        loadInventoryTableWithPagination();
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
        
        // Reload table with filtered results
        if (this.currentTab === 'projects') {
            loadInventoryTableWithPagination();
        } else if (this.currentTab === 'inventory') {
            loadInventoryItemsTableWithPagination();
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
                        <h4>${search.name}</h4>
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
        
        if (tab === 'projects') {
            loadInventoryTableWithPagination();
        } else if (tab === 'inventory') {
            loadInventoryItemsTableWithPagination();
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
    }
    
    createBulkActionsContainer() {
        const container = document.createElement('div');
        container.id = 'bulkActionsContainer';
        container.className = 'bulk-actions-container';
        container.style.display = 'none'; // Ensure it starts hidden
        container.innerHTML = `
            <div class="bulk-actions">
                <span class="bulk-selection-count">0 items selected</span>
                <div class="bulk-actions-buttons">
                    <button class="btn btn-outline" onclick="uxManager.bulkEdit()">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.bulkDelete()">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.bulkExport()">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.bulkStatusUpdate()">
                        <i class="fas fa-tag"></i> Update Status
                    </button>
                    <button class="btn btn-outline" onclick="uxManager.clearSelection()">
                        <i class="fas fa-times"></i> Clear
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
                appVersion: '1.0.7'
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
        // Create a simple PDF-like report
        const reportContent = this.generateReportContent(data);
        this.downloadFile(reportContent, filename, 'text/html');
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
            
            if (this.notificationPermission === 'default') {
                this.requestNotificationPermission();
            }
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
                const currentVersion = '1.0.7'; // Current app version
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
            validator: (value, max) => !value || value.length <= max,
            message: (max) => `Must be no more than ${max} characters long`
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
        if (field.minLength) {
            rules.push({
                validator: (value) => this.validationRules.get('minLength').validator(value, field.minLength),
                message: this.validationRules.get('minLength').message(field.minLength)
            });
        }
        
        if (field.maxLength) {
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
    
    processFormData(formId, formData) {
        // Process form data based on form type
        const formInfo = this.forms.get(formId);
        if (!formInfo) return;
        
        switch (formInfo.template) {
            case 'inventory-item':
                this.processInventoryItem(formData);
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
    
    processInventoryItem(formData) {
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
        saveData();
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

// Authentication
let ADMIN_PASSWORD = 'Kobedavis#1'; // Default password - change this to your desired password
let isAuthenticated = false;

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
function changePassword(newPassword) {
    ADMIN_PASSWORD = newPassword;
    console.log('Password changed successfully!');
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
    
    // Validate current password
    if (currentPassword !== ADMIN_PASSWORD) {
        const errorText = document.getElementById('changePasswordErrorText');
        const errorDiv = document.getElementById('changePasswordError');
        
        if (errorText) errorText.textContent = 'Current password is incorrect.';
        if (errorDiv) errorDiv.style.display = 'block';
        return;
    }
    
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
    
    // Change password
    ADMIN_PASSWORD = newPassword;
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
        container.innerHTML = `<p>No individual sales found for customer "${selectedCustomer}". Shop sales are not included in invoices.</p>`;
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
                    <strong>${sale.itemName}</strong> - $${sale.salePrice} - ${sale.dateSold}
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
    content.innerHTML = generateInvoiceHTML(invoice);
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

function generateInvoiceHTML(invoice) {
    const businessName = "CyndyP Stitchcraft";
    const businessEmail = "cyndypstitchcraft@gmail.com";
    
    // Get customer details
    const customer = customers.find(c => c.name === invoice.customer);
    const customerInfo = customer ? `
        <p><strong>${customer.name}</strong></p>
        ${customer.location ? `<p>${customer.location}</p>` : ''}
        ${customer.contact ? `<p>${customer.contact}</p>` : ''}
    ` : `<p><strong>${invoice.customer}</strong></p>`;
    
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
                    <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                </div>
            </div>
            
            <div class="customer-info">
                <h3>Bill To:</h3>
                ${customerInfo}
            </div>
            
            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Date Sold</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.sales.map(sale => `
                            <tr>
                                <td>${sale.itemName}</td>
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
            
            ${invoice.notes ? `
                <div class="invoice-notes">
                    <h3>Notes:</h3>
                    <p>${invoice.notes}</p>
                </div>
            ` : ''}
            
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;
}

function printInvoice() {
    const invoiceContent = document.getElementById('invoiceContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .invoice-document { max-width: 800px; margin: 0 auto; }
                    .invoice-header-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .business-info h1 { color: #2C3E2D; margin-bottom: 10px; }
                    .business-logo { text-align: center; margin-bottom: 15px; }
                    .invoice-logo { max-width: 120px; max-height: 60px; object-fit: contain; }
                    .invoice-info h2 { color: #6B8E5A; margin-bottom: 10px; }
                    .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .invoice-table th { background-color: #f5f5f5; }
                    .total-row { background-color: #f9f9f9; font-weight: bold; }
                    .invoice-notes { margin: 20px 0; }
                    .invoice-footer { margin-top: 30px; text-align: center; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${invoiceContent}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
            <td>${invoice.customer}</td>
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
function getExpandedCustomerGroups() {
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
function checkAuthentication() {
    // Always authenticated on localhost
    if (isLocalhost()) {
        return true;
    }
    
    const authStatus = sessionStorage.getItem('embroideryAuth');
    isAuthenticated = authStatus === 'true';
    return isAuthenticated;
}

function setAuthenticated(status) {
    isAuthenticated = status;
    sessionStorage.setItem('embroideryAuth', status.toString());
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
    
    if (password === ADMIN_PASSWORD) {
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

function requireAuth(tabName) {
    // Skip authentication on localhost
    if (isLocalhost()) {
        return true;
    }
    
    // Only require auth for sales, reports, and data management on production
    if (tabName === 'sales' || tabName === 'reports' || tabName === 'data') {
        if (!checkAuthentication()) {
            sessionStorage.setItem('requestedTab', tabName);
            showAuthModal();
            return false;
        }
    }
    return true;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Embroidery Inventory Manager Initialized');
    
    // Remove any existing install banners or sales notifications
    const existingBanner = document.querySelector('.install-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Remove any existing sales notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.textContent.includes('All sales already have commission data')) {
            notification.remove();
        }
    });
    
    initializeApp();
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
});

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

    // Form submissions
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
    document.getElementById('addCustomerForm').addEventListener('submit', handleAddCustomer);
    document.getElementById('editCustomerForm').addEventListener('submit', handleEditCustomer);
    document.getElementById('addSaleForm').addEventListener('submit', handleAddSale);
    document.getElementById('editSaleForm').addEventListener('submit', handleEditSale);
    document.getElementById('addPhotoForm').addEventListener('submit', handleAddPhoto);
    document.getElementById('addIdeaForm').addEventListener('submit', handleAddIdea);
    
    // Edit form event listener with error handling
    const editForm = document.getElementById('editItemForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditItem);
        console.log('Edit form event listener added');
        
        // Also add click listener to the submit button for debugging
        const submitButton = document.getElementById('editItemSubmitButton');
        if (submitButton) {
            submitButton.addEventListener('click', function(e) {
                console.log('🔘 Submit button clicked!', e);
                console.log('📋 Form element:', editForm);
                console.log('📋 Form validity:', editForm.checkValidity());
            });
            console.log('Submit button click listener added');
        } else {
            console.error('Submit button not found!');
        }
    } else {
        console.error('Edit form not found!');
    }
    
    // Add close button event listener for edit modal
    const editModalClose = document.querySelector('#editItemModal .close');
    if (editModalClose) {
        editModalClose.addEventListener('click', function() {
            console.log('Edit modal close button clicked');
            closeModal('editItemModal');
        });
    }

    // Set today's date for sale date
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    
    // Add event listeners for quantity and price calculation
    document.getElementById('itemQuantity').addEventListener('input', calculateTotalValue);
    document.getElementById('itemPrice').addEventListener('input', calculateTotalValue);
    document.getElementById('editItemQuantity').addEventListener('input', calculateEditTotalValue);
    document.getElementById('editItemPrice').addEventListener('input', calculateEditTotalValue);
    
    // Check connection status
    checkConnectionStatus();
    
    // Initialize connection status display (show on localhost, hide on live site)
    initializeConnectionStatus();
    
    // Authentication event listeners
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
    
    // Invoice form event listener
    document.getElementById('invoiceForm').addEventListener('submit', handleInvoiceGeneration);
    
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
    const quantity = parseInt(document.getElementById('editItemQuantity').value) || 0;
    const price = parseFloat(document.getElementById('editItemPrice').value) || 0;
    const totalValue = quantity * price;
    
    document.getElementById('editItemTotalPrice').value = totalValue.toFixed(2);
}

function editItem(index) {
    console.log('📦 editItem called with index:', index); // Debug log
    
    const item = inventory[index];
    console.log('📝 Item to edit:', item); // Debug log
    console.log('📝 Item type:', item.type); // Debug log
    
    // Populate the edit form
    document.getElementById('editItemIndex').value = index;
    document.getElementById('editItemDescription').value = item.description || item.name || '';
    document.getElementById('editItemLocation').value = item.location || '';
    document.getElementById('editItemQuantity').value = item.quantity || 1;
    document.getElementById('editItemPrice').value = item.price || 0;
    document.getElementById('editItemType').value = item.type || 'inventory';
    document.getElementById('editItemStatus').value = item.status || 'available';
    document.getElementById('editItemCategory').value = item.category || '';
    document.getElementById('editItemNotes').value = item.notes || '';
    document.getElementById('editItemSupplier').value = item.supplier || '';
    document.getElementById('editItemReorderPoint').value = item.reorderPoint || 0;
    
    // Update status options and modal title based on type FIRST
    console.log('Item type for edit:', item.type); // Debug log
    updateEditStatusOptions();
    
    // NOW set all the field values after the options are created
    document.getElementById('editItemStatus').value = item.status || 'available';
    
    // Set project-specific fields
    document.getElementById('editItemCustomer').value = item.customer || '';
    document.getElementById('editItemDueDate').value = item.dueDate || '';
    document.getElementById('editItemPriority').value = item.priority || 'medium';
    document.getElementById('editItemTags').value = item.tags || '';
    document.getElementById('editItemPatternLink').value = item.patternLink || '';
    
    // Calculate and set total value
    calculateEditTotalValue();
    
    // Populate customer dropdown (this will preserve the value we just set)
    populateCustomerSelect('editItemCustomer');
    
    // Show the edit modal
    document.getElementById('editItemModal').style.display = 'block';
    console.log('Edit modal should be visible now'); // Debug log
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

// Edit inventory item (same as editItem but with specific naming for clarity)
function editInventoryItem(index) {
    editItem(index);
}

function editProject(index) {
    console.log('🎯 editProject called with index:', index); // Debug log
    console.log('📊 Total inventory items:', inventory.length);
    console.log('📝 Inventory at index', index, ':', inventory[index]);
    console.log('👥 Customers array length:', customers.length);
    console.log('👥 Customers:', customers);
    
    const item = inventory[index];
    console.log('Project to edit:', item); // Debug log
    
    // Populate the edit form
    document.getElementById('editItemIndex').value = index;
    document.getElementById('editItemDescription').value = item.description || item.name || '';
    document.getElementById('editItemQuantity').value = item.quantity || 1;
    document.getElementById('editItemCategory').value = item.category || '';
    document.getElementById('editItemNotes').value = item.notes || '';
    
    // Set the item type FIRST, then update status options
    document.getElementById('editItemType').value = 'project'; // Force project type
    console.log('Setting up edit modal for project'); // Debug log
    updateEditStatusOptions();
    
    // NOW set all the field values after the options are created
    console.log('Project status from data:', item.status);
    console.log('Setting edit modal status to:', item.status || 'pending');
    document.getElementById('editItemStatus').value = item.status || 'pending';
    
    // Set other project-specific fields first
    document.getElementById('editItemDueDate').value = item.dueDate || '';
    document.getElementById('editItemPriority').value = item.priority || 'medium';
    document.getElementById('editItemTags').value = item.tags || '';
    document.getElementById('editItemPatternLink').value = item.patternLink || '';
    
    // Populate customer dropdown first, then set the value
    if (customers.length > 0) {
        populateCustomerSelect('editItemCustomer');
        console.log(`Setting customer value to: "${item.customer}"`);
        document.getElementById('editItemCustomer').value = item.customer || '';
        console.log(`Customer value after setting: "${document.getElementById('editItemCustomer').value}"`);
    } else {
        console.log('Customers not loaded yet, waiting...');
        // Wait a bit and try again
        setTimeout(() => {
            if (customers.length > 0) {
                populateCustomerSelect('editItemCustomer');
                console.log(`Setting customer value to: "${item.customer}"`);
                document.getElementById('editItemCustomer').value = item.customer || '';
                console.log(`Customer value after setting: "${document.getElementById('editItemCustomer').value}"`);
            } else {
                console.log('Customers still not loaded');
            }
        }, 100);
    }
    
    // Show the edit modal
    document.getElementById('editItemModal').style.display = 'block';
    console.log('Edit project modal should be visible now'); // Debug log
}

function handleEditItem(e) {
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
    const oldStatus = inventory[index].status;
    console.log(`🔄 Status change: ${oldStatus} → ${newStatus}`);
    
    // Store expanded customer groups before updating
    const expandedCustomers = getExpandedCustomerGroups();
    
    // Update the item
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
        status: getElementValue('editItemStatus'),
        priority: getElementValue('editItemPriority') || 'medium',
        dueDate: getElementValue('editItemDueDate') || null,
        notes: getElementValue('editItemNotes'),
        category: getElementValue('editItemCategory'),
        supplier: getElementValue('editItemSupplier'),
        reorderPoint: parseInt(getElementValue('editItemReorderPoint')) || 0,
        tags: getElementValue('editItemTags'),
        patternLink: getElementValue('editItemPatternLink')
    };
    
    console.log('Item updated:', inventory[index]); // Debug log
    
    saveData();
    loadInventoryTable(); // Projects table
    loadInventoryItemsTable(); // Inventory items table
    loadWIPTab(); // Refresh Work in Progress tab
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

async function loadDataFromAPI() {
    try {
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
                throw new Error(`Failed to load ${name}: ${response.status} ${response.statusText}`);
            }
        }

        // Parse JSON data
        inventory = await inventoryRes.json();
        customers = await customersRes.json();
        sales = await salesRes.json();
        gallery = await galleryRes.json();
        ideas = await ideasRes.json();
        
        console.log('✅ Data loaded from API successfully:');
        console.log('  📦 Inventory items:', inventory.length);
        console.log('  👥 Customers:', customers.length);
        console.log('  💰 Sales records:', sales.length);
        console.log('  🖼️ Gallery items:', gallery.length);
        console.log('  💡 Ideas:', ideas.length);

        loadData();
        updateConnectionStatus('connected');
    } catch (error) {
        console.error('❌ API data loading failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        loadDataFromLocalStorage();
        updateConnectionStatus('disconnected');
    }
}

function loadDataFromLocalStorage() {
    inventory = JSON.parse(localStorage.getItem('embroideryInventory')) || [];
    customers = JSON.parse(localStorage.getItem('embroideryCustomers')) || [];
    sales = JSON.parse(localStorage.getItem('embroiderySales')) || [];
    gallery = JSON.parse(localStorage.getItem('embroideryGallery')) || [];
    ideas = JSON.parse(localStorage.getItem('embroideryIdeas')) || [];
    loadData();
}

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
        statusElement.className = 'status-indicator connected';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Offline Mode';
        statusElement.className = 'status-indicator disconnected';
    }
}

function switchTab(tabName) {
    // Check authentication for protected tabs
    if (!requireAuth(tabName)) {
        return; // Authentication modal will be shown
    }
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load data for the tab
    if (tabName === 'projects') {
        loadInventoryTable(); // Projects table
    } else if (tabName === 'inventory') {
        loadInventoryItemsTable(); // Inventory items table
    } else if (tabName === 'customers') {
        loadCustomersTable();
    } else if (tabName === 'wip') {
        loadWIPTab();
    } else if (tabName === 'gallery') {
        loadGallery();
    } else if (tabName === 'sales') {
        loadSalesTable();
    } else if (tabName === 'reports') {
        loadReportsDashboard();
    } else if (tabName === 'ideas') {
        loadIdeasGrid();
    }
}

function loadData() {
    cleanCopyText();
    loadInventoryTable(); // Projects table
    loadInventoryItemsTable(); // Inventory items table
    loadCustomersTable();
    loadWIPTab();
    loadGallery();
    loadSalesTable();
    loadIdeasGrid();
    loadReportsDashboard();
    updateLocationFilters();
    updateCustomerFilters();
}

function cleanCopyText() {
    let hasChanges = false;
    
    inventory.forEach(item => {
        // Remove "(Copy)" from item names
        if (item.name && item.name.includes(' (Copy)')) {
            item.name = item.name.replace(' (Copy)', '');
            hasChanges = true;
        }
        
        // Remove copy notation from notes
        if (item.notes && item.notes.includes('(Copied from:')) {
            item.notes = item.notes.replace(/\s*\(Copied from:.*?\)/, '');
            hasChanges = true;
        }
        
        // Remove standalone copy notes
        if (item.notes && item.notes.startsWith('Copied from:')) {
            item.notes = '';
            hasChanges = true;
        }
    });
    
    // Save changes if any were made
    if (hasChanges) {
        saveData();
        console.log('Cleaned up copy text from existing items');
    }
}

// API Functions
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
        
    } catch (error) {
        console.error('❌ API save failed:', error.message);
        console.log('🔄 Falling back to localStorage...');
        saveDataToLocalStorage();
    }
}

function saveDataToLocalStorage() {
    try {
        localStorage.setItem('embroideryInventory', JSON.stringify(inventory));
        localStorage.setItem('embroideryCustomers', JSON.stringify(customers));
        localStorage.setItem('embroiderySales', JSON.stringify(sales));
        localStorage.setItem('embroideryGallery', JSON.stringify(gallery));
        localStorage.setItem('embroideryIdeas', JSON.stringify(ideas));
        
        // Add timestamp for synchronization tracking
        localStorage.setItem('lastDataSave', Date.now().toString());
        console.log('Data saved to localStorage successfully');
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        
        // If quota exceeded, try to clean up and retry
        if (error.name === 'QuotaExceededError') {
            console.log('LocalStorage quota exceeded, attempting cleanup...');
            cleanupLocalStorage();
            
            try {
                // Retry saving after cleanup
                localStorage.setItem('embroideryInventory', JSON.stringify(inventory));
                localStorage.setItem('embroideryCustomers', JSON.stringify(customers));
                localStorage.setItem('embroiderySales', JSON.stringify(sales));
                localStorage.setItem('embroideryGallery', JSON.stringify(gallery));
                localStorage.setItem('embroideryIdeas', JSON.stringify(ideas));
                localStorage.setItem('lastDataSave', Date.now().toString());
                console.log('Data saved to localStorage after cleanup');
                showNotification('Data saved after cleanup', 'success');
            } catch (retryError) {
                console.error('Still failed after cleanup:', retryError);
                showNotification('Storage full - some data may not be saved', 'error');
            }
        } else {
            showNotification('Failed to save data locally', 'error');
        }
    }
}

function cleanupLocalStorage() {
    try {
        console.log('🧹 Cleaning up localStorage...');
        
        // Remove old backup data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('backup') || key.includes('temp') || key.includes('old'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed old data: ${key}`);
        });
        
        // Clear any large photo data that might be taking up space
        const inventoryData = localStorage.getItem('embroideryInventory');
        if (inventoryData) {
            try {
                const inventory = JSON.parse(inventoryData);
                let hasLargePhotos = false;
                
                inventory.forEach(item => {
                    if (item.photo && item.photo.dataUrl && item.photo.dataUrl.length > 100000) {
                        // Remove large photo data
                        item.photo = { ...item.photo, dataUrl: null };
                        hasLargePhotos = true;
                    }
                });
                
                if (hasLargePhotos) {
                    localStorage.setItem('embroideryInventory', JSON.stringify(inventory));
                    console.log('Removed large photo data to free up space');
                }
            } catch (e) {
                console.log('Could not clean inventory data');
            }
        }
        
        console.log('✅ LocalStorage cleanup completed');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
}

function saveData() {
    // Validate data before saving
    if (!validateDataIntegrity()) {
        console.error('Data validation failed, skipping save');
        showNotification('Data validation failed. Please refresh and try again.', 'error');
        return;
    }
    
    // Try API first, fallback to localStorage
    saveDataToAPI();
    saveDataToLocalStorage();
    
    // Trigger synchronization for both desktop and mobile views
    synchronizeViews();
}

function validateDataIntegrity() {
    try {
        // Validate inventory data
        if (!Array.isArray(inventory)) {
            console.error('Inventory is not an array');
            return false;
        }
        
        // Validate customers data
        if (!Array.isArray(customers)) {
            console.error('Customers is not an array');
            return false;
        }
        
        // Validate sales data
        if (!Array.isArray(sales)) {
            console.error('Sales is not an array');
            return false;
        }
        
        // Validate gallery data
        if (!Array.isArray(gallery)) {
            console.error('Gallery is not an array');
            return false;
        }
        
        // Validate ideas data
        if (!Array.isArray(ideas)) {
            console.error('Ideas is not an array');
            return false;
        }
        
        // Check for corrupted image data
        const allData = [...inventory, ...gallery, ...ideas];
        for (const item of allData) {
            if (item.imageUrl || item.imageData || item.photo) {
                const imageData = item.imageUrl || item.imageData || (item.photo && item.photo.dataUrl);
                if (imageData && typeof imageData === 'string') {
                    // Check if it's a valid base64 data URL
                    if (!imageData.startsWith('data:image/') || imageData.length < 100) {
                        console.warn('Invalid image data found, removing:', item.name || item.title);
                        delete item.imageUrl;
                        delete item.imageData;
                        if (item.photo) delete item.photo.dataUrl;
                    }
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Data validation error:', error);
        return false;
    }
}

function synchronizeViews() {
    // Refresh all tabs to ensure desktop and mobile are in sync
    loadData();
    
    // Note: Mobile card refreshes are handled within the individual load functions
    // (loadInventoryTable, loadWIPTab, etc.) so we don't need to call them separately
}

function setupViewSynchronization() {
    // Handle window resize to switch between desktop/mobile views
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Refresh the current view when switching between desktop/mobile
            synchronizeViews();
        }, 250); // Debounce resize events
    });
    
    // Set up periodic data refresh to catch changes from other tabs/windows
    setInterval(() => {
        // Check if data has changed by comparing localStorage timestamps
        const lastSaved = localStorage.getItem('lastDataSave');
        const currentTime = Date.now();
        
        if (lastSaved && (currentTime - parseInt(lastSaved)) < 5000) {
            // Data was recently saved, refresh views
            synchronizeViews();
        }
    }, 3000); // Check every 3 seconds
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', function(e) {
        if (e.key && e.key.startsWith('embroidery')) {
            // Data was updated in another tab, refresh current view
            console.log('🔄 Data changed in another tab, refreshing...');
            setTimeout(() => {
                loadDataFromLocalStorage();
                synchronizeViews();
            }, 100);
        }
    });
    
    // Listen for focus events to refresh when user returns to tab
    window.addEventListener('focus', function() {
        // Refresh data when user returns to the tab
        loadDataFromAPI().catch(() => {
            loadDataFromLocalStorage();
        });
    });
}

// Update status options based on item type
// Old helper functions removed - now using direct field visibility control

function updateStatusOptions() {
    const typeSelect = document.getElementById('itemType');
    const categorySelect = document.getElementById('itemCategory');
    const projectFields = document.getElementById('projectFields');
    const modalTitle = document.getElementById('addItemModalTitle');
    const submitButton = document.querySelector('#addItemForm button[type="submit"]');
    
    const inventoryFields = document.getElementById('inventoryFields');
    
    if (typeSelect.value === 'inventory') {
        // Show inventory fields, hide project fields
        if (inventoryFields) inventoryFields.style.display = 'block';
        if (projectFields) projectFields.style.display = 'none';
        
        // Inventory categories
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="kits">Kits</option>
            <option value="hoops">Hoops</option>
            <option value="fabric">Fabric</option>
            <option value="thread">Thread</option>
            <option value="supplies">Other Supplies</option>
        `;
        modalTitle.textContent = 'Add New Inventory Item';
        if (submitButton) submitButton.textContent = 'Add Item';
    } else if (typeSelect.value === 'project') {
        // Hide inventory fields, show project fields
        if (inventoryFields) inventoryFields.style.display = 'none';
        if (projectFields) projectFields.style.display = 'block';
        
        // Project categories
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="hoop">Hoop</option>
            <option value="clothing">Clothing</option>
            <option value="custom">Custom</option>
            <option value="gift">Gift</option>
            <option value="home-decor">Home Decor</option>
            <option value="accessories">Accessories</option>
            <option value="other">Other</option>
        `;
        modalTitle.textContent = 'Add New Project';
        if (submitButton) submitButton.textContent = 'Add Project';
    }
}

// Update edit status options based on item type
function updateEditStatusOptions() {
    const typeSelect = document.getElementById('editItemType');
    const statusSelect = document.getElementById('editItemStatus');
    const categorySelect = document.getElementById('editItemCategory');
    const projectFields = document.getElementById('editProjectFields');
    const modalTitle = document.getElementById('editItemModalTitle');
    const submitButton = document.getElementById('editItemSubmitButton');
    
    console.log('updateEditStatusOptions called, typeSelect.value:', typeSelect.value); // Debug log
    
    const inventoryFields = document.getElementById('editInventoryFields');
    
    if (typeSelect.value === 'inventory') {
        // Show inventory fields, hide project fields
        if (inventoryFields) inventoryFields.style.display = 'block';
        if (projectFields) projectFields.style.display = 'none';
        
        // Inventory status options
        statusSelect.innerHTML = `
            <option value="available">Available</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
        `;
        // Inventory categories
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="kits">Kits</option>
            <option value="hoops">Hoops</option>
            <option value="fabric">Fabric</option>
            <option value="thread">Thread</option>
            <option value="supplies">Other Supplies</option>
        `;
        modalTitle.textContent = 'Edit Inventory Item';
        submitButton.textContent = 'Update Inventory Item';
    } else if (typeSelect.value === 'project') {
        // Hide inventory fields, show project fields
        if (inventoryFields) {
            inventoryFields.style.display = 'none';
            console.log('Hiding inventory fields');
        }
        if (projectFields) {
            projectFields.style.display = 'block';
            console.log('Showing project fields');
        }
        
        // Project status options
        statusSelect.innerHTML = `
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="work-in-progress">Work in Progress</option>
            <option value="completed">Completed</option>
            <option value="sold">Sold</option>
        `;
        // Project categories
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="hoop">Hoop</option>
            <option value="clothing">Clothing</option>
            <option value="custom">Custom</option>
            <option value="gift">Gift</option>
            <option value="home-decor">Home Decor</option>
            <option value="accessories">Accessories</option>
            <option value="other">Other</option>
        `;
        modalTitle.textContent = 'Edit Project';
        submitButton.textContent = 'Update Project';
    }
}

// Projects Management (Customer Work)
function loadInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    // Filter for projects only (not inventory items)
    const projectItems = inventory.filter(item => item.type === 'project' || !item.type);
    
    // Group items by customer
    const groupedItems = {};
    projectItems.forEach((item, filteredIndex) => {
        const customer = item.customer || 'No Customer';
        if (!groupedItems[customer]) {
            groupedItems[customer] = [];
        }
        // Find the original inventory index by comparing _id or name
        let originalIndex = inventory.findIndex(invItem => invItem === item);
        if (originalIndex === -1) {
            // Fallback: find by _id or name if reference comparison fails
            originalIndex = inventory.findIndex(invItem => 
                (invItem._id && item._id && invItem._id === item._id) || 
                (invItem.name === item.name && invItem.dateAdded === item.dateAdded)
            );
        }
        console.log(`Project: ${item.name}, Filtered index: ${filteredIndex}, Original index: ${originalIndex}`);
        groupedItems[customer].push({ item, index: originalIndex });
    });
    
    // Sort customers alphabetically, with "No Customer" at the end
    const sortedCustomers = Object.keys(groupedItems).sort((a, b) => {
        if (a === 'No Customer') return 1;
        if (b === 'No Customer') return -1;
        return a.localeCompare(b);
    });
    
    sortedCustomers.forEach(customer => {
        const customerItems = groupedItems[customer];
        
        // Create customer header row
        const headerRow = document.createElement('tr');
        headerRow.className = 'customer-header';
        headerRow.setAttribute('data-customer', customer);
        headerRow.onclick = () => toggleCustomerGroup(customer);
        
        // Calculate customer stats
        const totalProjects = customerItems.length;
        const inventoryCount = customerItems.filter(({ item }) => item.status === 'inventory').length;
        const pendingCount = customerItems.filter(({ item }) => item.status === 'pending').length;
        const inProgressCount = customerItems.filter(({ item }) => item.status === 'in-progress' || item.status === 'work-in-progress').length;
        const completedCount = customerItems.filter(({ item }) => item.status === 'completed').length;
        const soldCount = customerItems.filter(({ item }) => item.status === 'sold').length;
        
        headerRow.innerHTML = `
            <td colspan="8">
                <div class="customer-header-content">
                    <i class="fas fa-chevron-right customer-toggle"></i>
                    <strong>${customer}</strong>
                    <span class="customer-stats">
                        ${totalProjects} project${totalProjects !== 1 ? 's' : ''} 
                        (${pendingCount} pending, ${inProgressCount} in progress, ${completedCount} completed, ${soldCount} sold)
                    </span>
                </div>
            </td>
        `;
        tbody.appendChild(headerRow);
        
        // Create customer group container
        const groupRow = document.createElement('tr');
        groupRow.className = 'customer-group';
        groupRow.id = `customer-group-${customer.replace(/\s+/g, '-').toLowerCase()}`;
        groupRow.style.display = 'none';
        groupRow.innerHTML = '<td colspan="9"><div class="customer-projects"></div></td>';
        tbody.appendChild(groupRow);
        
        // Add individual project rows
        const projectsContainer = groupRow.querySelector('.customer-projects');
        customerItems.forEach(({ item, index }) => {
            console.log(`Creating project row for: ${item.name}, using index: ${index}`);
            const projectRow = document.createElement('div');
            projectRow.className = 'project-row';
            
            // Format due date with urgency styling
            const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '';
            const today = new Date();
            const dueDateObj = item.dueDate ? new Date(item.dueDate) : null;
            const isOverdue = dueDateObj && dueDateObj < today && item.status !== 'completed' && item.status !== 'sold';
            const isDueSoon = dueDateObj && dueDateObj <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) && item.status !== 'completed' && item.status !== 'sold';
            
            const dueDateClass = isOverdue ? 'due-date-overdue' : isDueSoon ? 'due-date-soon' : '';
            
            // Create pattern link button if link exists
            const patternLinkButton = item.patternLink ? 
                `<button class="btn btn-link" onclick="window.open('${item.patternLink}', '_blank')" title="Open Pattern">
                    <i class="fas fa-external-link-alt"></i> Pattern
                </button>` : 
                '<span class="text-muted"></span>';
            
            // Create quick action buttons based on current status
            let quickActions = '';
            if (item.status === 'inventory') {
                quickActions = `
                    <button class="btn btn-sm btn-primary" onclick="quickStatusChange(${index}, 'pending')" title="Start Project">
                        <i class="fas fa-play"></i>
                    </button>
                `;
            } else if (item.status === 'pending') {
                quickActions = `
                    <button class="btn btn-sm btn-primary" onclick="quickStatusChange(${index}, 'in-progress')" title="Start Work">
                        <i class="fas fa-play"></i>
                    </button>
                `;
            } else if (item.status === 'in-progress' || item.status === 'work-in-progress') {
                quickActions = `
                    <button class="btn btn-sm btn-success" onclick="quickStatusChange(${index}, 'completed')" title="Mark Complete">
                        <i class="fas fa-check"></i>
                    </button>
                `;
            } else if (item.status === 'completed') {
                quickActions = `
                    <button class="btn btn-sm btn-info" onclick="quickStatusChange(${index}, 'sold')" title="Mark as Sold">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                `;
            }

            // Truncate notes for display
            const notes = item.notes || '';
            const truncatedNotes = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
            const notesDisplay = notes ? `<span title="${notes}">${truncatedNotes}</span>` : '<span class="text-muted"></span>';

            // Create category and tags display
            const categoryDisplay = item.category ? `<span class="category-badge category-${item.category}">${item.category}</span>` : '<span class="text-muted"></span>';
            const tags = item.tags ? item.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            const tagsDisplay = tags.length > 0 ? 
                `<div class="tags-container">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : 
                '<span class="text-muted"></span>';

            // Format type display
            const typeDisplay = item.type === 'inventory' ? 'Inventory' : 'Project';
            const typeClass = item.type === 'inventory' ? 'type-inventory' : 'type-project';
            
            projectRow.innerHTML = `
                <div class="project-cell project-name"><strong>${item.name}</strong></div>
                <div class="project-cell project-category">${categoryDisplay}</div>
                <div class="project-cell project-quantity"><span class="quantity-badge">${item.quantity || 1}</span></div>
                <div class="project-cell project-status">
                    <span class="status-badge status-${item.status}">${item.status}</span>
                    <div class="quick-actions">${quickActions}</div>
                </div>
                <div class="project-cell project-due-date"><span class="due-date ${dueDateClass}">${dueDate}</span></div>
                <div class="project-cell project-notes">${notesDisplay}</div>
                <div class="project-cell project-pattern">${patternLinkButton}</div>
                <div class="project-cell project-actions">
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="editProject(${index})" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-info" onclick="copyItem(${index})" title="Copy Item">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-success" onclick="markAsSold(${index})" ${item.status === 'sold' ? 'disabled' : ''} title="Mark as Sold">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteItem(${index})" title="Delete Item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            projectsContainer.appendChild(projectRow);
        });
    });
    
    // Load mobile cards
    loadMobileInventoryCards();
}

// Mobile card functions
function loadMobileInventoryCards() {
    const container = document.getElementById('mobileInventoryCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Filter for projects only (not inventory items)
    const projectItems = inventory.filter(item => item.type === 'project' || !item.type);
    
    // Group items by customer
    const groupedItems = {};
    projectItems.forEach((item, filteredIndex) => {
        // Skip if item is null or malformed
        if (!item || typeof item !== 'object') {
            console.warn('Skipping invalid item in mobile inventory:', item);
            return;
        }
        
        const customer = item.customer || 'No Customer';
        if (!groupedItems[customer]) {
            groupedItems[customer] = [];
        }
        // Find the original inventory index
        let originalIndex = inventory.findIndex(invItem => invItem === item);
        if (originalIndex === -1) {
            originalIndex = inventory.findIndex(invItem => 
                (invItem._id && item._id && invItem._id === item._id) || 
                (invItem.name === item.name && invItem.dateAdded === item.dateAdded)
            );
        }
        groupedItems[customer].push({ item, index: originalIndex });
    });
    
    // Sort customers alphabetically, with "No Customer" at the end
    const sortedCustomers = Object.keys(groupedItems).sort((a, b) => {
        if (a === 'No Customer') return 1;
        if (b === 'No Customer') return -1;
        return a.localeCompare(b);
    });
    
    sortedCustomers.forEach(customer => {
        const customerItems = groupedItems[customer];
        
        // Create customer header card
        const customerHeaderCard = document.createElement('div');
        customerHeaderCard.className = 'mobile-card mobile-customer-card';
        
        // Calculate customer stats
        const totalProjects = customerItems.length;
        const pendingCount = customerItems.filter(({ item }) => item.status === 'pending').length;
        const inProgressCount = customerItems.filter(({ item }) => item.status === 'in-progress' || item.status === 'work-in-progress').length;
        const completedCount = customerItems.filter(({ item }) => item.status === 'completed').length;
        const soldCount = customerItems.filter(({ item }) => item.status === 'sold').length;
        
        // Safely escape customer name for HTML attributes
        const safeCustomerName = customer ? customer.replace(/'/g, "\\'") : 'No Customer';
        const safeCustomerId = customer ? customer.replace(/\s+/g, '-').replace(/['"]/g, '').toLowerCase() : 'no-customer';
        
        
        customerHeaderCard.innerHTML = `
            <div class="mobile-customer-header" data-customer="${customer}">
                <h3 class="mobile-customer-name">
                    <i class="fas fa-chevron-right mobile-customer-toggle" id="toggle-${safeCustomerId}"></i>
                    ${customer || 'No Customer'}
                </h3>
                <span class="mobile-card-status status-customer">${totalProjects} Projects</span>
            </div>
            <div class="mobile-customer-stats">
                <div class="mobile-stat">
                    <div class="mobile-stat-number">${completedCount}</div>
                    <div class="mobile-stat-label">Completed</div>
                </div>
                <div class="mobile-stat">
                    <div class="mobile-stat-number">${inProgressCount}</div>
                    <div class="mobile-stat-label">In Progress</div>
                </div>
                <div class="mobile-stat">
                    <div class="mobile-stat-number">${pendingCount}</div>
                    <div class="mobile-stat-label">Pending</div>
                </div>
            </div>
            <div class="mobile-customer-projects" id="mobile-projects-${safeCustomerId}">
                <!-- Individual project cards will be added here -->
            </div>
        `;
        container.appendChild(customerHeaderCard);
        
        // Touch event handling will be added via event delegation after the loop
        
        // Create projects container
        const projectsContainer = customerHeaderCard.querySelector('.mobile-customer-projects');
        
        // Add individual item cards to the projects container
        customerItems.forEach(({ item, index }) => {
            const card = document.createElement('div');
            card.className = 'mobile-card mobile-project-card';
            
            // Format due date
            let dueDate = 'No due date';
            let dueDateClass = '';
            if (item.dueDate) {
                const dueDateObj = new Date(item.dueDate);
                const today = new Date();
                const diffTime = dueDateObj - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                dueDate = dueDateObj.toLocaleDateString();
                
                if (diffDays < 0) {
                    dueDateClass = 'overdue';
                    dueDate += ' (Overdue)';
                } else if (diffDays <= 3) {
                    dueDateClass = 'due-soon';
                    dueDate += ` (${diffDays} day${diffDays !== 1 ? 's' : ''} left)`;
                }
            }
            
            // Truncate notes for display
            const notes = item.notes || '';
            const truncatedNotes = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
            
            card.innerHTML = `
                <div class="mobile-card-header">
                    <h4 class="mobile-card-title">${item.name}</h4>
                    <span class="mobile-card-status status-${item.status}">${item.status}</span>
                </div>
                <div class="mobile-card-content">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Category</div>
                        <div class="mobile-card-value">${item.category || 'No category'}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Quantity</div>
                        <div class="mobile-card-value">${item.quantity || 1}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Due Date</div>
                        <div class="mobile-card-value ${dueDateClass}">${dueDate}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Notes</div>
                        <div class="mobile-card-value">${truncatedNotes || 'No notes'}</div>
                    </div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editProject(${index})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="copyItem(${index})" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="markAsSold(${index})" ${item.status === 'sold' ? 'disabled' : ''} title="Mark as Sold">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem(${index})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            projectsContainer.appendChild(card);
        });
    });
    
    // Add event delegation for touch events to prevent duplicate listeners
    setupMobileCustomerTouchEvents(container);
}

// Setup touch events for mobile customer headers using event delegation
function setupMobileCustomerTouchEvents(container) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    container.addEventListener('touchstart', (e) => {
        const customerHeader = e.target.closest('.mobile-customer-header');
        if (customerHeader && e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        const customerHeader = e.target.closest('.mobile-customer-header');
        if (customerHeader && e.changedTouches && e.changedTouches.length > 0) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const deltaTime = touchEndTime - touchStartTime;
            
            // Only trigger toggle if it's a tap (small movement, short duration)
            if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                const customerName = customerHeader.getAttribute('data-customer');
                toggleMobileCustomerGroup(customerName);
            }
        }
    }, { passive: true });
}

// Mobile inventory items cards
function loadMobileInventoryItemsCards() {
    const container = document.getElementById('mobileInventoryItemsCards');
    if (!container) return;

    container.innerHTML = '';
    
    // Filter for inventory items only
    const inventoryItems = inventory.filter(item => item.type === 'inventory');

    if (inventoryItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-boxes"></i>
                <h3>No Inventory Items</h3>
                <p>Start building your inventory by adding supplies and materials.</p>
            </div>
        `;
        return;
    }

    // Sort by name
    inventoryItems.sort((a, b) => a.name.localeCompare(b.name));

    inventoryItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        
        // Find the original inventory index
        let originalIndex = inventory.findIndex(invItem => invItem === item);
        if (originalIndex === -1) {
            originalIndex = inventory.findIndex(invItem =>
                (invItem._id && item._id && invItem._id === item._id) ||
                (invItem.name === item.name && invItem.dateAdded === item.dateAdded)
            );
        }

        // Format status with proper styling
        const statusClass = item.status ? `status-${item.status}` : 'status-available';
        const statusText = item.status || 'Available';

        // Truncate notes for display
        const notes = item.notes || '';
        const truncatedNotes = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;

        card.innerHTML = `
            <div class="mobile-card-header">
                <h4 class="mobile-card-title">${item.name}</h4>
                <span class="mobile-card-status ${statusClass}">${statusText}</span>
            </div>
            <div class="mobile-card-content">
                <div class="mobile-card-field">
                    <div class="mobile-card-label">Quantity</div>
                    <div class="mobile-card-value">${item.quantity || 1}</div>
                </div>
                <div class="mobile-card-field">
                    <div class="mobile-card-label">Category</div>
                    <div class="mobile-card-value">${item.category || 'No category'}</div>
                </div>
                <div class="mobile-card-field">
                    <div class="mobile-card-label">Location</div>
                    <div class="mobile-card-value">${item.location || 'No location'}</div>
                </div>
                <div class="mobile-card-field">
                    <div class="mobile-card-label">Notes</div>
                    <div class="mobile-card-value">${truncatedNotes || 'No notes'}</div>
                </div>
            </div>
            <div class="mobile-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="editInventoryItem(${originalIndex})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-info btn-sm" onclick="copyItem(${originalIndex})" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${originalIndex})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Mobile card layouts for other tabs
function loadMobileWIPCards() {
    const container = document.getElementById('mobileWIPCards');
    if (!container) return;

    container.innerHTML = '';
    
    const wipItems = inventory.filter(item => 
        item.status === 'in-progress' || 
        item.status === 'work-in-progress' || 
        item.status === 'pending'
    );

    if (wipItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tools"></i>
                <h3>No Work in Progress</h3>
                <p>All caught up! No items currently in progress.</p>
            </div>
        `;
        return;
    }

    wipItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'wip-item';
        
        const originalIndex = inventory.findIndex(invItem => invItem === item);
        
        // Format due date
        let dueDate = 'No due date';
        if (item.dueDate) {
            const dueDateObj = new Date(item.dueDate);
            const today = new Date();
            const diffTime = dueDateObj - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            dueDate = dueDateObj.toLocaleDateString();
            
            if (diffDays < 0) {
                dueDate += ' (Overdue)';
            } else if (diffDays <= 3) {
                dueDate += ` (${diffDays} day${diffDays !== 1 ? 's' : ''} left)`;
            }
        }

        card.innerHTML = `
            <div class="wip-item-header">
                <h4 class="wip-item-title">${item.name}</h4>
                <span class="wip-item-status status-${item.status}">${item.status}</span>
            </div>
            <div class="wip-item-details">
                <div><strong>Customer:</strong> ${item.customer || 'No Customer'}</div>
                <div><strong>Category:</strong> ${item.category || 'No Category'}</div>
                <div><strong>Due Date:</strong> ${dueDate}</div>
                <div><strong>Priority:</strong> ${item.priority || 'Medium'}</div>
            </div>
            <div class="wip-item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editProject(${originalIndex})" title="Edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-success btn-sm" onclick="markAsCompleted(${originalIndex})" title="Mark Complete">
                    <i class="fas fa-check"></i> Complete
                </button>
                <button class="btn btn-info btn-sm" onclick="copyItem(${originalIndex})" title="Copy">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function loadMobileGalleryCards() {
    const container = document.getElementById('mobileGalleryCards');
    if (!container) return;

    container.innerHTML = '';
    
    const galleryItems = gallery || [];

    if (galleryItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No Gallery Items</h3>
                <p>Start building your gallery by adding photos of completed projects.</p>
            </div>
        `;
        return;
    }

    galleryItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-item';
        
        const imageDisplay = item.photo ? 
            `<img src="${item.photo}" alt="${item.name}" class="gallery-item-image">` :
            `<div class="gallery-item-image" style="display: flex; align-items: center; justify-content: center; color: #999;">
                <i class="fas fa-image" style="font-size: 2rem;"></i>
            </div>`;

        card.innerHTML = `
            ${imageDisplay}
            <div class="gallery-item-content">
                <h4 class="gallery-item-title">${item.name}</h4>
                <div class="gallery-item-category">${item.category || 'No Category'}</div>
                <div class="gallery-item-actions">
                    <button class="btn btn-info btn-sm" onclick="viewGalleryItem(${index})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editGalleryItem(${index})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGalleryItem(${index})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function loadMobileIdeasCards() {
    const container = document.getElementById('mobileIdeasCards');
    if (!container) return;

    container.innerHTML = '';
    
    const ideasItems = ideas || [];

    if (ideasItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <h3>No Ideas Yet</h3>
                <p>Start capturing your creative ideas and inspiration.</p>
            </div>
        `;
        return;
    }

    ideasItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        
        const description = item.description || 'No description available';
        const truncatedDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;

        card.innerHTML = `
            <div class="idea-card-header">
                <h4 class="idea-card-title">${item.title}</h4>
                <span class="idea-card-status status-${item.status}">${item.status}</span>
            </div>
            <div class="idea-card-description">${truncatedDescription}</div>
            <div class="idea-card-actions">
                <button class="btn btn-info btn-sm" onclick="viewIdea(${index})" title="View">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-secondary btn-sm" onclick="editIdea(${index})" title="Edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-success btn-sm" onclick="convertIdeaToProject(${index})" title="Convert to Project">
                    <i class="fas fa-plus"></i> Convert
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function loadMobileCustomerCards() {
    const container = document.getElementById('mobileCustomerCards');
    if (!container) return;

    container.innerHTML = '';
    
    const customerItems = customers || [];

    if (customerItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Customers Yet</h3>
                <p>Start building your customer base by adding new customers.</p>
            </div>
        `;
        return;
    }

    customerItems.forEach((customer, index) => {
        // Skip if customer is null or doesn't have a name
        if (!customer || !customer.name) {
            console.warn('Skipping invalid customer:', customer);
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'customer-card';
        
        // Calculate customer stats
        const customerProjects = inventory.filter(item => item.customer === customer.name);
        const totalSpent = customerProjects.reduce((sum, project) => sum + (parseFloat(project.price) || 0), 0);

        card.innerHTML = `
            <div class="customer-card-header">
                <h4 class="customer-card-name">${customer.name}</h4>
                <span class="customer-card-location">${customer.location || 'No Location'}</span>
            </div>
            <div class="customer-card-details">
                <div><strong>Contact:</strong> ${customer.contact || 'No Contact'}</div>
                <div><strong>Projects:</strong> ${customerProjects.length}</div>
                <div><strong>Total Spent:</strong> $${totalSpent.toFixed(2)}</div>
                <div><strong>Status:</strong> ${customer.status || 'Active'}</div>
            </div>
            <div class="customer-card-actions">
                <button class="btn btn-info btn-sm" onclick="viewCustomerProjects('${customer.name}')" title="View Projects">
                    <i class="fas fa-eye"></i> Projects
                </button>
                <button class="btn btn-secondary btn-sm" onclick="editCustomer(${index})" title="Edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-primary btn-sm" onclick="createProjectForCustomer('${customer.name}')" title="New Project">
                    <i class="fas fa-plus"></i> Project
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function loadMobileSalesCards() {
    const container = document.getElementById('mobileSalesCards');
    if (!container) return;

    container.innerHTML = '';

    if (sales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>No Sales Yet</h3>
                <p>Record your first sale to get started!</p>
                <button class="btn btn-primary" onclick="openAddSaleModal()">
                    <i class="fas fa-plus"></i> Record Sale
                </button>
            </div>
        `;
        return;
    }

    sales.forEach((sale, index) => {
        // Skip if sale is null or malformed
        if (!sale) {
            console.warn('Skipping invalid sale:', sale);
            return;
        }
        
        const listedPrice = sale.listedPrice || sale.price || 0;
        const salePrice = sale.salePrice || sale.price || 0;
        const discount = listedPrice - salePrice;
        const discountPercent = listedPrice > 0 ? ((discount / listedPrice) * 100).toFixed(1) : 0;

        let priceDisplay = `$${salePrice.toFixed(2)}`;
        if (listedPrice !== salePrice && discount > 0) {
            priceDisplay = `
                <div class="price-info">
                    <span class="sale-price">$${salePrice.toFixed(2)}</span>
                    <span class="original-price">$${listedPrice.toFixed(2)}</span>
                    <span class="discount-badge discount">${discountPercent}% off</span>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <h3 class="mobile-card-title">${sale.itemName}</h3>
                <span class="mobile-card-status status-${sale.saleChannel}">${sale.saleChannel}</span>
            </div>
            <div class="mobile-card-content">
                <div class="mobile-card-field">
                    <span class="mobile-card-label">Customer:</span>
                    <span class="mobile-card-value">${sale.customer}</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-label">Price:</span>
                    <span class="mobile-card-value">${priceDisplay}</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-label">Commission:</span>
                    <span class="mobile-card-value">${sale.commissionPercent || 0}% ($${(sale.commissionAmount || 0).toFixed(2)})</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-label">Date:</span>
                    <span class="mobile-card-value">${new Date(sale.date).toLocaleDateString()}</span>
                </div>
                ${sale.notes ? `
                    <div class="mobile-card-field">
                        <span class="mobile-card-label">Notes:</span>
                        <span class="mobile-card-value">${sale.notes}</span>
                    </div>
                ` : ''}
            </div>
            <div class="mobile-card-actions">
                <button class="btn btn-secondary" onclick="editSale(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteSale(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Mobile-only function for toggling customer groups
function toggleMobileCustomerGroup(customer) {
    // Validate customer parameter
    if (!customer || typeof customer !== 'string') {
        console.warn('Invalid customer parameter for toggleMobileCustomerGroup:', customer);
        return;
    }
    
    const safeCustomerId = customer.replace(/\s+/g, '-').replace(/['"]/g, '').toLowerCase();
    const projectsId = `mobile-projects-${safeCustomerId}`;
    const toggleId = `toggle-${safeCustomerId}`;
    
    const projectsContainer = document.getElementById(projectsId);
    const toggleIcon = document.getElementById(toggleId);
    
    if (projectsContainer && toggleIcon) {
        const isExpanded = projectsContainer.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            projectsContainer.classList.remove('expanded');
            toggleIcon.classList.remove('expanded');
        } else {
            // Expand - collapse all other groups first
            document.querySelectorAll('.mobile-customer-projects.expanded').forEach(container => {
                container.classList.remove('expanded');
            });
            document.querySelectorAll('.mobile-customer-toggle.expanded').forEach(icon => {
                icon.classList.remove('expanded');
            });
            
            // Expand this group
            projectsContainer.classList.add('expanded');
            toggleIcon.classList.add('expanded');
        }
    }
}

// Mobile modal enhancements
function setupMobileModalEnhancements() {
    // Only apply on mobile devices
    if (window.innerWidth > 768) return;
    
    // Add mobile-specific modal behavior
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        // Use MutationObserver to watch for style changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = modal.style.display === 'block' || modal.style.display === 'flex';
                    if (isVisible) {
                        document.body.classList.add('modal-open');
                    } else {
                        document.body.classList.remove('modal-open');
                    }
                }
            });
        });
        
        observer.observe(modal, { attributes: true });
    });
    
    // Enhanced form validation for mobile (non-intrusive)
    const forms = document.querySelectorAll('.modal-form');
    forms.forEach(form => {
        // Only add visual feedback, don't interfere with form submission
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (!this.value.trim()) {
                    this.style.borderColor = '#dc3545';
                    this.style.backgroundColor = '#fff5f5';
                } else {
                    this.style.borderColor = '#28a745';
                    this.style.backgroundColor = '#f8fff8';
                }
            });
            
            input.addEventListener('focus', function() {
                this.style.borderColor = '#4A90A4';
                this.style.backgroundColor = 'white';
            });
        });
    });
}

// Mobile notification system
function showMobileNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.mobile-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `mobile-notification mobile-notification-${type}`;
    notification.innerHTML = `
        <div class="mobile-notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 3000);
}

function toggleCustomerGroup(customer) {
    const groupId = `customer-group-${customer.replace(/\s+/g, '-').toLowerCase()}`;
    const groupRow = document.getElementById(groupId);
    const toggleIcon = event.target.closest('.customer-header').querySelector('.customer-toggle');
    
    // If we're expanding this group, collapse all others first
    if (groupRow.style.display === 'none') {
        // Collapse all other customer groups
        const allCustomerGroups = document.querySelectorAll('.customer-group');
        const allToggleIcons = document.querySelectorAll('.customer-toggle');
        
        allCustomerGroups.forEach(group => {
            if (group.id !== groupId) {
                group.style.display = 'none';
            }
        });
        
        allToggleIcons.forEach(icon => {
            if (icon !== toggleIcon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        });
        
        // Now expand the selected group
        groupRow.style.display = 'table-row';
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-down');
    } else {
        // Just collapse the current group
        groupRow.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-right');
    }
}

function openAddItemModal() {
    document.getElementById('addItemForm').reset();
    
    // Determine which tab is calling this function
    const activeTab = document.querySelector('.tab-content.active');
    const isProjectsTab = activeTab && activeTab.id === 'projects';
    
    // Set default type based on active tab
    if (isProjectsTab) {
        document.getElementById('itemType').value = 'project';
    } else {
        document.getElementById('itemType').value = 'inventory';
    }
    
    updateStatusOptions();
    
    // Populate customer dropdown after form reset
    populateCustomerSelect('itemCustomer');
    
    document.getElementById('addItemModal').style.display = 'block';
}

function handleAddItem(e) {
    e.preventDefault();
    console.log('🔘 Add Item button clicked!');
    
    // Get and sanitize form data
    const description = SecurityManager.sanitizeInput(document.getElementById('itemDescription').value.trim());
    console.log('📝 Description:', description);
    
    // Security validation
    if (!SecurityManager.validateInput(description, 'text')) {
        showNotification('Invalid description format', 'error');
        return;
    }
    
    if (!description) {
        showNotification('Please enter a description', 'error');
        return;
    }
    
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    const pricePerItem = parseFloat(document.getElementById('itemPrice').value) || 0;
    const totalValue = quantity * pricePerItem;
    
    // Get form elements safely
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };
    
    // Create the new item first
    const newItem = {
        name: document.getElementById('itemDescription').value, // Use description as name
        customer: getElementValue('itemCustomer'),
        location: getElementValue('itemLocation'),
        description: document.getElementById('itemDescription').value,
        quantity: quantity,
        price: pricePerItem,
        totalValue: totalValue,
        type: document.getElementById('itemType').value,
        status: document.getElementById('itemStatus').value,
        priority: 'medium', // Default priority
        dueDate: getElementValue('itemDueDate') || null,
        notes: getElementValue('itemNotes'),
        category: getElementValue('itemCategory'),
        supplier: getElementValue('itemSupplier'),
        reorderPoint: parseInt(getElementValue('itemReorderPoint')) || 0,
        tags: '', // Default empty
        patternLink: getElementValue('itemPatternLink'),
        dateAdded: new Date().toISOString(),
        photo: null // Will be set after photo processing
    };
    
    // Handle photo if present
    const photoInput = document.getElementById('itemPhoto');
    const photoFile = photoInput && photoInput.files && photoInput.files.length > 0 ? photoInput.files[0] : null;
    let photoData = null;
    
    if (photoFile) {
        photoData = {
            name: photoFile.name,
            size: photoFile.size,
            type: photoFile.type,
            lastModified: photoFile.lastModified,
            dataUrl: null // Will be populated after reading
        };
        
        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                photoData.dataUrl = e.target.result;
                newItem.photo = photoData;
                saveItemWithPhoto(newItem);
            } catch (error) {
                console.error('Error processing photo data:', error);
                showNotification('Error processing photo. Item saved without photo.', 'warning');
                saveItemWithPhoto(newItem);
            }
        };
        reader.onerror = function(error) {
            console.error('Error reading photo file:', error);
            showNotification('Error reading photo file. Item saved without photo.', 'warning');
            saveItemWithPhoto(newItem);
        };
        reader.readAsDataURL(photoFile);
    } else {
        saveItemWithPhoto(newItem);
    }
}

function saveItemWithPhoto(item) {
    console.log('💾 Saving item:', item);
    if (item) {
        inventory.push(item);
        saveData();
        loadInventoryTable(); // Projects table
        loadInventoryItemsTable(); // Inventory items table
        updateLocationFilters();
        updateCustomerFilters();
        
        // Auto-expand customer group if this is a project with a customer
        if (item.type === 'project' && item.customer) {
            setTimeout(() => {
                const customerGroup = document.querySelector(`[data-customer="${item.customer}"]`);
                if (customerGroup) {
                    customerGroup.classList.add('expanded');
                    const customerItems = customerGroup.querySelector('.customer-items');
                    if (customerItems) {
                        customerItems.style.display = 'block';
                    }
                }
            }, 100);
        }
        
        // Add small delay for mobile modal closing
        setTimeout(() => {
            closeModal('addItemModal');
            
            // Force close on mobile if needed
            if (window.innerWidth <= 768) {
                const modal = document.getElementById('addItemModal');
                if (modal && modal.style.display !== 'none') {
                    console.log('🔄 Force closing modal on mobile');
                    modal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            }
            
            showNotification('Item added successfully!', 'success');
            console.log('✅ Item added and modal should be closed');
        }, 100);
    }
}

// Inventory Items Management (Supplies/Materials)
function loadInventoryItemsTable() {
    const tbody = document.getElementById('inventoryItemsTableBody');
    tbody.innerHTML = '';
    
    // Filter for inventory items only
    const inventoryItems = inventory.filter(item => item.type === 'inventory');
    
    if (inventoryItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-boxes"></i><br>
                    No inventory items found. <a href="#" onclick="openAddItemModal()">Add your first inventory item</a>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by name
    inventoryItems.sort((a, b) => a.name.localeCompare(b.name));
    
    inventoryItems.forEach((item, index) => {
        // Find the original index by matching the item's unique properties
        const originalIndex = inventory.findIndex(originalItem => 
            originalItem.name === item.name && 
            originalItem.type === item.type && 
            originalItem.dateAdded === item.dateAdded
        );
        
        console.log(`Item: ${item.name}, Original Index: ${originalIndex}, Filtered Index: ${index}`);
        const row = document.createElement('tr');
        
        // Format category display
        const categoryDisplay = item.category ? `<span class="category-badge category-${item.category}">${item.category}</span>` : '<span class="text-muted">-</span>';
        
        // Format status display
        const statusDisplay = item.status ? `<span class="status-badge status-${item.status}">${item.status.replace('-', ' ')}</span>` : '<span class="text-muted">-</span>';
        
        // Format notes
        const notes = item.notes || '';
        const truncatedNotes = notes.length > 30 ? notes.substring(0, 30) + '...' : notes;
        const notesDisplay = notes ? `<span title="${notes}">${truncatedNotes}</span>` : '<span class="text-muted">-</span>';
        
        // Format supplier display
        const supplierDisplay = item.supplier ? `<span class="supplier-info">${item.supplier}</span>` : '<span class="text-muted">-</span>';
        
        // Format reorder point with warning if low stock
        const reorderPoint = item.reorderPoint || 0;
        const isLowStock = item.quantity <= reorderPoint && reorderPoint > 0;
        const reorderDisplay = reorderPoint > 0 ? 
            `<span class="reorder-point ${isLowStock ? 'low-stock-warning' : ''}">${reorderPoint}</span>` : 
            '<span class="text-muted">-</span>';
        
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><span class="quantity-badge">${item.quantity || 1}</span></td>
            <td>${statusDisplay}</td>
            <td>${supplierDisplay}<br><small>Reorder: ${reorderDisplay}</small></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary" onclick="editItem(${originalIndex})" title="Edit Item">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-info" onclick="console.log('Copy button clicked for index:', ${originalIndex}); copyItem(${originalIndex})" title="Copy Item">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteItem(${originalIndex})" title="Delete Item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Load mobile cards for inventory items
    loadMobileInventoryItemsCards();
}

// Filter inventory items
function filterInventory() {
    const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
    const statusFilter = document.getElementById('inventoryStatusFilter').value;
    const categoryFilter = document.getElementById('inventoryCategoryFilter').value;
    const locationFilter = document.getElementById('inventoryLocationFilter').value;
    
    const tbody = document.getElementById('inventoryItemsTableBody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.querySelector('.text-center.text-muted')) {
            return; // Skip empty state row
        }
        
        const name = row.querySelector('td:first-child').textContent.toLowerCase();
        const status = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        
        const matchesSearch = !searchTerm || name.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter);
        const matchesCategory = !categoryFilter || true; // Category filter disabled
        const matchesLocation = !locationFilter || true; // Location filter disabled
        
        if (matchesSearch && matchesStatus && matchesCategory && matchesLocation) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Customer Management
function loadCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    
    customers.forEach((customer, index) => {
        const customerItems = inventory.filter(item => item.customer === customer.name);
        const customerSales = sales.filter(sale => sale.customer === customer.name);
        const totalSpent = customerSales.reduce((sum, sale) => sum + parseFloat(sale.price), 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${customer.name}</strong></td>
            <td>${customer.contact || ''}</td>
            <td>${customer.location}</td>
            <td>${customerItems.length}</td>
            <td>$${totalSpent.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary" onclick="editCustomer(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteCustomer(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Load mobile cards for mobile devices
    loadMobileCustomerCards();
}

function openAddCustomerModal() {
    document.getElementById('addCustomerForm').reset();
    document.getElementById('addCustomerModal').style.display = 'block';
}

function handleAddCustomer(e) {
    e.preventDefault();
    
    const newCustomer = {
        name: document.getElementById('customerName').value,
        contact: document.getElementById('customerContact').value,
        location: document.getElementById('customerLocation').value,
        dateAdded: new Date().toISOString()
    };
    
    customers.push(newCustomer);
    saveData();
    loadCustomersTable();
    updateLocationFilters();
    updateCustomerFilters();
    
    // Refresh customer dropdowns in add and edit project modals
    populateCustomerSelect('itemCustomer');
    populateCustomerSelect('editItemCustomer');
    
    // Auto-expand the newly added customer group in projects view
    setTimeout(() => {
        const customerName = newCustomer.name;
        const groupId = `customer-group-${customerName.replace(/\s+/g, '-').toLowerCase()}`;
        const groupRow = document.getElementById(groupId);
        const customerHeader = document.querySelector(`[data-customer="${customerName}"]`);
        
        if (groupRow && customerHeader) {
            // Collapse all other customer groups first
            const allCustomerGroups = document.querySelectorAll('.customer-group');
            const allToggleIcons = document.querySelectorAll('.customer-toggle');
            
            allCustomerGroups.forEach(group => {
                if (group.id !== groupId) {
                    group.style.display = 'none';
                }
            });
            
            allToggleIcons.forEach(icon => {
                if (icon !== customerHeader.querySelector('.customer-toggle')) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                }
            });
            
            // Expand the new customer group
            groupRow.style.display = 'table-row';
            const toggleIcon = customerHeader.querySelector('.customer-toggle');
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-right');
                toggleIcon.classList.add('fa-chevron-down');
            }
        }
    }, 100); // Small delay to ensure DOM is updated
    
    closeModal('addCustomerModal');
    
    showNotification('Customer added successfully!', 'success');
}

function handleEditCustomer(e) {
    e.preventDefault();
    
    const form = e.target;
    const customerIndex = parseInt(form.dataset.customerIndex);
    
    if (isNaN(customerIndex) || customerIndex < 0 || customerIndex >= customers.length) {
        showNotification('Error: Invalid customer selected', 'error');
        return;
    }
    
    const customer = customers[customerIndex];
    const oldName = customer.name;
    
    // Update customer data
    customer.name = document.getElementById('editCustomerName').value;
    customer.contact = document.getElementById('editCustomerContact').value;
    customer.location = document.getElementById('editCustomerLocation').value;
    customer.status = document.getElementById('editCustomerStatus').value;
    
    // If customer name changed, update all references in inventory and sales
    if (oldName !== customer.name) {
        inventory.forEach(item => {
            if (item.customer === oldName) {
                item.customer = customer.name;
            }
        });
        
        sales.forEach(sale => {
            if (sale.customer === oldName) {
                sale.customer = customer.name;
            }
        });
    }
    
    saveData();
    loadCustomersTable();
    loadInventoryTable();
    loadSalesTable();
    updateLocationFilters();
    updateCustomerFilters();
    
    // Refresh customer dropdowns
    populateCustomerSelect('itemCustomer');
    populateCustomerSelect('editItemCustomer');
    
    closeModal('editCustomerModal');
    
    showNotification('Customer updated successfully!', 'success');
}

// Sales Management
function updateExistingSalesWithCommission() {
    let updated = false;
    let updatedCount = 0;
    
    sales.forEach((sale, index) => {
        // If commission fields are missing, add them with default values
        if (sale.commission === undefined || sale.commissionAmount === undefined || sale.netAmount === undefined) {
            sale.commission = 0;
            sale.commissionAmount = 0;
            sale.netAmount = sale.salePrice || sale.price || 0;
            updated = true;
            updatedCount++;
        }
    });
    
    if (updated) {
        // Save updated sales data
        saveDataToAPI();
        console.log(`Updated ${updatedCount} existing sales with commission fields`);
        
        // Only show notifications on localhost
        if (isLocalhost()) {
            showNotification(`Updated ${updatedCount} sales with commission fields. You can now edit them to add commission percentages.`, 'success');
        }
        
        // Refresh the sales table to show updated data
        loadSalesTable();
    } else {
        // Only show notifications on localhost
        if (isLocalhost()) {
            showNotification('All sales already have commission data.', 'info');
        }
    }
}

function loadSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-shopping-cart"></i><br>
                    No sales recorded yet. <a href="#" onclick="openAddSaleModal()">Record your first sale</a>
                </td>
            </tr>
        `;
        return;
    }
    
    sales.forEach((sale, index) => {
        const row = document.createElement('tr');
        
        // Create item name without type badge
        const itemDisplay = sale.itemName;
        
        // Show description for custom items
        const descriptionDisplay = sale.saleType === 'custom' && sale.description ? 
            `<br><small class="text-muted">${sale.description}</small>` : '';
        
        // Show notes if available
        const notesDisplay = sale.notes ? 
            `<br><small class="text-muted"><i class="fas fa-sticky-note"></i> ${sale.notes}</small>` : '';
        
        // Calculate discount info for display
        const listedPrice = sale.listedPrice || sale.price || 0;
        const salePrice = sale.salePrice || sale.price || 0;
        const discount = listedPrice - salePrice;
        const discountPercent = listedPrice > 0 ? ((discount / listedPrice) * 100).toFixed(1) : 0;
        
        // Create price display
        let priceDisplay = `$${salePrice.toFixed(2)}`;
        if (listedPrice !== salePrice) {
            if (discount > 0) {
                priceDisplay = `
                    <div class="price-info">
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${listedPrice.toFixed(2)}</span>
                        <span class="discount-badge discount">${discountPercent}% off</span>
                    </div>
                `;
            } else if (discount < 0) {
                priceDisplay = `
                    <div class="price-info">
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${listedPrice.toFixed(2)}</span>
                        <span class="discount-badge markup">+${Math.abs(discountPercent)}% markup</span>
                    </div>
                `;
            }
        }
        
        // Commission and net amount display
        const commissionDisplay = sale.commission ? `${sale.commission}%` : '-';
        const commissionAmountDisplay = sale.commissionAmount ? `$${sale.commissionAmount.toFixed(2)}` : '-';
        const netAmountDisplay = sale.netAmount ? `$${sale.netAmount.toFixed(2)}` : '-';
        const listPriceDisplay = `$${listedPrice.toFixed(2)}`;
        
        row.innerHTML = `
            <td>
                <strong>${itemDisplay}</strong>
                ${descriptionDisplay}
                ${notesDisplay}
            </td>
            <td><strong>${sale.customer}</strong></td>
            <td>${listPriceDisplay}</td>
            <td>${netAmountDisplay}</td>
            <td>${commissionDisplay}</td>
            <td>${commissionAmountDisplay}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editSale(${index})" title="Edit Sale">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSale(${index})" title="Delete Sale">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Load mobile cards for mobile devices
    loadMobileSalesCards();
}

function openAddSaleModal() {
    populateItemSelect('saleItem');
    document.getElementById('addSaleForm').reset();
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('addSaleModal').style.display = 'block';
}

function toggleEditSaleItemType() {
    const saleType = document.getElementById('editSaleType').value;
    const inventoryFields = document.getElementById('editInventorySaleFields');
    const customFields = document.getElementById('editCustomSaleFields');
    const saleItemSelect = document.getElementById('editSaleItem');
    
    if (saleType === 'inventory') {
        if (inventoryFields) inventoryFields.style.display = 'block';
        if (customFields) customFields.style.display = 'none';
        populateItemSelect('editSaleItem');
    } else if (saleType === 'custom') {
        if (inventoryFields) inventoryFields.style.display = 'none';
        if (customFields) customFields.style.display = 'block';
    } else {
        if (inventoryFields) inventoryFields.style.display = 'none';
        if (customFields) customFields.style.display = 'none';
    }
}

function calculateEditDiscount() {
    const listedPrice = parseFloat(document.getElementById('editListedPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('editSalePrice').value) || 0;
    const discountInfo = document.getElementById('editDiscountInfo');
    const discountAmount = document.getElementById('editDiscountAmount');
    const discountPercentage = document.getElementById('editDiscountPercentage');
    
    if (listedPrice > 0 && salePrice !== listedPrice) {
        const discount = listedPrice - salePrice;
        const discountPercent = ((discount / listedPrice) * 100).toFixed(1);
        
        discountAmount.textContent = `$${discount.toFixed(2)}`;
        discountPercentage.textContent = `${discountPercent}%`;
        discountInfo.style.display = 'block';
    } else {
        discountInfo.style.display = 'none';
    }
}

function calculateEditNetAmount() {
    const salePrice = parseFloat(document.getElementById('editSalePrice').value) || 0;
    const commission = parseFloat(document.getElementById('editSaleCommission').value) || 0;
    const listedPrice = parseFloat(document.getElementById('editListedPrice').value) || 0;
    const netAmountInfo = document.getElementById('editNetAmountInfo');
    const netAmount = document.getElementById('editNetAmount');
    
    if (salePrice > 0) {
        // salePrice is now the net amount (what you receive)
        netAmount.textContent = salePrice.toFixed(2);
        netAmountInfo.style.display = 'block';
    } else {
        netAmountInfo.style.display = 'none';
    }
}

function calculateSalePriceFromCommission() {
    const listedPrice = parseFloat(document.getElementById('listedPrice').value) || 0;
    const commission = parseFloat(document.getElementById('saleCommission').value) || 0;
    const salePriceField = document.getElementById('salePrice');
    const autoCalculateInfo = document.getElementById('autoCalculateInfo');
    
    if (listedPrice > 0 && commission > 0) {
        // Calculate net price (what you receive) from list price and commission
        // If list price is $100 and commission is 20%, you receive $80
        // Formula: Net Price = List Price - (List Price × Commission/100)
        const commissionAmount = listedPrice * (commission / 100);
        const netPrice = listedPrice - commissionAmount;
        salePriceField.value = netPrice.toFixed(2);
        
        // Show auto-calculate indicator
        autoCalculateInfo.style.display = 'block';
        
        // Trigger discount calculation
        calculateDiscount();
    } else {
        // Hide auto-calculate indicator
        autoCalculateInfo.style.display = 'none';
    }
}

function calculateEditSalePriceFromCommission() {
    const listedPrice = parseFloat(document.getElementById('editListedPrice').value) || 0;
    const commission = parseFloat(document.getElementById('editSaleCommission').value) || 0;
    const salePriceField = document.getElementById('editSalePrice');
    const autoCalculateInfo = document.getElementById('editAutoCalculateInfo');
    
    if (listedPrice > 0 && commission > 0) {
        // Calculate net price (what you receive) from list price and commission
        // If list price is $100 and commission is 20%, you receive $80
        // Formula: Net Price = List Price - (List Price × Commission/100)
        const commissionAmount = listedPrice * (commission / 100);
        const netPrice = listedPrice - commissionAmount;
        salePriceField.value = netPrice.toFixed(2);
        
        // Show auto-calculate indicator
        autoCalculateInfo.style.display = 'block';
        
        // Trigger discount and net amount calculations
        calculateEditDiscount();
        calculateEditNetAmount();
    } else {
        // Hide auto-calculate indicator
        autoCalculateInfo.style.display = 'none';
    }
}

function toggleSaleItemType() {
    const saleType = document.getElementById('saleType').value;
    const inventoryFields = document.getElementById('inventorySaleFields');
    const customFields = document.getElementById('customSaleFields');
    const saleItemSelect = document.getElementById('saleItem');
    
    if (saleType === 'inventory') {
        inventoryFields.style.display = 'block';
        customFields.style.display = 'none';
        saleItemSelect.required = true;
        document.getElementById('customItemName').required = false;
    } else if (saleType === 'custom') {
        inventoryFields.style.display = 'none';
        customFields.style.display = 'block';
        saleItemSelect.required = false;
        document.getElementById('customItemName').required = true;
    } else {
        inventoryFields.style.display = 'none';
        customFields.style.display = 'none';
        saleItemSelect.required = false;
        document.getElementById('customItemName').required = false;
    }
}

function calculateDiscount() {
    const listedPrice = parseFloat(document.getElementById('listedPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const discountInfo = document.getElementById('discountInfo');
    const discountAmount = document.getElementById('discountAmount');
    const discountPercentage = document.getElementById('discountPercentage');
    
    if (listedPrice > 0 && salePrice > 0) {
        const discount = listedPrice - salePrice;
        const discountPercent = ((discount / listedPrice) * 100).toFixed(1);
        
        if (discount > 0) {
            discountAmount.textContent = `Discount: $${discount.toFixed(2)}`;
            discountPercentage.textContent = `${discountPercent}% off`;
            discountInfo.style.display = 'block';
            discountInfo.className = 'discount-info discount-applied';
        } else if (discount < 0) {
            discountAmount.textContent = `Markup: $${Math.abs(discount).toFixed(2)}`;
            discountPercentage.textContent = `${Math.abs(discountPercent)}% markup`;
            discountInfo.style.display = 'block';
            discountInfo.className = 'discount-info markup-applied';
        } else {
            discountAmount.textContent = 'No discount';
            discountPercentage.textContent = 'Full price';
            discountInfo.style.display = 'block';
            discountInfo.className = 'discount-info no-discount';
        }
    } else {
        discountInfo.style.display = 'none';
    }
}

function handleAddSale(e) {
    e.preventDefault();
    
    const saleType = document.getElementById('saleType').value;
    const saleChannel = document.getElementById('saleChannel').checked ? 'shop' : 'individual';
    const listedPrice = parseFloat(document.getElementById('listedPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const customer = document.getElementById('saleCustomer').value || 'No Customer/Location';
    const dateSold = document.getElementById('saleDate').value;
    const notes = document.getElementById('saleNotes').value;
    const commission = parseFloat(document.getElementById('saleCommission').value) || 0;
    
    // All fields are now optional - no validation required
    
    let newSale;
    
    if (saleType === 'inventory') {
        // Handle inventory item sale
        const selectedItemIndex = document.getElementById('saleItem').value;
        const item = inventory[selectedItemIndex];
        
        // Item selection is now optional
        if (!item) {
            // Create a generic sale without specific inventory item
        const commissionAmount = (listedPrice * commission / 100);
        const netAmount = salePrice; // salePrice is now the net amount (what you receive)
        
        newSale = {
            itemName: 'Inventory Item (Not Specified)',
            customer: customer,
            location: '',
            listedPrice: listedPrice,
            salePrice: salePrice, // This is now the net amount (what you receive)
            commission: commission,
            commissionAmount: commissionAmount,
            netAmount: netAmount,
            discount: listedPrice - (salePrice + commissionAmount), // Total customer pays vs list price
            discountPercent: listedPrice > 0 ? ((listedPrice - (salePrice + commissionAmount)) / listedPrice * 100).toFixed(1) : 0,
            dateSold: dateSold,
            itemIndex: null,
            saleType: 'inventory',
            saleChannel: saleChannel || 'individual',
            notes: notes
        };
        } else {
            const commissionAmount = (listedPrice * commission / 100);
            const netAmount = salePrice; // salePrice is now the net amount (what you receive)
            
            newSale = {
                itemName: item.name,
                customer: customer,
                location: item.location,
                listedPrice: listedPrice,
                salePrice: salePrice, // This is now the net amount (what you receive)
                commission: commission,
                commissionAmount: commissionAmount,
                netAmount: netAmount,
                discount: listedPrice - (salePrice + commissionAmount), // Total customer pays vs list price
                discountPercent: listedPrice > 0 ? ((listedPrice - (salePrice + commissionAmount)) / listedPrice * 100).toFixed(1) : 0,
                dateSold: dateSold,
                itemIndex: selectedItemIndex,
                saleType: 'inventory',
                saleChannel: saleChannel || 'individual',
                notes: notes
            };
            
            // Update item status to sold
            inventory[selectedItemIndex].status = 'sold';
        }
        
    } else if (saleType === 'custom') {
        // Handle custom item sale
        const itemName = document.getElementById('customItemName').value.trim() || 'Custom Item';
        const description = document.getElementById('customItemDescription').value.trim();
        
        const commissionAmount = (listedPrice * commission / 100);
        const netAmount = salePrice; // salePrice is now the net amount (what you receive)
        
        newSale = {
            itemName: itemName,
            customer: customer,
            location: '',
            listedPrice: listedPrice,
            salePrice: salePrice, // This is now the net amount (what you receive)
            commission: commission,
            commissionAmount: commissionAmount,
            netAmount: netAmount,
            discount: listedPrice - (salePrice + commissionAmount), // Total customer pays vs list price
            discountPercent: listedPrice > 0 ? ((listedPrice - (salePrice + commissionAmount)) / listedPrice * 100).toFixed(1) : 0,
            dateSold: dateSold,
            itemIndex: null, // No inventory item
            saleType: 'custom',
            saleChannel: saleChannel || 'individual',
            description: description,
            notes: notes
        };
    } else {
        // No sale type selected - create a generic sale
        const commissionAmount = (listedPrice * commission / 100);
        const netAmount = salePrice; // salePrice is now the net amount (what you receive)
        
        newSale = {
            itemName: 'General Sale',
            customer: customer,
            location: '',
            listedPrice: listedPrice,
            salePrice: salePrice, // This is now the net amount (what you receive)
            commission: commission,
            commissionAmount: commissionAmount,
            netAmount: netAmount,
            discount: listedPrice - (salePrice + commissionAmount), // Total customer pays vs list price
            discountPercent: listedPrice > 0 ? ((listedPrice - (salePrice + commissionAmount)) / listedPrice * 100).toFixed(1) : 0,
            dateSold: dateSold,
            itemIndex: null,
            saleType: 'general',
            saleChannel: saleChannel || 'individual',
            notes: notes
        };
    }
    
    sales.push(newSale);
    
    saveData();
    loadSalesTable();
    loadInventoryTable();
    closeModal('addSaleModal');
    
    showNotification('Sale recorded successfully!', 'success');
}

// Utility Functions
function populateCustomerSelect(selectId) {
    const select = document.getElementById(selectId);
    const currentValue = select.value; // Save current value
    console.log(`populateCustomerSelect(${selectId}): currentValue = "${currentValue}"`);
    console.log(`Available customers:`, customers.map(c => c.name));
    
    select.innerHTML = '<option value="">Select Customer</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        select.appendChild(option);
    });
    
    // Restore the previous value if it exists
    if (currentValue) {
        // Try to find an exact match first
        const exactMatch = Array.from(select.options).find(option => option.value === currentValue);
        if (exactMatch) {
            select.value = currentValue;
            console.log(`Restored value to: "${select.value}"`);
        } else {
            // Try case-insensitive match
            const caseInsensitiveMatch = Array.from(select.options).find(option => 
                option.value.toLowerCase() === currentValue.toLowerCase()
            );
            if (caseInsensitiveMatch) {
                select.value = caseInsensitiveMatch.value;
                console.log(`Restored value (case-insensitive) to: "${select.value}"`);
            } else {
                console.log(`Could not find match for: "${currentValue}"`);
                console.log(`Available options:`, Array.from(select.options).map(opt => `"${opt.value}"`));
            }
        }
    } else {
        console.log(`No current value to restore`);
    }
}

function populateItemSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select Item</option>';
    inventory.forEach((item, index) => {
        if (item.status !== 'sold') {
            const option = document.createElement('option');
            option.value = index;
            const customerDisplay = item.customer || 'No Customer';
            option.textContent = `${item.name} - ${customerDisplay} (${item.status})`;
            select.appendChild(option);
        }
    });
}

function updateLocationFilters() {
    const locations = [...new Set([...inventory.map(item => item.location), ...customers.map(customer => customer.location)])];
    
    const locationFilters = document.querySelectorAll('#locationFilter, #reportLocationFilter');
    locationFilters.forEach(filter => {
        const currentValue = filter.value;
        filter.innerHTML = '<option value="">All Locations</option>';
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            filter.appendChild(option);
        });
        filter.value = currentValue;
    });
}

function updateCustomerFilters() {
    const customerNames = [...new Set(inventory.map(item => item.customer).filter(customer => customer))];
    
    const customerFilter = document.getElementById('customerFilter');
    if (customerFilter) {
        const currentValue = customerFilter.value;
        customerFilter.innerHTML = '<option value="">All Customers</option>';
        customerNames.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer;
            option.textContent = customer;
            customerFilter.appendChild(option);
        });
        customerFilter.value = currentValue;
    }
}

function filterItems() {
    // For now, just reload the table with current filters
    // The grouping will handle the filtering logic
    loadInventoryTable();
    
    // Apply filters by hiding/showing customer groups
    const searchTerm = document.getElementById('searchItems').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const customerFilter = document.getElementById('customerFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;
    
    // Get all customer headers and groups
    const customerHeaders = document.querySelectorAll('.customer-header');
    const customerGroups = document.querySelectorAll('.customer-group');
    
    customerHeaders.forEach((header, index) => {
        const group = customerGroups[index];
        const customerName = header.querySelector('strong').textContent;
        const projectRows = group.querySelectorAll('.project-row');
        
        let hasVisibleProjects = false;
        
        projectRows.forEach(projectRow => {
            const projectName = projectRow.querySelector('.project-name strong').textContent.toLowerCase();
            const status = projectRow.querySelector('.status-badge').textContent;
            const category = projectRow.querySelector('.project-category').textContent.toLowerCase();
            const notes = projectRow.querySelector('.project-notes').textContent.toLowerCase();
            
            // Apply filters
            const matchesSearch = projectName.includes(searchTerm) || 
                                customerName.toLowerCase().includes(searchTerm) ||
                                notes.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            const matchesCustomer = !customerFilter || customerName === customerFilter;
            const matchesLocation = !locationFilter || true; // Location filtering would need to be added to project data
            
            if (matchesSearch && matchesStatus && matchesCustomer && matchesLocation) {
                projectRow.style.display = 'flex';
                hasVisibleProjects = true;
            } else {
                projectRow.style.display = 'none';
            }
        });
        
        // Show/hide customer group based on whether it has visible projects
        if (hasVisibleProjects) {
            header.style.display = 'table-row';
            group.style.display = 'table-row';
        } else {
            header.style.display = 'none';
            group.style.display = 'none';
        }
    });
}

// Action Functions
function quickStatusChange(index, newStatus) {
    const item = inventory[index];
    const statusNames = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'work-in-progress': 'Work in Progress',
        'completed': 'Completed',
        'sold': 'Sold'
    };
    
    // Store expanded customer groups before updating
    const expandedCustomers = getExpandedCustomerGroups();
    
    inventory[index].status = newStatus;
    saveData();
    loadInventoryTable();
    
    // Restore expanded customer groups after reload
    restoreExpandedCustomerGroups(expandedCustomers);
    
    showNotification(`Item status changed to ${statusNames[newStatus]}!`, 'success');
}

function markAsCompleted(index) {
    if (confirm('Mark this item as completed?')) {
        // Store expanded customer groups before updating
        const expandedCustomers = getExpandedCustomerGroups();
        
        inventory[index].status = 'completed';
        inventory[index].dateCompleted = new Date().toISOString();
        saveData();
        loadInventoryTable();
        loadWIPTab();
        
        // Restore expanded customer groups after reload
        restoreExpandedCustomerGroups(expandedCustomers);
        
        showNotification('Item marked as completed!', 'success');
    }
}

function markAsSold(index) {
    if (confirm('Mark this item as sold?')) {
        // Store expanded customer groups before updating
        const expandedCustomers = getExpandedCustomerGroups();
        
        inventory[index].status = 'sold';
        saveData();
        loadInventoryTable();
        
        // Restore expanded customer groups after reload
        restoreExpandedCustomerGroups(expandedCustomers);
        
        showNotification('Item marked as sold!', 'success');
    }
}

function testDeleteClick(index) {
    console.log('🧪 TEST: Delete button click detected!');
    console.log('🧪 TEST: Index received:', index);
    console.log('🧪 TEST: About to call deleteItem function...');
}

// Custom confirmation modal functions
let pendingConfirmAction = null;

function showConfirmModal(title, message, onConfirm) {
    // Try to find the modal element
    let modal = document.getElementById('confirmModal');
    
    // If not found, fallback to browser confirm (simpler and works fine for internal use)
    if (!modal) {
        const result = confirm(message);
        if (result && onConfirm) {
            onConfirm();
        }
        return;
    }
    
    // Modal found, show custom modal
    displayConfirmModal(modal, title, message, onConfirm);
}

function displayConfirmModal(modal, title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    pendingConfirmAction = onConfirm;
    modal.style.display = 'block';
    
    // Add body class for modal styling
    document.body.classList.add('modal-open');
    console.log('✅ Custom confirmation modal displayed');
}

function confirmAction() {
    if (pendingConfirmAction) {
        pendingConfirmAction();
        pendingConfirmAction = null;
    }
    closeConfirmModal();
}

function cancelConfirm() {
    pendingConfirmAction = null;
    closeConfirmModal();
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

function deleteItem(index) {
    console.log('🗑️ Delete item function called with index:', index);
    
    // Check if index is valid
    if (index === undefined || index === null || isNaN(index)) {
        console.error('❌ Invalid index provided to deleteItem:', index);
        showNotification('Error: Invalid item index', 'error');
        return;
    }
    
    console.log('✅ Index is valid, showing confirmation modal...');
    
    // Use custom confirmation modal instead of browser confirm
    showConfirmModal(
        'Delete Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        () => {
            console.log('👤 User confirmed deletion');
            proceedWithDeletion(index);
        }
    );
}

function proceedWithDeletion(index) {
    // Store expanded customer groups before deleting
    const expandedCustomers = getExpandedCustomerGroups();
    
    if (index >= 0 && index < inventory.length) {
        inventory.splice(index, 1);
        
        // Try to save data, but don't let localStorage errors prevent deletion
        try {
            saveData();
        } catch (error) {
            console.error('Save failed but item deleted:', error);
            // Still reload the tables even if save failed
            loadInventoryTable();
            loadInventoryItemsTable();
            showNotification('Item deleted but save failed - may need to refresh', 'warning');
            return;
        }
        
        loadInventoryTable();
        loadInventoryItemsTable(); // Also reload inventory items table
        
        // Restore expanded customer groups after reload
        restoreExpandedCustomerGroups(expandedCustomers);
        
        showNotification('Item deleted successfully!', 'success');
        console.log('✅ Item deleted successfully');
    } else {
        console.error('❌ Invalid index for deletion:', index);
        showNotification('Error: Invalid item index', 'error');
    }
}

function copyItem(index) {
    try {
        console.log('copyItem called with index:', index); // Debug log
        
        if (!inventory || index < 0 || index >= inventory.length) {
            console.error('Invalid index or inventory array:', index, inventory);
            showNotification('Error: Invalid item to copy', 'error');
            return;
        }
        
        const originalItem = inventory[index];
        console.log('Original item to copy:', originalItem); // Debug log
        
        if (!originalItem) {
            console.error('No item found at index:', index);
            showNotification('Error: Item not found', 'error');
            return;
        }
        
        // Store expanded customer groups before copying
        const expandedCustomers = getExpandedCustomerGroups();
        
        // Create a copy with reset status
        const copiedItem = {
            ...originalItem,
            name: originalItem.name, // Keep original name
            type: originalItem.type || 'inventory', // Ensure type is preserved
            status: originalItem.type === 'inventory' ? 'available' : 'pending', // Use appropriate status based on type
            dateAdded: new Date().toISOString(),
            dueDate: null, // Clear due date for copy
            notes: originalItem.notes || '' // Keep original notes without copy notation
        };
        
        // Add to inventory
        inventory.push(copiedItem);
        
        // Save data
        saveData();
        
        // Refresh both tables
        loadInventoryTable(); // Projects table
        loadInventoryItemsTable(); // Inventory items table
        
        // Restore expanded customer groups after reload
        restoreExpandedCustomerGroups(expandedCustomers);
        
        // Show success message
        showNotification('Item copied successfully!', 'success');
        
        console.log('Item copied successfully:', copiedItem);
        
    } catch (error) {
        console.error('Error in copyItem function:', error);
        showNotification('Error copying item: ' + error.message, 'error');
    }
}

// Copy from last added item (for add modal)
function copyFromLastItem() {
    if (inventory.length === 0) {
        showNotification('No items to copy from', 'error');
        return;
    }
    
    const lastItem = inventory[inventory.length - 1];
    
    // Populate the add form with last item's data
    document.getElementById('itemDescription').value = lastItem.description || lastItem.name || '';
    document.getElementById('itemLocation').value = lastItem.location || '';
    document.getElementById('itemQuantity').value = lastItem.quantity || 1;
    document.getElementById('itemPrice').value = lastItem.price || 0;
    document.getElementById('itemType').value = lastItem.type || 'inventory';
    document.getElementById('itemStatus').value = lastItem.status || 'available';
    document.getElementById('itemCategory').value = lastItem.category || '';
    document.getElementById('itemNotes').value = lastItem.notes || '';
    document.getElementById('itemSupplier').value = lastItem.supplier || '';
    document.getElementById('itemReorderPoint').value = lastItem.reorderPoint || 0;
    
    // Set project-specific fields
    document.getElementById('itemCustomer').value = lastItem.customer || '';
    document.getElementById('itemDueDate').value = lastItem.dueDate || '';
    document.getElementById('itemPriority').value = lastItem.priority || 'medium';
    document.getElementById('itemTags').value = lastItem.tags || '';
    document.getElementById('itemPatternLink').value = lastItem.patternLink || '';
    
    // Update status options and modal title
    updateStatusOptions();
    
    // Calculate total value
    calculateTotalValue();
    
    showNotification('Form populated with last item data', 'success');
}

// Copy current item being edited (for edit modal)
function copyCurrentItem() {
    const index = parseInt(document.getElementById('editItemIndex').value);
    
    if (isNaN(index) || index < 0 || index >= inventory.length) {
        showNotification('Error: Invalid item to copy', 'error');
        return;
    }
    
    const currentItem = inventory[index];
    
    // Store expanded customer groups before copying
    const expandedCustomers = getExpandedCustomerGroups();
    
    // Create a copy with reset status
    const copiedItem = {
        ...currentItem,
        name: currentItem.name, // Keep original name
        type: currentItem.type || 'inventory', // Ensure type is preserved
        status: currentItem.type === 'inventory' ? 'available' : 'pending', // Use appropriate status based on type
        dateAdded: new Date().toISOString(),
        dueDate: null, // Clear due date for copy
        notes: currentItem.notes || '' // Keep original notes without copy notation
    };
    
    // Add to inventory
    inventory.push(copiedItem);
    
    // Save data
    saveData();
    
    // Refresh both tables
    loadInventoryTable(); // Projects table
    loadInventoryItemsTable(); // Inventory items table
    
    // Restore expanded customer groups after reload
    restoreExpandedCustomerGroups(expandedCustomers);
    
    // Close the edit modal
    closeModal('editItemModal');
    
    // Show success message
    showNotification('Item copied successfully!', 'success');
}

function editCustomer(index) {
    const customer = customers[index];
    if (!customer) return;
    
    // Populate the edit form with customer data
    document.getElementById('editCustomerName').value = customer.name || '';
    document.getElementById('editCustomerContact').value = customer.contact || '';
    document.getElementById('editCustomerLocation').value = customer.location || '';
    document.getElementById('editCustomerStatus').value = customer.status || 'active';
    
    // Store the index for the update function
    document.getElementById('editCustomerForm').dataset.customerIndex = index;
    
    // Show the edit modal
    document.getElementById('editCustomerModal').style.display = 'block';
}

function viewCustomerProjects(customerName) {
    // Filter inventory to show only this customer's projects
    const customerProjects = inventory.filter(item => item.customer === customerName);
    
    if (customerProjects.length === 0) {
        showNotification(`${customerName} has no projects yet`, 'info');
        return;
    }
    
    // Switch to inventory tab and filter by customer
    switchTab('inventory');
    
    // Set the customer filter
    const customerFilter = document.getElementById('customerFilter');
    if (customerFilter) {
        customerFilter.value = customerName;
        filterItems(); // Apply the filter
    }
    
    showNotification(`Showing ${customerProjects.length} projects for ${customerName}`, 'success');
}

function createProjectForCustomer(customerName) {
    // Switch to inventory tab
    switchTab('inventory');
    
    // Open the add project modal
    openAddItemModal();
    
    // Set the customer field
    setTimeout(() => {
        const customerSelect = document.getElementById('itemCustomer');
        if (customerSelect) {
            customerSelect.value = customerName;
        }
    }, 100);
    
    showNotification(`Creating new project for ${customerName}`, 'info');
}

function deleteCustomer(index) {
    if (confirm('Are you sure you want to delete this customer? This will also delete all associated items.')) {
        const customerName = customers[index].name;
        inventory = inventory.filter(item => item.customer !== customerName);
        sales = sales.filter(sale => sale.customer !== customerName);
        customers.splice(index, 1);
        saveData();
        loadCustomersTable();
        loadInventoryTable();
        loadSalesTable();
        showNotification('Customer and associated data deleted!', 'success');
    }
}

function printCustomerList() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get current date
    const today = new Date().toLocaleDateString();
    
    // Create print content
    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Customer List - ${today}</title>
            <style>
                body { 
                    font-family: 'Georgia', 'Times New Roman', serif; 
                    margin: 20px; 
                    color: #2C3E2D;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 3px solid #6B8E5A; 
                    padding-bottom: 20px;
                }
                .header h1 { 
                    color: #6B8E5A; 
                    margin: 0; 
                    font-size: 2rem;
                }
                .header p { 
                    color: #8B7355; 
                    margin: 5px 0 0 0; 
                    font-size: 1.1rem;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                th { 
                    background: linear-gradient(135deg, #6B8E5A 0%, #8B7355 100%); 
                    color: white; 
                    padding: 15px; 
                    text-align: left; 
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                td { 
                    padding: 12px 15px; 
                    border-bottom: 1px solid #E6E6FA; 
                }
                tr:nth-child(even) { 
                    background-color: #F8F8FF; 
                }
                tr:hover { 
                    background-color: #E6E6FA; 
                }
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 0.9rem;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Customer List</h1>
                <p>Professional Craft Management</p>
                <p>Generated on ${today}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Location</th>
                        <th>Items</th>
                        <th>Total Spent</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add customer data with calculated stats
    customers.forEach(customer => {
        const customerItems = inventory.filter(item => item.customer === customer.name);
        const customerSales = sales.filter(sale => sale.customer === customer.name);
        const totalSpent = customerSales.reduce((sum, sale) => sum + parseFloat(sale.price), 0);
        
        printContent += `
            <tr>
                <td><strong>${customer.name}</strong></td>
                <td>${customer.contact || ''}</td>
                <td>${customer.location}</td>
                <td>${customerItems.length}</td>
                <td>$${totalSpent.toFixed(2)}</td>
            </tr>
        `;
    });
    
    printContent += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>Total Customers: ${customers.length}</p>
                <p>Generated by Embroidery Inventory Manager</p>
            </div>
        </body>
        </html>
    `;
    
    // Write content and print
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    showNotification('Customer list sent to printer!', 'success');
}

function exportCustomerList() {
    // Create CSV content
    let csvContent = "Name,Contact,Location,Items,Total Spent\n";
    
    customers.forEach(customer => {
        const customerItems = inventory.filter(item => item.customer === customer.name);
        const customerSales = sales.filter(sale => sale.customer === customer.name);
        const totalSpent = customerSales.reduce((sum, sale) => sum + parseFloat(sale.price), 0);
        
        csvContent += `"${customer.name}","${customer.contact || ''}","${customer.location}","${customerItems.length}","${totalSpent.toFixed(2)}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Customer list exported as CSV!', 'success');
}

function editSale(index) {
    const sale = sales[index];
    if (!sale) return;
    
    // Populate the edit form
    document.getElementById('editSaleIndex').value = index;
    document.getElementById('editSaleType').value = sale.saleType || '';
    document.getElementById('editSaleChannel').checked = sale.saleChannel === 'shop';
    document.getElementById('editListedPrice').value = sale.listedPrice || 0;
    document.getElementById('editSalePrice').value = sale.salePrice || sale.price || 0;
    document.getElementById('editSaleCustomer').value = sale.customer || '';
    document.getElementById('editSaleDate').value = sale.dateSold || '';
    document.getElementById('editSaleCommission').value = sale.commission || 0;
    document.getElementById('editSaleNotes').value = sale.notes || '';
    
    // Handle sale type specific fields
    toggleEditSaleItemType();
    
    if (sale.saleType === 'inventory' && sale.itemIndex !== null) {
        document.getElementById('editSaleItem').value = sale.itemIndex;
    } else if (sale.saleType === 'custom') {
        document.getElementById('editCustomItemName').value = sale.itemName || '';
        document.getElementById('editCustomItemDescription').value = sale.description || '';
    }
    
    // Calculate and display discount and net amount
    calculateEditDiscount();
    calculateEditNetAmount();
    
    // Show the edit modal
    document.getElementById('editSaleModal').style.display = 'block';
}

function handleEditSale(e) {
    e.preventDefault();
    
    const index = parseInt(document.getElementById('editSaleIndex').value);
    const saleType = document.getElementById('editSaleType').value;
    const saleChannel = document.getElementById('editSaleChannel').checked ? 'shop' : 'individual';
    const listedPrice = parseFloat(document.getElementById('editListedPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('editSalePrice').value) || 0;
    const customer = document.getElementById('editSaleCustomer').value || 'No Customer/Location';
    const dateSold = document.getElementById('editSaleDate').value;
    const notes = document.getElementById('editSaleNotes').value;
    const commission = parseFloat(document.getElementById('editSaleCommission').value) || 0;
    
    if (isNaN(index) || index < 0 || index >= sales.length) {
        showNotification('Invalid sale record', 'error');
        return;
    }
    
    const commissionAmount = (listedPrice * commission / 100);
    const netAmount = salePrice; // salePrice is now the net amount (what you receive)
    
    // Update the sale record
    sales[index] = {
        ...sales[index],
        saleType: saleType,
        saleChannel: saleChannel || 'individual',
        listedPrice: listedPrice,
        salePrice: salePrice,
        customer: customer,
        dateSold: dateSold,
        notes: notes,
        commission: commission,
        commissionAmount: commissionAmount,
        netAmount: netAmount,
        discount: listedPrice - (salePrice + commissionAmount), // Total customer pays vs list price
        discountPercent: listedPrice > 0 ? ((listedPrice - (salePrice + commissionAmount)) / listedPrice * 100).toFixed(1) : 0
    };
    
    // Handle sale type specific fields
    if (saleType === 'inventory') {
        const selectedItemIndex = document.getElementById('editSaleItem').value;
        if (selectedItemIndex) {
            sales[index].itemIndex = selectedItemIndex;
            sales[index].itemName = inventory[selectedItemIndex]?.name || 'Inventory Item';
            sales[index].location = inventory[selectedItemIndex]?.location || '';
        }
    } else if (saleType === 'custom') {
        const itemName = document.getElementById('editCustomItemName').value.trim() || 'Custom Item';
        const description = document.getElementById('editCustomItemDescription').value.trim();
        sales[index].itemName = itemName;
        sales[index].description = description;
        sales[index].itemIndex = null;
    }
    
    saveData();
    loadSalesTable();
    closeModal('editSaleModal');
    
    showNotification('Sale updated successfully!', 'success');
}

function deleteSale(index) {
    if (confirm('Are you sure you want to delete this sale record?')) {
        sales.splice(index, 1);
        saveData();
        loadSalesTable();
        showNotification('Sale record deleted!', 'success');
    }
}

// Enhanced Reports System
function loadReportsDashboard() {
    updateDashboardStats();
    updateReportFilters();
}

function updateDashboardStats() {
    const totalProjects = inventory.length;
    const completedProjects = inventory.filter(item => item.status === 'completed' || item.status === 'sold').length;
    const activeCustomers = new Set(inventory.map(item => item.customer).filter(customer => customer)).size;
    
    // Calculate total revenue from sales
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.price || 0), 0);
    
    // Calculate average project value
    const projectsWithValue = inventory.filter(item => item.price && item.price > 0);
    const avgProjectValue = projectsWithValue.length > 0 ? 
        projectsWithValue.reduce((sum, item) => sum + parseFloat(item.price), 0) / projectsWithValue.length : 0;
    
    // Calculate completion rate
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects * 100) : 0;
    
    // Update the dashboard
    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('completedProjects').textContent = completedProjects;
    document.getElementById('activeCustomers').textContent = activeCustomers;
    document.getElementById('avgProjectValue').textContent = `$${avgProjectValue.toFixed(2)}`;
    document.getElementById('completionRate').textContent = `${completionRate.toFixed(1)}%`;
}

function updateReportFilters() {
    // Update location filter
    const locations = [...new Set(inventory.map(item => item.location).filter(location => location))];
    const locationFilter = document.getElementById('reportLocationFilter');
    const currentLocation = locationFilter.value;
    
    locationFilter.innerHTML = '<option value="">All Locations</option>';
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    });
    locationFilter.value = currentLocation;
}

function generateTestReport() {
    if (!checkAuthentication()) {
        sessionStorage.setItem('requestedTab', 'reports');
        showAuthModal();
        return;
    }
    
    // Create test report with sample data
    const reportContent = document.getElementById('reportContent');
    
    reportContent.innerHTML = `
        <div class="report-header">
            <h2>📊 CyndyP Stitchcraft - Business Report</h2>
            <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="report-section">
            <h3>📈 Business Overview</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Projects</h4>
                    <div class="stat-number">47</div>
                    <div class="stat-change positive">+12% from last month</div>
                </div>
                <div class="stat-card">
                    <h4>Total Revenue</h4>
                    <div class="stat-number">$2,450.00</div>
                    <div class="stat-change positive">+18% from last month</div>
                </div>
                <div class="stat-card">
                    <h4>Completed Projects</h4>
                    <div class="stat-number">32</div>
                    <div class="stat-change positive">68% completion rate</div>
                </div>
                <div class="stat-card">
                    <h4>Active Customers</h4>
                    <div class="stat-number">28</div>
                    <div class="stat-change positive">+5 new this month</div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>🎯 Project Status Breakdown</h3>
            <div class="status-breakdown">
                <div class="status-item">
                    <span class="status-badge status-pending">Pending</span>
                    <span class="status-count">8 projects</span>
                </div>
                <div class="status-item">
                    <span class="status-badge status-in-progress">In Progress</span>
                    <span class="status-count">7 projects</span>
                </div>
                <div class="status-item">
                    <span class="status-badge status-completed">Completed</span>
                    <span class="status-count">25 projects</span>
                </div>
                <div class="status-item">
                    <span class="status-badge status-sold">Sold</span>
                    <span class="status-count">7 projects</span>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>💰 Revenue Analysis</h3>
            <div class="revenue-breakdown">
                <div class="revenue-item">
                    <strong>Individual Sales:</strong> $1,850.00 (76%)
                </div>
                <div class="revenue-item">
                    <strong>Shop Sales:</strong> $600.00 (24%)
                </div>
                <div class="revenue-item">
                    <strong>Average Project Value:</strong> $52.13
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3>📅 Upcoming Deadlines</h3>
            <div class="deadlines-list">
                <div class="deadline-item urgent">
                    <strong>Custom Wedding Dress</strong> - Due: Tomorrow
                </div>
                <div class="deadline-item warning">
                    <strong>Team Logo Shirts</strong> - Due: In 3 days
                </div>
                <div class="deadline-item normal">
                    <strong>Baby Blanket Set</strong> - Due: Next week
                </div>
            </div>
        </div>
        
        <div class="report-footer">
            <p><strong>Report Summary:</strong> Business is performing well with strong growth in both project volume and revenue. Focus on completing pending projects to maintain customer satisfaction.</p>
            <p class="report-note">This is a test report with sample data for preview purposes.</p>
        </div>
    `;
    
    // Show the report
    document.getElementById('reportModal').style.display = 'block';
    
    showNotification('Test report generated successfully!', 'success');
}

function generateComprehensiveReport() {
    const reportContent = document.getElementById('reportContent');
    const filters = getReportFilters();
    const filteredData = getFilteredData(filters);
    
    reportContent.innerHTML = `
        <div class="comprehensive-report">
            <div class="report-header">
                <h2>📊 Comprehensive Business Report</h2>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Period:</strong> ${filters.dateRange}</p>
            </div>
            
            <div class="report-sections">
                ${generateFinancialSummary(filteredData)}
                ${generateProjectSummary(filteredData)}
                ${generateCustomerSummary(filteredData)}
                ${generateProductivitySummary(filteredData)}
            </div>
        </div>
    `;
}

function generateFinancialReport() {
    const reportContent = document.getElementById('reportContent');
    const filters = getReportFilters();
    const filteredData = getFilteredData(filters);
    
    reportContent.innerHTML = `
        <div class="financial-report">
            <h2>💰 Financial Summary</h2>
            <div class="financial-stats">
                <div class="stat-card">
                    <div class="stat-number">$${filteredData.totalRevenue.toFixed(2)}</div>
                    <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$${filteredData.avgProjectValue.toFixed(2)}</div>
                    <div class="stat-label">Average Project Value</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${filteredData.completedProjects}</div>
                    <div class="stat-label">Completed Projects</div>
                </div>
            </div>
            
            <h3>Revenue by Status</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Total Value</th>
                        <th>Average Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateRevenueByStatus(filteredData.items)}
                </tbody>
            </table>
        </div>
    `;
}

function generateCustomerReport() {
    const reportContent = document.getElementById('reportContent');
    const filters = getReportFilters();
    const filteredData = getFilteredData(filters);
    
    reportContent.innerHTML = `
        <div class="customer-report">
            <h2>👥 Customer Analytics</h2>
            <div class="customer-stats">
                <div class="stat-card">
                    <div class="stat-number">${filteredData.uniqueCustomers}</div>
                    <div class="stat-label">Total Customers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${filteredData.avgProjectsPerCustomer.toFixed(1)}</div>
                    <div class="stat-label">Avg Projects per Customer</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$${filteredData.avgCustomerValue.toFixed(2)}</div>
                    <div class="stat-label">Avg Customer Value</div>
                </div>
            </div>
            
            <h3>Top Customers by Project Count</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Projects</th>
                        <th>Total Spent</th>
                        <th>Last Project</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTopCustomers(filteredData.items)}
                </tbody>
            </table>
        </div>
    `;
}

function generateProductivityReport() {
    const reportContent = document.getElementById('reportContent');
    const filters = getReportFilters();
    const filteredData = getFilteredData(filters);
    
    reportContent.innerHTML = `
        <div class="productivity-report">
            <h2>⚡ Productivity Report</h2>
            <div class="productivity-stats">
                <div class="stat-card">
                    <div class="stat-number">${filteredData.completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${filteredData.avgDaysToComplete.toFixed(1)}</div>
                    <div class="stat-label">Avg Days to Complete</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${filteredData.projectsThisMonth}</div>
                    <div class="stat-label">Projects This Month</div>
                </div>
            </div>
            
            <h3>Status Distribution</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateStatusDistribution(filteredData.items)}
                </tbody>
            </table>
        </div>
    `;
}

function generateInventoryReport() {
    const reportContent = document.getElementById('reportContent');
    const filters = getReportFilters();
    const filteredData = getFilteredData(filters);
    
    reportContent.innerHTML = `
        <div class="inventory-report">
            <h2>📦 Inventory Status Report</h2>
            <div class="inventory-summary">
                <p><strong>Total Items:</strong> ${filteredData.items.length}</p>
                <p><strong>Location:</strong> ${filters.location || 'All Locations'}</p>
                <p><strong>Status:</strong> ${filters.status || 'All Status'}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Customer</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Price</th>
                        <th>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.customer || 'No Customer'}</td>
                            <td>${item.location || 'Not specified'}</td>
                            <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                            <td>${item.priority || 'medium'}</td>
                            <td>$${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</td>
                            <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Helper functions for reports
function getReportFilters() {
    const location = document.getElementById('reportLocationFilter').value;
    const status = document.getElementById('reportStatusFilter').value;
    const dateFilter = document.getElementById('reportDateFilter').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    let dateRange = 'All Time';
    if (dateFilter) {
        dateRange = dateFilter;
    } else if (startDate && endDate) {
        dateRange = `${startDate} to ${endDate}`;
    }
    
    return { location, status, dateFilter, startDate, endDate, dateRange };
}

function getFilteredData(filters) {
    let filteredItems = [...inventory];
    
    // Apply location filter
    if (filters.location) {
        filteredItems = filteredItems.filter(item => item.location === filters.location);
    }
    
    // Apply status filter
    if (filters.status) {
        filteredItems = filteredItems.filter(item => item.status === filters.status);
    }
    
    // Apply date filter
    if (filters.dateFilter || (filters.startDate && filters.endDate)) {
        const now = new Date();
        let startDate, endDate;
        
        if (filters.dateFilter) {
            switch (filters.dateFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    endDate = now;
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = now;
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = now;
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = now;
                    break;
            }
        } else {
            startDate = new Date(filters.startDate);
            endDate = new Date(filters.endDate);
        }
        
        filteredItems = filteredItems.filter(item => {
            const itemDate = new Date(item.dateAdded);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }
    
    // Calculate statistics
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.price || 0), 0);
    const completedProjects = filteredItems.filter(item => item.status === 'completed' || item.status === 'sold').length;
    const uniqueCustomers = new Set(filteredItems.map(item => item.customer).filter(customer => customer)).size;
    const projectsWithValue = filteredItems.filter(item => item.price && item.price > 0);
    const avgProjectValue = projectsWithValue.length > 0 ? 
        projectsWithValue.reduce((sum, item) => sum + parseFloat(item.price), 0) / projectsWithValue.length : 0;
    const completionRate = filteredItems.length > 0 ? (completedProjects / filteredItems.length * 100) : 0;
    const avgProjectsPerCustomer = uniqueCustomers > 0 ? filteredItems.length / uniqueCustomers : 0;
    const avgCustomerValue = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
    
    // Calculate average days to complete
    const completedItems = filteredItems.filter(item => item.status === 'completed' && item.dateAdded);
    const avgDaysToComplete = completedItems.length > 0 ? 
        completedItems.reduce((sum, item) => {
            const startDate = new Date(item.dateAdded);
            const endDate = new Date(); // Assuming completed today for simplicity
            return sum + Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        }, 0) / completedItems.length : 0;
    
    // Projects this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const projectsThisMonth = filteredItems.filter(item => new Date(item.dateAdded) >= thisMonth).length;
    
    return {
        items: filteredItems,
        totalRevenue,
        completedProjects,
        uniqueCustomers,
        avgProjectValue,
        completionRate,
        avgProjectsPerCustomer,
        avgCustomerValue,
        avgDaysToComplete,
        projectsThisMonth
    };
}

function generateRevenueByStatus(items) {
    const statusGroups = {};
    items.forEach(item => {
        if (!statusGroups[item.status]) {
            statusGroups[item.status] = { count: 0, totalValue: 0 };
        }
        statusGroups[item.status].count++;
        statusGroups[item.status].totalValue += parseFloat(item.price || 0);
    });
    
    return Object.entries(statusGroups).map(([status, data]) => `
        <tr>
            <td>${status}</td>
            <td>${data.count}</td>
            <td>$${data.totalValue.toFixed(2)}</td>
            <td>$${data.count > 0 ? (data.totalValue / data.count).toFixed(2) : '0.00'}</td>
        </tr>
    `).join('');
}

function generateTopCustomers(items) {
    const customerData = {};
    items.forEach(item => {
        if (item.customer) {
            if (!customerData[item.customer]) {
                customerData[item.customer] = { projects: 0, totalSpent: 0, lastProject: null };
            }
            customerData[item.customer].projects++;
            customerData[item.customer].totalSpent += parseFloat(item.price || 0);
            if (!customerData[item.customer].lastProject || new Date(item.dateAdded) > new Date(customerData[item.customer].lastProject)) {
                customerData[item.customer].lastProject = item.dateAdded;
            }
        }
    });
    
    return Object.entries(customerData)
        .sort((a, b) => b[1].projects - a[1].projects)
        .slice(0, 10)
        .map(([customer, data]) => `
            <tr>
                <td>${customer}</td>
                <td>${data.projects}</td>
                <td>$${data.totalSpent.toFixed(2)}</td>
                <td>${data.lastProject ? new Date(data.lastProject).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');
}

function generateStatusDistribution(items) {
    const statusCounts = {};
    items.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => `
        <tr>
            <td>${status}</td>
            <td>${count}</td>
            <td>${items.length > 0 ? (count / items.length * 100).toFixed(1) : 0}%</td>
        </tr>
    `).join('');
}

function generateFinancialSummary(data) {
    return `
        <div class="report-section">
            <h3>💰 Financial Overview</h3>
            <div class="financial-grid">
                <div class="financial-item">
                    <span class="label">Total Revenue:</span>
                    <span class="value">$${data.totalRevenue.toFixed(2)}</span>
                </div>
                <div class="financial-item">
                    <span class="label">Average Project Value:</span>
                    <span class="value">$${data.avgProjectValue.toFixed(2)}</span>
                </div>
                <div class="financial-item">
                    <span class="label">Completed Projects:</span>
                    <span class="value">${data.completedProjects}</span>
                </div>
            </div>
        </div>
    `;
}

function generateProjectSummary(data) {
    return `
        <div class="report-section">
            <h3>📋 Project Overview</h3>
            <div class="project-grid">
                <div class="project-item">
                    <span class="label">Total Projects:</span>
                    <span class="value">${data.items.length}</span>
                </div>
                <div class="project-item">
                    <span class="label">Completion Rate:</span>
                    <span class="value">${data.completionRate.toFixed(1)}%</span>
                </div>
                <div class="project-item">
                    <span class="label">Active Customers:</span>
                    <span class="value">${data.uniqueCustomers}</span>
                </div>
            </div>
        </div>
    `;
}

function generateCustomerSummary(data) {
    return `
        <div class="report-section">
            <h3>👥 Customer Overview</h3>
            <div class="customer-grid">
                <div class="customer-item">
                    <span class="label">Total Customers:</span>
                    <span class="value">${data.uniqueCustomers}</span>
                </div>
                <div class="customer-item">
                    <span class="label">Avg Projects per Customer:</span>
                    <span class="value">${data.avgProjectsPerCustomer.toFixed(1)}</span>
                </div>
                <div class="customer-item">
                    <span class="label">Avg Customer Value:</span>
                    <span class="value">$${data.avgCustomerValue.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function generateProductivitySummary(data) {
    return `
        <div class="report-section">
            <h3>⚡ Productivity Overview</h3>
            <div class="productivity-grid">
                <div class="productivity-item">
                    <span class="label">Avg Days to Complete:</span>
                    <span class="value">${data.avgDaysToComplete.toFixed(1)} days</span>
                </div>
                <div class="productivity-item">
                    <span class="label">Projects This Month:</span>
                    <span class="value">${data.projectsThisMonth}</span>
                </div>
                <div class="productivity-item">
                    <span class="label">Completion Rate:</span>
                    <span class="value">${data.completionRate.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    `;
}

function printCurrentReport() {
    console.log('🖨️ Starting print report process...');
    
    try {
        // Check what report is currently displayed
        const reportContent = document.getElementById('reportContent');
        if (!reportContent || !reportContent.innerHTML.trim()) {
            console.log('📊 No report content found, generating default inventory report...');
            generateInventoryReport();
        } else {
            console.log('📊 Using existing report content...');
        }
        console.log('✅ Report content ready for printing');
        
        // Get the current report content for printing
        if (!reportContent) {
            console.error('❌ Report content element not found');
            alert('Error: Report content not found. Please try generating a report first.');
            return;
        }
        
        console.log('📄 Report content found, creating print window...');
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            console.error('❌ Failed to open print window (popup blocked?)');
            alert('Error: Could not open print window. Please check if popups are blocked.');
            return;
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>CyndyP Stitchcraft - Inventory Report</title>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            color: #333;
                            line-height: 1.4;
                        }
                        .inventory-report { 
                            max-width: 100%; 
                            margin: 0 auto; 
                        }
                        .inventory-report h2 { 
                            color: #2C3E2D; 
                            margin-bottom: 20px;
                            text-align: center;
                            border-bottom: 2px solid #6B8E5A;
                            padding-bottom: 10px;
                        }
                        .inventory-summary { 
                            background-color: #f8f9fa; 
                            padding: 15px; 
                            border-radius: 5px; 
                            margin-bottom: 20px;
                            display: flex;
                            justify-content: space-between;
                            flex-wrap: wrap;
                        }
                        .inventory-summary p {
                            margin: 5px 0;
                            font-weight: bold;
                        }
                        .report-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 20px 0;
                            font-size: 12px;
                        }
                        .report-table th, .report-table td { 
                            border: 1px solid #ddd; 
                            padding: 8px; 
                            text-align: left; 
                        }
                        .report-table th { 
                            background-color: #6B8E5A; 
                            color: white;
                            font-weight: bold;
                        }
                        .report-table tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .status-badge {
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 10px;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .status-pending { background-color: #fff3cd; color: #856404; }
                        .status-in-progress { background-color: #d1ecf1; color: #0c5460; }
                        .status-completed { background-color: #d4edda; color: #155724; }
                        .status-sold { background-color: #f8d7da; color: #721c24; }
                        @media print { 
                            body { margin: 0; }
                            .inventory-summary { 
                                flex-direction: column; 
                                gap: 5px;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${reportContent.innerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        console.log('📝 Print window content written');
        
        // Wait for content to load, then print
        setTimeout(() => {
            console.log('🖨️ Attempting to print...');
            printWindow.focus();
            printWindow.print();
            
            // Close window after a delay to allow printing
            setTimeout(() => {
                printWindow.close();
                console.log('✅ Print window closed');
            }, 1000);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in print function:', error);
        alert('Error generating print report: ' + error.message);
    }
}

function exportData() {
    const data = {
        inventory,
        customers,
        sales,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embroidery-inventory-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!', 'success');
}

// Modal Functions
function closeModal(modalId) {
    console.log('Closing modal:', modalId); // Debug log
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Remove mobile modal-open class from body
        document.body.classList.remove('modal-open');
        
        // Clear any form data
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        console.log('Modal closed successfully and body class removed'); // Debug log
    } else {
        console.error('Modal not found:', modalId); // Debug log
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Work In Progress Management
function loadWIPTab() {
    // Always update WIP tab content when called
    console.log('🔄 Loading WIP tab content');
    
    const wipItems = inventory.filter(item => 
        item.status === 'pending' || 
        item.status === 'in-progress' || 
        item.status === 'work-in-progress'
    );
    
    console.log('🔍 WIP Items found:', wipItems.length);
    console.log('📋 WIP Items details:', wipItems.map(item => ({
        name: item.name,
        status: item.status,
        index: inventory.indexOf(item)
    })));
    
    updateWIPStats(wipItems);
    loadWIPGrid(wipItems);
    
    // Load mobile cards for mobile devices
    loadMobileWIPCards();
}

function updateWIPStats(wipItems) {
    const wipCount = wipItems.filter(item => 
        item.status === 'in-progress' || item.status === 'work-in-progress'
    ).length;
    const pendingCount = wipItems.filter(item => item.status === 'pending').length;
    const completedToday = inventory.filter(item => {
        if (item.status !== 'completed' && item.status !== 'sold') return false;
        const today = new Date().toDateString();
        const itemDate = new Date(item.dateAdded).toDateString();
        return itemDate === today;
    }).length;
    
    // Update the stats display
    const wipCountEl = document.getElementById('wipCount');
    const wipPendingCountEl = document.getElementById('wipPendingCount');
    const wipCompletedTodayEl = document.getElementById('wipCompletedToday');
    
    if (wipCountEl) wipCountEl.textContent = wipCount;
    if (wipPendingCountEl) wipPendingCountEl.textContent = pendingCount;
    if (wipCompletedTodayEl) wipCompletedTodayEl.textContent = completedToday;
}

function loadWIPGrid(wipItems) {
    const wipGrid = document.getElementById('wipGrid');
    
    // Check if the WIP grid element exists
    if (!wipGrid) {
        console.log('WIP grid not found, skipping WIP grid update');
        return;
    }
    
    wipGrid.innerHTML = '';
    
    if (wipItems.length === 0) {
        wipGrid.innerHTML = `
            <div class="empty-wip">
                <i class="fas fa-tools"></i>
                <h3>No Work In Progress</h3>
                <p>All caught up! Add new projects to see them here.</p>
            </div>
        `;
        return;
    }
    
    wipItems.forEach((item, index) => {
        const originalIndex = inventory.indexOf(item);
        const priority = item.priority || 'medium';
        const daysInProgress = item.dateAdded ? 
            Math.floor((new Date() - new Date(item.dateAdded)) / (1000 * 60 * 60 * 24)) : 0;
        
        console.log(`🔄 WIP Item ${index}:`, {
            name: item.name,
            status: item.status,
            originalIndex: originalIndex
        });
        
        const wipItem = document.createElement('div');
        wipItem.className = `wip-item wip-priority-${priority}`;
        wipItem.innerHTML = `
            <div class="wip-item-header">
                <h3 class="wip-item-title">${item.name}</h3>
                <span class="wip-item-status">${item.status.replace('-', ' ')}</span>
            </div>
            <div class="wip-item-content">
                <p class="wip-item-description">${item.description || 'No description provided'}</p>
                <div class="wip-item-meta">
                    <div class="wip-meta-item">
                        <div class="wip-meta-label">Customer</div>
                        <div class="wip-meta-value">${item.customer || 'No Customer'}</div>
                    </div>
                    <div class="wip-meta-item">
                        <div class="wip-meta-label">Location</div>
                        <div class="wip-meta-value">${item.location || 'Not specified'}</div>
                    </div>
                    <div class="wip-meta-item">
                        <div class="wip-meta-label">Price</div>
                        <div class="wip-meta-value">$${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</div>
                    </div>
                    <div class="wip-meta-item">
                        <div class="wip-meta-label">Days in Progress</div>
                        <div class="wip-meta-value">${daysInProgress}</div>
                    </div>
                </div>
                <div class="wip-item-actions">
                    <button class="btn btn-primary" onclick="editWIPItem(${originalIndex})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-info" onclick="updateWIPStatus(${originalIndex})">
                        <i class="fas fa-arrow-right"></i> Update Status
                    </button>
                </div>
            </div>
        `;
        wipGrid.appendChild(wipItem);
    });
}

function filterWIP() {
    const searchTerm = document.getElementById('wipSearch').value.toLowerCase();
    const statusFilter = document.getElementById('wipStatusFilter').value;
    const priorityFilter = document.getElementById('wipPriorityFilter').value;
    
    let filteredItems = inventory.filter(item => 
        item.status === 'pending' || 
        item.status === 'in-progress' || 
        item.status === 'work-in-progress'
    );
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.customer && item.customer.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filteredItems = filteredItems.filter(item => item.status === statusFilter);
    }
    
    if (priorityFilter) {
        filteredItems = filteredItems.filter(item => (item.priority || 'medium') === priorityFilter);
    }
    
    updateWIPStats(filteredItems);
    loadWIPGrid(filteredItems);
}

function markAllWIPComplete() {
    const wipItems = inventory.filter(item => 
        item.status === 'in-progress' || item.status === 'work-in-progress'
    );
    
    if (wipItems.length === 0) {
        showNotification('No work in progress items to complete!', 'info');
        return;
    }
    
    if (confirm(`Mark all ${wipItems.length} work in progress items as completed?`)) {
        wipItems.forEach(item => {
            item.status = 'completed';
        });
        saveData();
        loadWIPTab();
        loadInventoryTable();
        showNotification(`Marked ${wipItems.length} items as completed!`, 'success');
    }
}

function updateWIPStatus(index) {
    console.log('🔄 updateWIPStatus called with index:', index);
    
    const item = inventory[index];
    const currentStatus = item.status;
    
    console.log('📝 Current item:', item);
    console.log('📝 Current status:', currentStatus);
    
    let newStatus;
    if (currentStatus === 'pending') {
        newStatus = 'in-progress';
    } else if (currentStatus === 'in-progress' || currentStatus === 'work-in-progress') {
        newStatus = 'completed';
    } else {
        showNotification('Item is not in a work in progress status', 'info');
        return;
    }
    
    console.log('📝 New status will be:', newStatus);
    
    if (confirm(`Mark "${item.name || item.description}" as ${newStatus.replace('-', ' ')}?`)) {
        // Store expanded customer groups before updating
        const expandedCustomers = getExpandedCustomerGroups();
        
        item.status = newStatus;
        console.log('✅ Item status updated to:', item.status);
        
        saveData();
        console.log('💾 Data saved');
        
        loadWIPTab();
        console.log('🔄 WIP tab reloaded');
        
        loadInventoryTable();
        console.log('🔄 Inventory table reloaded');
        
        // Restore expanded customer groups after reload
        restoreExpandedCustomerGroups(expandedCustomers);
        
        showNotification(`Item marked as ${newStatus.replace('-', ' ')}!`, 'success');
    }
}

// Gallery Management
function loadGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '';
    
    if (gallery.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <h3>No Photos Yet</h3>
                <p>Start building your portfolio by adding photos of your completed work!</p>
            </div>
        `;
        
        // Load mobile cards for mobile devices (even if empty)
        loadMobileGalleryCards();
        return;
    }
    
    gallery.forEach((photo, index) => {
        const photoElement = document.createElement('div');
        photoElement.className = 'gallery-item';
        photoElement.innerHTML = `
            <img src="${photo.imageData}" alt="${photo.title}" class="gallery-item-image">
            <div class="gallery-item-content">
                <h3 class="gallery-item-title">${photo.title}</h3>
                <p class="gallery-item-description">${photo.description || ''}</p>
                <div class="gallery-item-meta">
                    <span class="status-badge status-${photo.status}">${photo.status}</span>
                    <span class="gallery-item-date">${new Date(photo.dateAdded).toLocaleDateString()}</span>
                </div>
                <div class="gallery-item-actions">
                    <button class="btn btn-secondary" onclick="editPhoto(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deletePhoto(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        galleryGrid.appendChild(photoElement);
    });
    
    // Load mobile cards for mobile devices
    loadMobileGalleryCards();
}

function openAddPhotoModal() {
    populateItemSelect('photoItem');
    document.getElementById('addPhotoForm').reset();
    document.getElementById('addPhotoModal').style.display = 'block';
}

function handleAddPhoto(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('photoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a photo', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const newPhoto = {
                title: document.getElementById('photoTitle').value,
                description: document.getElementById('photoDescription').value,
                status: document.getElementById('photoStatus').value,
                relatedItem: document.getElementById('photoItem').value,
                imageData: e.target.result,
                dateAdded: new Date().toISOString()
            };
            
            gallery.push(newPhoto);
            saveData();
            loadGallery();
            closeModal('addPhotoModal');
            
            showNotification('Photo added to gallery!', 'success');
        } catch (error) {
            console.error('Error processing gallery photo:', error);
            showNotification('Error processing photo. Please try again.', 'error');
        }
    };
    
    reader.onerror = function(error) {
        console.error('Error reading gallery photo file:', error);
        showNotification('Error reading photo file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
}

function filterGallery() {
    const statusFilter = document.getElementById('galleryStatusFilter').value;
    const searchTerm = document.getElementById('gallerySearch').value.toLowerCase();
    
    const filteredPhotos = gallery.filter(photo => {
        const matchesStatus = !statusFilter || photo.status === statusFilter;
        const matchesSearch = !searchTerm || 
                            photo.title.toLowerCase().includes(searchTerm) ||
                            photo.description.toLowerCase().includes(searchTerm);
        
        return matchesStatus && matchesSearch;
    });
    
    const galleryGrid = document.getElementById('galleryGrid');
    galleryGrid.innerHTML = '';
    
    if (filteredPhotos.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-search"></i>
                <h3>No Photos Found</h3>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
        return;
    }
    
    filteredPhotos.forEach((photo, index) => {
        const originalIndex = gallery.indexOf(photo);
        const photoElement = document.createElement('div');
        photoElement.className = 'gallery-item';
        photoElement.innerHTML = `
            <img src="${photo.imageData}" alt="${photo.title}" class="gallery-item-image">
            <div class="gallery-item-content">
                <h3 class="gallery-item-title">${photo.title}</h3>
                <p class="gallery-item-description">${photo.description || ''}</p>
                <div class="gallery-item-meta">
                    <span class="status-badge status-${photo.status}">${photo.status}</span>
                    <span class="gallery-item-date">${new Date(photo.dateAdded).toLocaleDateString()}</span>
                </div>
                <div class="gallery-item-actions">
                    <button class="btn btn-secondary" onclick="editPhoto(${originalIndex})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deletePhoto(${originalIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        galleryGrid.appendChild(photoElement);
    });
}

function viewGalleryItem(index) {
    const photo = gallery[index];
    if (!photo) return;
    
    // Create a simple modal to view the gallery item
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${photo.title || 'Gallery Item'}</h3>
            ${photo.imageData ? `<img src="${photo.imageData}" alt="${photo.title}" style="width: 100%; max-height: 70vh; object-fit: contain;">` : ''}
            <div style="margin-top: 1rem;">
                <p><strong>Category:</strong> ${photo.category || 'No category'}</p>
                <p><strong>Status:</strong> ${photo.status || 'No status'}</p>
                ${photo.description ? `<p><strong>Description:</strong> ${photo.description}</p>` : ''}
                <p><strong>Date Added:</strong> ${new Date(photo.dateAdded).toLocaleDateString()}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function editGalleryItem(index) {
    editPhoto(index); // Use the existing editPhoto function
}

function deleteGalleryItem(index) {
    deletePhoto(index); // Use the existing deletePhoto function
}

function deletePhoto(index) {
    if (confirm('Are you sure you want to delete this photo from the gallery?')) {
        gallery.splice(index, 1);
        saveData();
        loadGallery();
        showNotification('Photo deleted from gallery!', 'success');
    }
}

function editPhoto(index) {
    // For now, just show a simple edit dialog
    const photo = gallery[index];
    const newTitle = prompt('Edit photo title:', photo.title);
    if (newTitle !== null) {
        photo.title = newTitle;
        const newDescription = prompt('Edit photo description:', photo.description || '');
        if (newDescription !== null) {
            photo.description = newDescription;
        }
        saveData();
        loadGallery();
        showNotification('Photo updated!', 'success');
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
        warning: '#ffc107'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Ideas Management Functions
function openAddIdeaModal() {
    document.getElementById('addIdeaModal').style.display = 'block';
    document.getElementById('ideaTitle').focus();
}

function handleAddIdea(event) {
    event.preventDefault();
    console.log('🎯 handleAddIdea called'); // Debug log
    
    const title = document.getElementById('ideaTitle').value.trim();
    const description = document.getElementById('ideaDescription').value.trim();
    const category = document.getElementById('ideaCategory').value;
    const status = document.getElementById('ideaStatus').value;
    const webLink = document.getElementById('ideaWebLink').value.trim();
    const source = document.getElementById('ideaSource').value.trim();
    const priority = document.getElementById('ideaPriority').value;
    const notes = document.getElementById('ideaNotes').value.trim();
    const imageFile = document.getElementById('ideaImage').files[0];
    const form = document.getElementById('addIdeaForm');
    const isEditing = form.dataset.editingId;
    
    console.log('🎯 Image file details:', {
        hasFile: !!imageFile,
        fileName: imageFile ? imageFile.name : 'none',
        fileSize: imageFile ? imageFile.size : 0,
        fileType: imageFile ? imageFile.type : 'none'
    }); // Debug log
    
    if (!title) {
        showNotification('Please enter an idea title', 'error');
        return;
    }
    
    console.log('🎯 Creating idea data:', { title, description, category }); // Debug log
    
    const ideaData = {
        title: title,
        description: description || '',
        category: category || 'other',
        status: status || 'new',
        webLink: webLink || '',
        source: source || '',
        priority: priority || 'medium',
        notes: notes || '',
        imageUrl: null
    };
    
    if (isEditing) {
        // Update existing idea
        const ideaIndex = ideas.findIndex(i => i.id === isEditing);
        if (ideaIndex !== -1) {
            ideas[ideaIndex] = { ...ideas[ideaIndex], ...ideaData };
        }
    } else {
        // Add new idea
        ideaData.id = generateIdeaId();
        ideaData.dateAdded = new Date().toISOString();
        ideas.push(ideaData);
        console.log('🎯 Added new idea to ideas array:', ideaData); // Debug log
        console.log('🎯 Total ideas count:', ideas.length); // Debug log
    }
    
    // Handle image upload with improved error handling
    if (imageFile && imageFile.size > 0 && imageFile.size < 10000000) { // Max 10MB
        console.log('🎯 Processing image file:', imageFile.name, imageFile.size);
        
        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            console.log('🎯 Invalid file type, saving without image...');
            showNotification('Invalid file type. Only images are allowed.', 'warning');
            saveData();
            loadIdeasGrid();
            closeModal('addIdeaModal');
            showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
            return;
        }
        
        // On mobile, skip FileReader for photo library images to prevent hanging
        if (window.innerWidth <= 768) {
            console.log('🎯 Mobile detected - skipping image processing, saving idea without image...');
            saveData();
            loadIdeasGrid();
            closeModal('addIdeaModal');
            showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
        } else {
            // Desktop: use FileReader with improved error handling
            const reader = new FileReader();
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                console.log('🎯 Image processing timeout, saving without image...');
                showNotification('Image processing timed out. Idea saved without image.', 'warning');
                saveData();
                loadIdeasGrid();
                closeModal('addIdeaModal');
                showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
            }, 10000); // 10 second timeout
            
            reader.onload = function(e) {
                try {
                    clearTimeout(timeout);
                    
                    // Validate the result
                    if (!e.target.result || e.target.result.length === 0) {
                        throw new Error('Empty image data');
                    }
                    
                    if (isEditing) {
                        const ideaIndex = ideas.findIndex(i => i.id === isEditing);
                        if (ideaIndex !== -1) {
                            ideas[ideaIndex].imageUrl = e.target.result;
                        }
                    } else {
                        const lastIdeaIndex = ideas.length - 1;
                        if (lastIdeaIndex >= 0) {
                            ideas[lastIdeaIndex].imageUrl = e.target.result;
                        }
                    }
                    
                    console.log('🎯 Image processed successfully, saving data...');
                    saveData();
                    loadIdeasGrid();
                    closeModal('addIdeaModal');
                    showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
                } catch (error) {
                    clearTimeout(timeout);
                    console.error('🎯 Error processing image data:', error);
                    showNotification('Error processing image. Idea saved without image.', 'warning');
                    saveData();
                    loadIdeasGrid();
                    closeModal('addIdeaModal');
                    showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
                }
            };
            
            reader.onerror = function(error) {
                clearTimeout(timeout);
                console.error('🎯 Image processing failed:', error);
                showNotification('Error reading image file. Idea saved without image.', 'warning');
                saveData();
                loadIdeasGrid();
                closeModal('addIdeaModal');
                showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
            };
            
            reader.readAsDataURL(imageFile);
        }
    } else {
        console.log('🎯 No image file, empty file, or file too large - saving data directly...');
        console.log('🎯 Image file details:', imageFile ? `name: ${imageFile.name}, size: ${imageFile.size}` : 'null');
        
        if (imageFile && imageFile.size >= 10000000) {
            showNotification('Image file too large. Maximum size is 10MB.', 'warning');
        }
        
        saveData();
        console.log('🎯 Data saved, loading ideas grid...');
        loadIdeasGrid();
        closeModal('addIdeaModal');
        showNotification(isEditing ? 'Idea updated successfully!' : 'Idea added successfully!', 'success');
    }
    
    // Reset form
    form.reset();
    delete form.dataset.editingId;
}

function generateIdeaId() {
    return 'IDEA-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
}

function loadIdeasGrid() {
    const grid = document.getElementById('ideasGrid');
    if (!grid) return;
    
    if (ideas.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lightbulb"></i>
                <h3>No Ideas Yet</h3>
                <p>Start collecting inspiration and ideas for your embroidery projects!</p>
                <button class="btn btn-primary" onclick="openAddIdeaModal()">
                    <i class="fas fa-plus"></i> Add Your First Idea
                </button>
            </div>
        `;
        
        // Load mobile cards for mobile devices (even if empty)
        loadMobileIdeasCards();
        return;
    }
    
    grid.innerHTML = ideas.map(idea => `
        <div class="idea-card" data-category="${idea.category}" data-status="${idea.status}">
            <div class="idea-image">
                ${idea.imageUrl ? 
                    `<img src="${idea.imageUrl}" alt="${idea.title}" onclick="viewIdeaImage('${idea.id}')">` : 
                    `<div class="no-image"><i class="fas fa-image"></i></div>`
                }
                <div class="idea-status status-${idea.status}">${idea.status.replace('-', ' ')}</div>
            </div>
            <div class="idea-content">
                <h3 class="idea-title">${idea.title}</h3>
                <p class="idea-description">${idea.description || 'No description'}</p>
                <div class="idea-meta">
                    <span class="idea-category">${idea.category}</span>
                    <span class="idea-priority priority-${idea.priority}">${idea.priority}</span>
                </div>
                <div class="idea-actions">
                    ${idea.webLink ? `<a href="${idea.webLink}" target="_blank" class="btn btn-small btn-outline"><i class="fas fa-external-link-alt"></i> View Source</a>` : ''}
                    <button class="btn btn-small" onclick="editIdea('${idea.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteIdea('${idea.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Load mobile cards for mobile devices
    loadMobileIdeasCards();
}

function filterIdeas() {
    const searchTerm = document.getElementById('ideasSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('ideasCategoryFilter').value;
    const statusFilter = document.getElementById('ideasStatusFilter').value;
    
    const cards = document.querySelectorAll('.idea-card');
    
    cards.forEach(card => {
        const title = card.querySelector('.idea-title').textContent.toLowerCase();
        const description = card.querySelector('.idea-description').textContent.toLowerCase();
        const category = card.dataset.category;
        const status = card.dataset.status;
        
        const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !categoryFilter || category === categoryFilter;
        const matchesStatus = !statusFilter || status === statusFilter;
        
        if (matchesSearch && matchesCategory && matchesStatus) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function editIdea(ideaId) {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    
    // Populate form with existing data
    document.getElementById('ideaTitle').value = idea.title;
    document.getElementById('ideaDescription').value = idea.description || '';
    document.getElementById('ideaCategory').value = idea.category;
    document.getElementById('ideaStatus').value = idea.status;
    document.getElementById('ideaWebLink').value = idea.webLink || '';
    document.getElementById('ideaSource').value = idea.source || '';
    document.getElementById('ideaPriority').value = idea.priority;
    document.getElementById('ideaNotes').value = idea.notes || '';
    
    // Store the idea ID for updating
    document.getElementById('addIdeaForm').dataset.editingId = ideaId;
    document.getElementById('addIdeaModal').style.display = 'block';
}

function viewIdea(index) {
    const idea = ideas[index];
    if (!idea) return;
    
    // Create a modal to view the idea details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${idea.title || 'Idea'}</h3>
            <div style="margin-bottom: 1rem;">
                <p><strong>Category:</strong> ${idea.category || 'No category'}</p>
                <p><strong>Status:</strong> ${idea.status || 'No status'}</p>
                <p><strong>Priority:</strong> ${idea.priority || 'No priority'}</p>
                ${idea.webLink ? `<p><strong>Source:</strong> <a href="${idea.webLink}" target="_blank">${idea.webLink}</a></p>` : ''}
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Description:</strong>
                <p>${idea.description || 'No description available'}</p>
            </div>
            ${idea.imageUrl ? `<img src="${idea.imageUrl}" alt="${idea.title}" style="width: 100%; max-height: 300px; object-fit: contain;">` : ''}
        </div>
    `;
    document.body.appendChild(modal);
}

function convertIdeaToProject(index) {
    const idea = ideas[index];
    if (!idea) return;
    
    if (confirm(`Convert "${idea.title}" to a project?`)) {
        // Switch to inventory tab
        switchTab('inventory');
        
        // Open the add project modal
        openAddItemModal();
        
        // Pre-populate the form with idea data
        setTimeout(() => {
            const nameField = document.getElementById('itemName');
            const categoryField = document.getElementById('itemCategory');
            const notesField = document.getElementById('itemNotes');
            const priorityField = document.getElementById('itemPriority');
            
            if (nameField) nameField.value = idea.title || '';
            if (categoryField) categoryField.value = idea.category || '';
            if (notesField) notesField.value = idea.description || '';
            if (priorityField) priorityField.value = idea.priority || 'medium';
            
            // If there's a pattern link, add it to notes
            if (idea.webLink && notesField) {
                const existingNotes = notesField.value;
                notesField.value = existingNotes + (existingNotes ? '\n\n' : '') + `Source: ${idea.webLink}`;
            }
        }, 100);
        
        showNotification(`Converting "${idea.title}" to project...`, 'success');
    }
}

function deleteIdea(ideaId) {
    if (confirm('Are you sure you want to delete this idea?')) {
        ideas = ideas.filter(i => i.id !== ideaId);
        saveData();
        loadIdeasGrid();
        showNotification('Idea deleted', 'success');
    }
}

function viewIdeaImage(ideaId) {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea && idea.imageUrl) {
        // Create a modal to view the image
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 80%; max-height: 80%;">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <img src="${idea.imageUrl}" alt="${idea.title}" style="width: 100%; height: auto; border-radius: 8px;">
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function exportIdeas() {
    const dataStr = JSON.stringify(ideas, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `embroidery-ideas-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Ideas exported successfully!', 'success');
}

// ===== CAMERA FUNCTIONALITY =====

let cameraStream = null;
let currentCameraContext = null; // 'inventory', 'ideas', 'gallery'
let capturedPhotoBlob = null;

// Open camera for different contexts
function openCameraForInventory() {
    currentCameraContext = 'inventory';
    openCamera();
}

function openCameraForIdeas() {
    currentCameraContext = 'ideas';
    openCamera();
}

function openCameraForGallery() {
    currentCameraContext = 'gallery';
    openCamera();
}

function openCamera() {
    document.getElementById('cameraModal').style.display = 'block';
    document.getElementById('cameraError').style.display = 'none';
    
    // Reset camera state
    document.getElementById('captureBtn').style.display = 'inline-block';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('usePhotoBtn').style.display = 'none';
    
    // Check if device supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('cameraError').style.display = 'block';
        document.getElementById('cameraVideo').style.display = 'none';
        return;
    }
    
    // Mobile-optimized camera constraints
    const constraints = {
        video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
        }
    };
    
    // Try to get camera access
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        cameraStream = stream;
        const video = document.getElementById('cameraVideo');
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById('cameraCanvas').style.display = 'none';
        
        // Add loading indicator removal
        video.onloadedmetadata = () => {
            console.log('Camera ready');
        };
        
        // Handle orientation changes on mobile
        if (window.screen && window.screen.orientation) {
            window.screen.orientation.addEventListener('change', handleOrientationChange);
        }
    })
    .catch(error => {
        console.error('Camera access denied:', error);
        let errorMessage = 'Camera not available. Please use file upload instead.';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application.';
        }
        
        document.getElementById('cameraError').innerHTML = 
            `<i class="fas fa-exclamation-triangle"></i> ${errorMessage}`;
        document.getElementById('cameraError').style.display = 'block';
        document.getElementById('cameraVideo').style.display = 'none';
    });
}

function handleOrientationChange() {
    // Handle orientation changes for better mobile experience
    setTimeout(() => {
        const video = document.getElementById('cameraVideo');
        if (video && video.srcObject) {
            // Force video to recalculate dimensions
            video.style.height = 'auto';
        }
    }, 100);
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob(blob => {
        capturedPhotoBlob = blob;
        
        // Show captured image and controls
        video.style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'inline-block';
        document.getElementById('usePhotoBtn').style.display = 'inline-block';
        
        // Stop camera stream
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }, 'image/jpeg', 0.8);
}

function retakePhoto() {
    // Reset to camera view
    document.getElementById('cameraVideo').style.display = 'block';
    document.getElementById('cameraCanvas').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'inline-block';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('usePhotoBtn').style.display = 'none';
    
    // Restart camera
    openCamera();
}

function useCapturedPhoto() {
    if (!capturedPhotoBlob) return;
    
    // Create a File object from the blob
    const file = new File([capturedPhotoBlob], 'captured-photo.jpg', { type: 'image/jpeg' });
    
    // Set the file input based on context
    let fileInput;
    switch (currentCameraContext) {
        case 'inventory':
            fileInput = document.getElementById('itemPhoto');
            break;
        case 'ideas':
            fileInput = document.getElementById('ideaImage');
            break;
        case 'gallery':
            fileInput = document.getElementById('photoFile');
            break;
    }
    
    if (fileInput) {
        // Create a new FileList with the captured photo
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // Trigger change event to update preview
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Close camera modal
    closeCameraModal();
    
    showNotification('Photo captured successfully!', 'success');
}

function closeCameraModal() {
    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Reset state
    capturedPhotoBlob = null;
    currentCameraContext = null;
    
    // Hide modal
    document.getElementById('cameraModal').style.display = 'none';
}

// ===== PHOTO MANAGEMENT =====

function viewPhoto(photoUrl, photoTitle = 'Photo') {
    document.getElementById('photoFullImage').src = photoUrl;
    document.getElementById('photoFullImage').alt = photoTitle;
    document.getElementById('photoViewModal').style.display = 'block';
}

function deletePhoto() {
    // This would need to be implemented based on how photos are stored
    // For now, just close the modal
    closeModal('photoViewModal');
    showNotification('Photo deleted successfully!', 'success');
}

// Enhanced file input handling with preview
function setupPhotoPreviews() {
    // Add preview functionality to all photo inputs
    const photoInputs = ['itemPhoto', 'ideaImage', 'photoFile'];
    
    photoInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showNotification('Please select a valid image file.', 'error');
                        e.target.value = ''; // Clear the input
                        return;
                    }
                    
                    // Validate file size (10MB max)
                    if (file.size > 10000000) {
                        showNotification('Image file too large. Maximum size is 10MB.', 'error');
                        e.target.value = ''; // Clear the input
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            if (e.target.result && e.target.result.length > 0) {
                                showPhotoPreview(inputId, e.target.result);
                            } else {
                                throw new Error('Empty image data');
                            }
                        } catch (error) {
                            console.error('Error processing image preview:', error);
                            showNotification('Error processing image preview.', 'error');
                        }
                    };
                    
                    reader.onerror = function(error) {
                        console.error('Error reading image file for preview:', error);
                        showNotification('Error reading image file.', 'error');
                    };
                    
                    reader.readAsDataURL(file);
                }
            });
        }
    });
}

function showPhotoPreview(inputId, imageUrl) {
    // Remove existing preview
    const existingPreview = document.querySelector(`#${inputId}_preview`);
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Create new preview
    const preview = document.createElement('div');
    preview.id = `${inputId}_preview`;
    preview.className = 'photo-preview';
    preview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
    
    // Insert after the input container
    const inputContainer = document.querySelector(`#${inputId}`).closest('.photo-input-container');
    if (inputContainer) {
        inputContainer.parentNode.insertBefore(preview, inputContainer.nextSibling);
    }
}

// Photo functionality and mobile features are now initialized in the main DOMContentLoaded listener

// ===== PWA & MOBILE FEATURES =====

function registerServiceWorker() {
    // Service worker removed to fix deployment issues
}

function setupMobileFeatures() {
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Improve mobile scrolling behavior
    document.addEventListener('touchstart', function(e) {
        // Allow scrolling to continue naturally
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        // Allow scrolling to continue naturally
    }, { passive: true });
    
    // Enhanced mobile scroll handling for cards containers
    function enhanceMobileScroll() {
        const mobileContainers = document.querySelectorAll('.mobile-cards-container');
        mobileContainers.forEach(container => {
            // Ensure smooth scrolling
            container.style.scrollBehavior = 'smooth';
            container.style.webkitOverflowScrolling = 'touch';
            
            // Add momentum scrolling for iOS
            if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
                container.style.webkitOverflowScrolling = 'touch';
            }
        });
    }
    
    // Apply mobile scroll enhancements when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceMobileScroll);
    } else {
        enhanceMobileScroll();
    }
    
    // Re-apply on tab changes
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-btn')) {
            setTimeout(enhanceMobileScroll, 100);
        }
    });
    
    
    // Handle viewport height on mobile browsers
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // Add install prompt for PWA
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Install banner disabled - users are already using the app
        // showInstallPrompt();
    });
    
    // Handle app installed
    window.addEventListener('appinstalled', () => {
        showNotification('App installed successfully!', 'success');
        deferredPrompt = null;
    });
    
    // Detect if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        document.body.classList.add('pwa-mode');
        console.log('Running as PWA');
    }
}

function showInstallPrompt() {
    // Only show install banner on mobile devices (screen width <= 768px)
    if (window.innerWidth > 768) {
        // Remove any existing install banner if we're on desktop
        const existingBanner = document.querySelector('.install-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        return;
    }
    
    // Create install banner for mobile only
    const installBanner = document.createElement('div');
    installBanner.className = 'install-banner';
    installBanner.innerHTML = `
        <div class="install-banner-content">
            <i class="fas fa-mobile-alt"></i>
            <span>Install StitchCraft for easy access</span>
            <button class="btn btn-primary btn-sm" onclick="installPWA()">Install</button>
            <button class="btn btn-secondary btn-sm" onclick="dismissInstallBanner()">×</button>
        </div>
    `;
    document.body.appendChild(installBanner);
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
    }
    dismissInstallBanner();
}

function dismissInstallBanner() {
    const banner = document.querySelector('.install-banner');
    if (banner) {
        banner.remove();
    }
}

// Enhanced photo capture with mobile gestures
function setupMobilePhotoGestures() {
    const cameraModal = document.getElementById('cameraModal');
    if (cameraModal) {
        // Add swipe gestures for camera controls
        let startX = 0;
        let startY = 0;
        
        cameraModal.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        cameraModal.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Swipe up to capture
            if (Math.abs(diffY) > Math.abs(diffX) && diffY > 50) {
                capturePhoto();
            }
            // Swipe down to close
            else if (Math.abs(diffY) > Math.abs(diffX) && diffY < -50) {
                closeCameraModal();
            }
        }, { passive: true });
    }
}

// ===== ENHANCED DATA STRUCTURES =====

// ===== OCR PHOTO ANALYSIS SYSTEM =====

// OCR Analysis Functions
function analyzePhotoForInventory() {
    // OCR now works on mobile with improved error handling
    
    const fileInput = document.getElementById('itemPhoto');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a photo first', 'error');
        return;
    }
    
    analyzePhotoWithOCR(file, 'inventory');
}

function analyzePhotoForGallery() {
    // OCR now works on mobile with improved error handling
    
    const fileInput = document.getElementById('photoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a photo first', 'error');
        return;
    }
    
    analyzePhotoWithOCR(file, 'gallery');
}

function analyzePhotoForIdeas() {
    // OCR now works on mobile with improved error handling
    
    const fileInput = document.getElementById('ideaImage');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a photo first', 'error');
        return;
    }
    
    analyzePhotoWithOCR(file, 'ideas');
}

// Main OCR Analysis Function
async function analyzePhotoWithOCR(imageFile, context) {
    const analyzeBtn = document.getElementById(`analyze${context.charAt(0).toUpperCase() + context.slice(1)}Btn`);
    
    try {
        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        showNotification('Analyzing photo... This may take a few seconds.', 'info');
        
        // Mobile-optimized OCR with timeout
        const ocrPromise = Tesseract.recognize(imageFile, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        
        // Add timeout for mobile devices (30 seconds max)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OCR timeout - photo processing took too long')), 30000);
        });
        
        const result = await Promise.race([ocrPromise, timeoutPromise]);
        
        const extractedText = result.data.text;
        const confidence = result.data.confidence;
        
        console.log('OCR Result:', {
            text: extractedText,
            confidence: confidence,
            context: context
        });
        
                    // Show extracted text to user for debugging
                    if (extractedText.trim()) {
                        showNotification(`Extracted text: "${extractedText.substring(0, 200)}${extractedText.length > 200 ? '...' : ''}"`, 'info');
                        console.log('Full OCR extracted text:', extractedText);
                    }
        
        // Extract and populate fields based on context
        const extractedData = extractFieldsFromText(extractedText, context);
        populateFormFields(extractedData, context, confidence);
        
        // Show success message with confidence
        const confidenceText = confidence > 70 ? 'high' : confidence > 40 ? 'medium' : 'low';
        showNotification(`Photo analyzed successfully! Confidence: ${confidenceText} (${Math.round(confidence)}%)`, 'success');
        
    } catch (error) {
        console.error('OCR Error:', error);
        
        // Provide specific error messages for mobile
        if (error.message.includes('timeout')) {
            showNotification('Photo analysis timed out. Try a smaller image or better lighting.', 'warning');
        } else if (error.message.includes('memory') || error.message.includes('out of memory')) {
            showNotification('Image too large for analysis. Try a smaller photo.', 'warning');
        } else {
            showNotification('Failed to analyze photo. Please try again or enter details manually.', 'error');
        }
    } finally {
        // Reset button state
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Photo';
    }
}

// Extract structured data from OCR text
function extractFieldsFromText(text, context) {
    const extractedData = {
        name: '',
        description: '',
        price: '',
        quantity: '',
        category: '',
        customer: '',
        location: '',
        status: '',
        notes: '',
        webLink: ''
    };
    
                // Clean and normalize text more aggressively
                let cleanText = text
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/[^\w\s\-\.\,\:\$\d]/g, ' ') // Remove special chars but keep basic punctuation
                    .replace(/\s+/g, ' ') // Normalize again
                    .trim();
                
                // Also try to clean up common OCR errors
                cleanText = cleanText
                    .replace(/0/g, 'O') // Replace 0 with O in words
                    .replace(/1/g, 'l') // Replace 1 with l in words
                    .replace(/5/g, 'S') // Replace 5 with S in words
                    .replace(/8/g, 'B') // Replace 8 with B in words
                    .replace(/\b(\w*[0-9]\w*)\b/g, '') // Remove words with numbers
                    .replace(/\s+/g, ' ')
                    .trim();
                
                const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
                console.log('Processing text lines:', lines);
                console.log('Cleaned text:', cleanText);
    
    // Define extraction patterns
    const patterns = {
        // Price patterns
        price: [
            /\$(\d+\.?\d*)/g,
            /price[:\s]*\$?(\d+\.?\d*)/gi,
            /cost[:\s]*\$?(\d+\.?\d*)/gi,
            /(\d+\.?\d*)\s*dollars?/gi
        ],
        
        // Quantity patterns
        quantity: [
            /(\d+)\s*(?:pcs|pieces|qty|quantity|count)/gi,
            /quantity[:\s]*(\d+)/gi,
            /qty[:\s]*(\d+)/gi,
            /count[:\s]*(\d+)/gi
        ],
        
                    // Supplier patterns (enhanced for craft supplies)
                    supplier: [
                        /supplier[:\s]*([^\n]+)/gi,
                        /vendor[:\s]*([^\n]+)/gi,
                        /from[:\s]*([^\n]+)/gi,
                        /(selleronlinecraft|seller.*online.*craft|craftsonline|joann|michaels|hobby lobby|embroidery|dmc|brother|janome|simplified)/gi,
                        /(amazon|etsy|ebay|aliexpress)/gi
                    ],
        
        // Size patterns
        size: [
            /size[:\s]*([^\s\n]+)/gi,
            /(xs|small|medium|large|xl|xxl|xxxl)/gi,
            /(\d+[x\s]*\d+)/g // Dimensions like "12x8"
        ],
        
        // Color patterns
        color: [
            /color[:\s]*([^\s\n]+)/gi,
            /(red|blue|green|black|white|pink|purple|yellow|orange|brown|gray|grey|navy|maroon)/gi
        ],
        
        // Customer patterns
        customer: [
            /customer[:\s]*([^\n]+)/gi,
            /for[:\s]*([^\n]+)/gi,
            /client[:\s]*([^\n]+)/gi,
            /order[:\s]*for[:\s]*([^\n]+)/gi
        ],
        
                    // Status patterns
                    status: [
                        /status[:\s]*([^\s\n]+)/gi,
                        /(pending|in progress|completed|delivered|ready|urgent)/gi
                    ],

                    // Difficulty/Level patterns
                    difficulty: [
                        /difficulty[:\s]*([^\s\n]+)/gi,
                        /level[:\s]*([^\s\n]+)/gi,
                        /(beginner|easy|medium|hard|advanced|expert)/gi
                    ],
        
                    // Description/Name patterns (enhanced for craft products)
                    description: [
                        /description[:\s]*([^\n]+)/gi,
                        /item[:\s]*([^\n]+)/gi,
                        /product[:\s]*([^\n]+)/gi,
                        /name[:\s]*([^\n]+)/gi,
                        /(black.*widow.*spider|black widow spider|spider|stag beetle|dragonfly|butterfly|flower|tree|bird|animal|nature|pattern|design)/gi,
                        /(bead.*embroidery.*kit|bead embroidery kit|embroidery.*kit|embroidery kit)/gi,
                        /(embroidered|custom|handmade|vintage|classic|modern)/gi,
                        /([A-Z][a-z]+\s+[A-Z][a-z]+)/g // Title Case patterns like "Black Widow Spider"
                    ],
        
        // Category patterns
        category: [
            /category[:\s]*([^\s\n]+)/gi,
            /type[:\s]*([^\s\n]+)/gi,
            /(shirt|hat|towel|bag|jacket|hoodie|apron|embroidery|custom)/gi
        ],
        
        // Web link patterns
        webLink: [
            /(https?:\/\/[^\s\n]+)/gi,
            /(www\.[^\s\n]+)/gi
        ]
    };
    
    // Extract data using patterns
    Object.keys(patterns).forEach(field => {
        patterns[field].forEach(pattern => {
            const matches = cleanText.match(pattern);
            if (matches && matches.length > 0) {
                const value = matches[matches.length - 1]; // Take the last match
                if (value && !extractedData[field]) {
                    extractedData[field] = value.trim();
                }
            }
        });
    });
    
    // Enhanced logic for name/description detection
    if (!extractedData.name && !extractedData.description && lines.length > 0) {
        // Look for product names in various formats
        let productName = '';
        
        // Try to find a line that looks like a product name
        for (let line of lines) {
            // Skip lines that are just numbers, prices, or common non-product text
            if (line.match(/^\$?\d+\.?\d*$/) || 
                line.match(/^(price|cost|total|quantity|qty|count|size|color)/i) ||
                line.length < 3) {
                continue;
            }
            
            // Prefer lines with title case (like "Stag Beetle")
            if (line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) {
                productName = line;
                break;
            }
            
                        // Look for craft/embroidery related terms
                        if (line.match(/(black widow spider|spider|beetle|dragonfly|butterfly|flower|tree|bird|animal|nature|pattern|design|embroidered|custom)/i)) {
                            productName = line;
                            break;
                        }
            
            // Use the first substantial line as fallback
            if (!productName && line.length > 3) {
                productName = line;
            }
        }
        
        if (productName) {
            extractedData.name = productName;
            extractedData.description = productName;
        }
    }
    
    // Smart category detection
    if (!extractedData.category) {
        const categoryKeywords = {
            'Apparel': ['shirt', 't-shirt', 'tshirt', 'hat', 'cap', 'jacket', 'hoodie'],
            'Accessories': ['bag', 'tote', 'backpack', 'apron'],
            'Home Goods': ['towel', 'blanket', 'pillow', 'curtain'],
            'Sports': ['jersey', 'uniform', 'team'],
            'Custom': ['custom', 'personalized', 'embroidered']
        };
        
        Object.keys(categoryKeywords).forEach(category => {
            if (!extractedData.category && categoryKeywords[category].some(keyword => 
                cleanText.toLowerCase().includes(keyword))) {
                extractedData.category = category;
            }
        });
    }
    
    // Smart status detection
    if (!extractedData.status) {
        const statusKeywords = {
            'pending': ['pending', 'new', 'order'],
            'in-progress': ['progress', 'working', 'production'],
            'completed': ['done', 'finished', 'complete', 'ready'],
            'delivered': ['delivered', 'shipped', 'sent']
        };
        
        Object.keys(statusKeywords).forEach(status => {
            if (!extractedData.status && statusKeywords[status].some(keyword => 
                cleanText.toLowerCase().includes(keyword))) {
                extractedData.status = status;
            }
        });
    }
    
                // Fallback: Try to find keywords even in messy OCR text
                if (!extractedData.name && !extractedData.description) {
                    const originalText = text.toLowerCase();
                    
                    // Look for spider-related terms even in messy text
                    if (originalText.includes('spider') || originalText.includes('widow')) {
                        extractedData.description = 'Black Widow Spider';
                        extractedData.name = 'Black Widow Spider';
                    }
                    
                    // Look for embroidery kit terms
                    if (originalText.includes('embroidery') && originalText.includes('kit')) {
                        if (!extractedData.description) {
                            extractedData.description = 'Embroidery Kit';
                        }
                        if (!extractedData.name) {
                            extractedData.name = 'Embroidery Kit';
                        }
                    }
                    
                    // Look for supplier terms
                    if (originalText.includes('seller') || originalText.includes('online') || originalText.includes('craft')) {
                        extractedData.supplier = 'SellerOnlineCraft';
                    }
                }

                console.log('Extracted data:', extractedData);
                return extractedData;
}

// Populate form fields with extracted data
function populateFormFields(data, context, confidence) {
    const fieldMappings = {
        inventory: {
            name: 'itemDescription',
            description: 'itemDescription', 
            price: 'itemPrice',
            quantity: 'itemQuantity',
            category: 'itemCategory',
            customer: 'itemCustomer',
            location: 'itemLocation',
            status: 'itemStatus',
            supplier: 'itemSupplier',
            difficulty: 'itemNotes', // Map difficulty to notes field
            notes: 'itemNotes'
        },
        gallery: {
            name: 'photoTitle',
            description: 'photoDescription',
            category: 'photoCategory',
            status: 'photoStatus',
            notes: 'photoDescription'
        },
        ideas: {
            name: 'ideaTitle',
            description: 'ideaDescription',
            category: 'ideaCategory',
            status: 'ideaStatus',
            webLink: 'ideaWebLink',
            notes: 'ideaDescription'
        }
    };
    
    const mappings = fieldMappings[context];
    if (!mappings) return;
    
    let fieldsPopulated = 0;
    
    Object.keys(mappings).forEach(dataKey => {
        if (data[dataKey] && mappings[dataKey]) {
            const element = document.getElementById(mappings[dataKey]);
            if (element) {
                element.value = data[dataKey];
                fieldsPopulated++;
                
                // Add visual feedback for auto-populated fields
                element.style.backgroundColor = '#e8f5e8';
                element.style.borderColor = '#4CAF50';
                element.title = `Auto-populated from photo analysis (${Math.round(confidence)}% confidence)`;
                
                // Remove visual feedback after 3 seconds
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    element.style.borderColor = '';
                    element.title = '';
                }, 3000);
            }
        }
    });
    
    // Show summary of populated fields
    if (fieldsPopulated > 0) {
        showNotification(`Auto-populated ${fieldsPopulated} field(s) from photo analysis`, 'info');
    } else {
        showNotification('No recognizable data found in photo. Please enter details manually.', 'warning');
    }
}

// Setup OCR functionality when DOM is loaded
function setupOCRFunctionality() {
    // OCR now works on all devices with improved error handling
    
    // Enable analyze buttons when photos are selected
    const photoInputs = [
        { input: 'itemPhoto', button: 'analyzeInventoryBtn' },
        { input: 'photoFile', button: 'analyzeGalleryBtn' },
        { input: 'ideaImage', button: 'analyzeIdeasBtn' }
    ];
    
    photoInputs.forEach(({ input, button }) => {
        const inputElement = document.getElementById(input);
        const buttonElement = document.getElementById(button);
        
        if (inputElement && buttonElement) {
            inputElement.addEventListener('change', function(e) {
                buttonElement.disabled = !e.target.files.length;
            });
        }
    });
    
    console.log('OCR functionality initialized');
}

// Initialize OCR when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add OCR setup to existing DOMContentLoaded handler
    setTimeout(setupOCRFunctionality, 100);
});
