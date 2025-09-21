// Inventory Tab Module
// Handles inventory-specific functionality

function initInventoryTab() {
    console.log('🔄 Initializing Inventory tab...');
    loadInventoryTable();
    console.log('✅ Inventory tab initialized');
}

function loadInventoryTable() {
    const data = window.dataModule.getData();
    const tbody = document.getElementById('inventoryItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No inventory items found.</td></tr>';
        return;
    }
    
    // Filter items to show only inventory type
    const inventoryItems = data.inventory.filter(item => item.type === 'inventory');
    
    inventoryItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = `inventory-row status-${item.status}`;
        
        row.innerHTML = `
            <td>
                <div class="item-name">${item.description || 'Untitled Item'}</div>
                ${item.category ? `<div class="category-badge category-${item.category}">${item.category}</div>` : ''}
            </td>
            <td>
                <span class="quantity-badge">${item.quantity || 0}</span>
            </td>
            <td>
                <span class="status-badge status-${item.status}">${item.status}</span>
            </td>
            <td>${item.notes || ''}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editInventoryItem(${index})" title="Edit Item">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${index})" title="Delete Item">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function filterInventory() {
    const searchTerm = document.getElementById('inventorySearch')?.value || '';
    const statusFilter = document.getElementById('inventoryStatusFilter')?.value || '';
    const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || '';
    
    const filteredItems = window.dataModule.searchInventory(searchTerm, {
        status: statusFilter,
        category: categoryFilter
    }).filter(item => item.type === 'inventory');
    
    const tbody = document.getElementById('inventoryItemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No inventory items match your filters.</td></tr>';
        return;
    }
    
    filteredItems.forEach((item, index) => {
        const originalIndex = window.dataModule.getData().inventory.findIndex(i => i === item);
        
        const row = document.createElement('tr');
        row.className = `inventory-row status-${item.status}`;
        
        row.innerHTML = `
            <td>
                <div class="item-name">${item.description || 'Untitled Item'}</div>
                ${item.category ? `<div class="category-badge category-${item.category}">${item.category}</div>` : ''}
            </td>
            <td>
                <span class="quantity-badge">${item.quantity || 0}</span>
            </td>
            <td>
                <span class="status-badge status-${item.status}">${item.status}</span>
            </td>
            <td>${item.notes || ''}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editInventoryItem(${originalIndex})" title="Edit Item">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${originalIndex})" title="Delete Item">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function editInventoryItem(index) {
    // This would open the edit modal
    console.log('Edit inventory item:', index);
    // Implementation would go here
}

function deleteInventoryItem(index) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
        window.dataModule.deleteInventoryItem(index);
        loadInventoryTable();
    }
}

function openAddItemModal() {
    // This would open the add item modal
    console.log('Open add item modal');
    // Implementation would go here
}

// Make functions globally available
window.initInventoryTab = initInventoryTab;
window.loadInventoryTable = loadInventoryTable;
window.filterInventory = filterInventory;
window.editInventoryItem = editInventoryItem;
window.deleteInventoryItem = deleteInventoryItem;
window.openAddItemModal = openAddItemModal;
