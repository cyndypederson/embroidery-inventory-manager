// Data storage
let inventory = [];
let customers = [];
let sales = [];
let gallery = [];
let invoices = [];

// Authentication
let ADMIN_PASSWORD = 'embroidery2025'; // Default password - change this to your desired password
let isAuthenticated = false;

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
    if (currentPassword !== ADMIN_PASSWORD) {
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
    
    // Load sales for selection
    loadSalesForInvoice();
    
    // Show modal
    document.getElementById('invoiceModal').style.display = 'block';
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
    container.innerHTML = '';
    
    if (sales.length === 0) {
        container.innerHTML = '<p>No sales found. Please add some sales first.</p>';
        return;
    }
    
    sales.forEach((sale, index) => {
        const saleDiv = document.createElement('div');
        saleDiv.className = 'sale-item';
        saleDiv.innerHTML = `
            <label class="sale-checkbox">
                <input type="checkbox" name="selectedSales" value="${index}" checked>
                <span class="sale-info">
                    <strong>${sale.item}</strong> - ${sale.customer} - $${sale.salePrice} - ${sale.dateSold}
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
        .map(checkbox => sales[parseInt(checkbox.value)]);
    
    if (selectedSales.length === 0) {
        alert('Please select at least one sale to include in the invoice.');
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
    const businessName = "Cyndy's Embroidery";
    const businessAddress = "Your Business Address";
    const businessPhone = "Your Phone Number";
    const businessEmail = "your@email.com";
    
    return `
        <div class="invoice-document">
            <div class="invoice-header-section">
                <div class="business-info">
                    <h1>${businessName}</h1>
                    <p>${businessAddress}</p>
                    <p>Phone: ${businessPhone} | Email: ${businessEmail}</p>
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
                <p><strong>${invoice.customer}</strong></p>
            </div>
            
            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Customer</th>
                            <th>Date Sold</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.sales.map(sale => `
                            <tr>
                                <td>${sale.item}</td>
                                <td>${sale.customer}</td>
                                <td>${sale.dateSold}</td>
                                <td>$${sale.salePrice}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3"><strong>Total:</strong></td>
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
                <p>Payment due within 30 days.</p>
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
    
    loadInvoicesTable();
    document.getElementById('invoicesListModal').style.display = 'block';
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

// API base URL
const API_BASE = '';

// Authentication functions
function checkAuthentication() {
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
    if (tabName === 'sales' || tabName === 'reports') {
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
    initializeApp();
    loadDataFromAPI();
    updateLocationFilters();
    updateCustomerFilters();
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
    
    // Ensure sticky positioning works
    setupStickyElements();

    // Form submissions
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
    document.getElementById('addCustomerForm').addEventListener('submit', handleAddCustomer);
    document.getElementById('addSaleForm').addEventListener('submit', handleAddSale);
    document.getElementById('addPhotoForm').addEventListener('submit', handleAddPhoto);
    
    // Edit form event listener with error handling
    const editForm = document.getElementById('editItemForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditItem);
        console.log('Edit form event listener added');
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
    console.log('editItem called with index:', index); // Debug log
    
    const item = inventory[index];
    console.log('Item to edit:', item); // Debug log
    
    // Populate the edit form
    document.getElementById('editItemIndex').value = index;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemLocation').value = item.location || '';
    document.getElementById('editItemDescription').value = item.description || '';
    document.getElementById('editItemQuantity').value = item.quantity || 1;
    document.getElementById('editItemPrice').value = item.price || 0;
    document.getElementById('editItemStatus').value = item.status;
    document.getElementById('editItemPriority').value = item.priority || 'medium';
    document.getElementById('editItemDueDate').value = item.dueDate || '';
    document.getElementById('editItemNotes').value = item.notes || '';
    document.getElementById('editItemCategory').value = item.category || '';
    document.getElementById('editItemTags').value = item.tags || '';
    document.getElementById('editItemPatternLink').value = item.patternLink || '';
    
    // Calculate and set total value
    calculateEditTotalValue();
    
    // Populate customer dropdown
    populateCustomerSelect('editItemCustomer');
    document.getElementById('editItemCustomer').value = item.customer;
    
    // Show the edit modal
    document.getElementById('editItemModal').style.display = 'block';
    console.log('Edit modal should be visible now'); // Debug log
}

function handleEditItem(e) {
    e.preventDefault();
    
    console.log('Edit form submitted'); // Debug log
    
    // Basic validation
    const name = document.getElementById('editItemName').value.trim();
    
    if (!name) {
        showNotification('Please fill in the item name', 'error');
        return;
    }
    
    const index = parseInt(document.getElementById('editItemIndex').value);
    const quantity = parseInt(document.getElementById('editItemQuantity').value) || 1;
    const pricePerItem = parseFloat(document.getElementById('editItemPrice').value) || 0;
    const totalValue = quantity * pricePerItem;
    
    console.log('Updating item at index:', index); // Debug log
    
    // Update the item
    inventory[index] = {
        ...inventory[index],
        name: name,
        customer: document.getElementById('editItemCustomer').value,
        location: document.getElementById('editItemLocation').value.trim() || 'Not specified',
        description: document.getElementById('editItemDescription').value.trim() || '',
        quantity: quantity,
        price: pricePerItem,
        totalValue: totalValue,
        status: document.getElementById('editItemStatus').value,
        priority: document.getElementById('editItemPriority').value,
        dueDate: document.getElementById('editItemDueDate').value || null,
        notes: document.getElementById('editItemNotes').value.trim() || '',
        category: document.getElementById('editItemCategory').value || '',
        tags: document.getElementById('editItemTags').value.trim() || '',
        patternLink: document.getElementById('editItemPatternLink').value.trim() || ''
    };
    
    console.log('Item updated:', inventory[index]); // Debug log
    
    saveData();
    loadInventoryTable();
    updateCustomerFilters();
    
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
    if (tabName === 'inventory') {
        loadInventoryTable();
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
    }
}

function loadData() {
    cleanCopyText();
    loadInventoryTable();
    loadCustomersTable();
    loadWIPTab();
    loadGallery();
    loadSalesTable();
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
    
    // Group items by customer
    const groupedItems = {};
    inventory.forEach((item, index) => {
        const customer = item.customer || 'No Customer';
        if (!groupedItems[customer]) {
            groupedItems[customer] = [];
        }
        groupedItems[customer].push({ item, index });
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
        headerRow.onclick = () => toggleCustomerGroup(customer);
        
        // Calculate customer stats
        const totalProjects = customerItems.length;
        const pendingCount = customerItems.filter(({ item }) => item.status === 'pending').length;
        const inProgressCount = customerItems.filter(({ item }) => item.status === 'in-progress' || item.status === 'work-in-progress').length;
        const completedCount = customerItems.filter(({ item }) => item.status === 'completed').length;
        const soldCount = customerItems.filter(({ item }) => item.status === 'sold').length;
        
        headerRow.innerHTML = `
            <td colspan="9">
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
            if (item.status === 'pending') {
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
                        <button class="btn btn-secondary" onclick="editItem(${index})" title="Edit Item">
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
    populateCustomerSelect('itemCustomer');
    document.getElementById('addItemForm').reset();
    document.getElementById('addItemModal').style.display = 'block';
}

function handleAddItem(e) {
    e.preventDefault();
    
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    const pricePerItem = parseFloat(document.getElementById('itemPrice').value) || 0;
    const totalValue = quantity * pricePerItem;
    
    const newItem = {
        name: document.getElementById('itemName').value,
        customer: document.getElementById('itemCustomer').value,
        location: document.getElementById('itemLocation').value || 'Not specified',
        description: document.getElementById('itemDescription').value || '',
        quantity: quantity,
        price: pricePerItem,
        totalValue: totalValue,
        status: document.getElementById('itemStatus').value,
        priority: document.getElementById('itemPriority').value,
        dueDate: document.getElementById('itemDueDate').value || null,
        notes: document.getElementById('itemNotes').value || '',
        category: document.getElementById('itemCategory').value || '',
        tags: document.getElementById('itemTags').value || '',
        patternLink: document.getElementById('itemPatternLink').value || '',
        dateAdded: new Date().toISOString()
    };
    
    inventory.push(newItem);
    saveData();
    loadInventoryTable();
    updateLocationFilters();
    updateCustomerFilters();
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
        customer: document.getElementById('saleCustomer').value || item.customer || 'No Customer',
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
    
    inventory[index].status = newStatus;
    saveData();
    loadInventoryTable();
    showNotification(`Item status changed to ${statusNames[newStatus]}!`, 'success');
}

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

function copyItem(index) {
    const originalItem = inventory[index];
    
    // Create a copy with reset status
    const copiedItem = {
        ...originalItem,
        name: originalItem.name, // Keep original name
        status: 'pending', // Reset to pending for new copy
        dateAdded: new Date().toISOString(),
        dueDate: null, // Clear due date for copy
        notes: originalItem.notes || '' // Keep original notes without copy notation
    };
    
    // Add to inventory
    inventory.push(copiedItem);
    
    // Save data
    saveData();
    
    // Refresh the table
    loadInventoryTable();
    
    // Show success message
    showNotification('Item copied successfully!', 'success');
    
    console.log('Item copied:', copiedItem);
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
                <h1>✿ Customer List ✿</h1>
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
    console.log('Closing modal:', modalId); // Debug log
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        console.log('Modal closed successfully'); // Debug log
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
    // Check if we're on the WIP tab before updating
    const wipTab = document.getElementById('wip');
    if (!wipTab || !wipTab.classList.contains('active')) {
        console.log('WIP tab not active, skipping WIP update');
        return;
    }
    
    const wipItems = inventory.filter(item => 
        item.status === 'pending' || 
        item.status === 'in-progress' || 
        item.status === 'work-in-progress'
    );
    
    updateWIPStats(wipItems);
    loadWIPGrid(wipItems);
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
                    <button class="btn btn-primary" onclick="editItem(${originalIndex})">
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
    const item = inventory[index];
    const currentStatus = item.status;
    
    let newStatus;
    if (currentStatus === 'pending') {
        newStatus = 'in-progress';
    } else if (currentStatus === 'in-progress' || currentStatus === 'work-in-progress') {
        newStatus = 'completed';
    } else {
        showNotification('Item is not in a work in progress status', 'info');
        return;
    }
    
    if (confirm(`Mark "${item.name}" as ${newStatus.replace('-', ' ')}?`)) {
        item.status = newStatus;
        saveData();
        loadWIPTab();
        loadInventoryTable();
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
