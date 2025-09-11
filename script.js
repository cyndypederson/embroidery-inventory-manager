// Data storage
let inventory = [];
let customers = [];
let sales = [];
let gallery = [];

// API base URL
const API_BASE = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadDataFromAPI();
    updateLocationFilters();
});

function initializeApp() {
    // Tab navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Form submissions
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
    document.getElementById('addCustomerForm').addEventListener('submit', handleAddCustomer);
    document.getElementById('addSaleForm').addEventListener('submit', handleAddSale);
    document.getElementById('addPhotoForm').addEventListener('submit', handleAddPhoto);

    // Set today's date for sale date
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    
    // Check connection status
    checkConnectionStatus();
    
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

async function checkConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    try {
        const response = await fetch('/api/inventory');
        if (response.ok) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
            statusElement.className = 'status-indicator connected';
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Offline Mode';
        statusElement.className = 'status-indicator disconnected';
        // Fallback to localStorage
        loadDataFromLocalStorage();
    }
}

async function loadDataFromAPI() {
    try {
        const [inventoryRes, customersRes, salesRes, galleryRes] = await Promise.all([
            fetch('/api/inventory'),
            fetch('/api/customers'),
            fetch('/api/sales'),
            fetch('/api/gallery')
        ]);

        inventory = await inventoryRes.json();
        customers = await customersRes.json();
        sales = await salesRes.json();
        gallery = await galleryRes.json();

        loadData();
        updateConnectionStatus('connected');
    } catch (error) {
        console.log('API not available, using localStorage');
        loadDataFromLocalStorage();
        updateConnectionStatus('disconnected');
    }
}

function loadDataFromLocalStorage() {
    inventory = JSON.parse(localStorage.getItem('embroideryInventory')) || [];
    customers = JSON.parse(localStorage.getItem('embroideryCustomers')) || [];
    sales = JSON.parse(localStorage.getItem('embroiderySales')) || [];
    gallery = JSON.parse(localStorage.getItem('embroideryGallery')) || [];
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
    if (tabName === 'inventory') {
        loadInventoryTable();
    } else if (tabName === 'customers') {
        loadCustomersTable();
    } else if (tabName === 'gallery') {
        loadGallery();
    } else if (tabName === 'sales') {
        loadSalesTable();
    }
}

function loadData() {
    loadInventoryTable();
    loadCustomersTable();
    loadGallery();
    loadSalesTable();
    updateLocationFilters();
}

// API Functions
async function saveDataToAPI() {
    try {
        await Promise.all([
            fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inventory)
            }),
            fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customers)
            }),
            fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sales)
            }),
            fetch('/api/gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gallery)
            })
        ]);
    } catch (error) {
        console.log('API save failed, using localStorage');
        saveDataToLocalStorage();
    }
}

function saveDataToLocalStorage() {
    localStorage.setItem('embroideryInventory', JSON.stringify(inventory));
    localStorage.setItem('embroideryCustomers', JSON.stringify(customers));
    localStorage.setItem('embroiderySales', JSON.stringify(sales));
    localStorage.setItem('embroideryGallery', JSON.stringify(gallery));
}

function saveData() {
    // Try API first, fallback to localStorage
    saveDataToAPI();
    saveDataToLocalStorage();
}

// Inventory Management
function loadInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    inventory.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.description || '-'}</td>
            <td>${item.customer}</td>
            <td>${item.location}</td>
            <td><span class="status-badge status-${item.status}">${item.status}</span></td>
            <td>$${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</td>
            <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary" onclick="editItem(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-success" onclick="markAsSold(${index})" ${item.status === 'sold' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddItemModal() {
    populateCustomerSelect('itemCustomer');
    document.getElementById('addItemForm').reset();
    document.getElementById('addItemModal').style.display = 'block';
}

function handleAddItem(e) {
    e.preventDefault();
    
    const newItem = {
        name: document.getElementById('itemName').value,
        description: document.getElementById('itemDescription').value,
        customer: document.getElementById('itemCustomer').value,
        location: document.getElementById('itemLocation').value,
        price: parseFloat(document.getElementById('itemPrice').value) || 0,
        status: document.getElementById('itemStatus').value,
        dateAdded: new Date().toISOString()
    };
    
    inventory.push(newItem);
    saveData();
    loadInventoryTable();
    updateLocationFilters();
    closeModal('addItemModal');
    
    showNotification('Item added successfully!', 'success');
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
            <td>${customer.contact || '-'}</td>
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
    closeModal('addCustomerModal');
    
    showNotification('Customer added successfully!', 'success');
}

// Sales Management
function loadSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    sales.forEach((sale, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${sale.itemName}</strong></td>
            <td>${sale.customer}</td>
            <td>$${parseFloat(sale.price).toFixed(2)}</td>
            <td>${new Date(sale.dateSold).toLocaleDateString()}</td>
            <td>${sale.location}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-danger" onclick="deleteSale(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddSaleModal() {
    populateItemSelect('saleItem');
    document.getElementById('addSaleForm').reset();
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('addSaleModal').style.display = 'block';
}

function handleAddSale(e) {
    e.preventDefault();
    
    const selectedItemIndex = document.getElementById('saleItem').value;
    const item = inventory[selectedItemIndex];
    
    if (!item) {
        showNotification('Please select a valid item', 'error');
        return;
    }
    
    const newSale = {
        itemName: item.name,
        customer: item.customer,
        location: item.location,
        price: parseFloat(document.getElementById('salePrice').value),
        dateSold: document.getElementById('saleDate').value,
        itemIndex: selectedItemIndex
    };
    
    sales.push(newSale);
    
    // Update item status to sold
    inventory[selectedItemIndex].status = 'sold';
    
    saveData();
    loadSalesTable();
    loadInventoryTable();
    closeModal('addSaleModal');
    
    showNotification('Sale recorded successfully!', 'success');
}

// Utility Functions
function populateCustomerSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select Customer</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.name;
        option.textContent = customer.name;
        select.appendChild(option);
    });
}

function populateItemSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select Item</option>';
    inventory.forEach((item, index) => {
        if (item.status !== 'sold') {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${item.name} - ${item.customer} (${item.status})`;
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

function filterItems() {
    const searchTerm = document.getElementById('searchItems').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;
    
    const filteredItems = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                            item.description.toLowerCase().includes(searchTerm) ||
                            item.customer.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesLocation = !locationFilter || item.location === locationFilter;
        
        return matchesSearch && matchesStatus && matchesLocation;
    });
    
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    filteredItems.forEach((item, index) => {
        const originalIndex = inventory.indexOf(item);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.description || '-'}</td>
            <td>${item.customer}</td>
            <td>${item.location}</td>
            <td><span class="status-badge status-${item.status}">${item.status}</span></td>
            <td>$${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</td>
            <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary" onclick="editItem(${originalIndex})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-success" onclick="markAsSold(${originalIndex})" ${item.status === 'sold' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteItem(${originalIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Action Functions
function markAsSold(index) {
    if (confirm('Mark this item as sold?')) {
        inventory[index].status = 'sold';
        saveData();
        loadInventoryTable();
        showNotification('Item marked as sold!', 'success');
    }
}

function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        inventory.splice(index, 1);
        saveData();
        loadInventoryTable();
        showNotification('Item deleted successfully!', 'success');
    }
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

function deleteSale(index) {
    if (confirm('Are you sure you want to delete this sale record?')) {
        sales.splice(index, 1);
        saveData();
        loadSalesTable();
        showNotification('Sale record deleted!', 'success');
    }
}

// Reports
function generateInventoryReport() {
    const locationFilter = document.getElementById('reportLocationFilter').value;
    const statusFilter = document.getElementById('reportStatusFilter').value;
    
    let filteredItems = inventory;
    
    if (locationFilter) {
        filteredItems = filteredItems.filter(item => item.location === locationFilter);
    }
    
    if (statusFilter) {
        filteredItems = filteredItems.filter(item => item.status === statusFilter);
    }
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <div class="printable-report">
            <h3>Embroidery Inventory Report</h3>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Location:</strong> ${locationFilter || 'All Locations'}</p>
            <p><strong>Status:</strong> ${statusFilter || 'All Status'}</p>
            <p><strong>Total Items:</strong> ${filteredItems.length}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Customer</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th>Date Added</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.customer}</td>
                            <td>${item.location}</td>
                            <td>${item.status}</td>
                            <td>$${item.price ? parseFloat(item.price).toFixed(2) : '0.00'}</td>
                            <td>${new Date(item.dateAdded).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function printLocationInventory() {
    generateInventoryReport();
    window.print();
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
    document.getElementById(modalId).style.display = 'none';
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
