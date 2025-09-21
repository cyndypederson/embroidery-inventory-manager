// Data Module
// Handles data storage and management

// Data storage
let inventory = [];
let customers = [];
let sales = [];
let gallery = [];
let invoices = [];
let ideas = [];

// Global data reference for backward compatibility
window.inventory = inventory;
window.customers = customers;
window.sales = sales;
window.gallery = gallery;
window.invoices = invoices;
window.ideas = ideas;

function getData() {
    return { inventory, customers, sales, gallery, invoices, ideas };
}

function setData(newData) {
    inventory = newData.inventory || [];
    customers = newData.customers || [];
    sales = newData.sales || [];
    gallery = newData.gallery || [];
    ideas = newData.ideas || [];
    
    // Update global references
    window.inventory = inventory;
    window.customers = customers;
    window.sales = sales;
    window.gallery = gallery;
    window.ideas = ideas;
}

function loadDataFromLocalStorage() {
    inventory = JSON.parse(localStorage.getItem('embroideryInventory')) || [];
    customers = JSON.parse(localStorage.getItem('embroideryCustomers')) || [];
    sales = JSON.parse(localStorage.getItem('embroiderySales')) || [];
    gallery = JSON.parse(localStorage.getItem('embroideryGallery')) || [];
    ideas = JSON.parse(localStorage.getItem('embroideryIdeas')) || [];
    
    // Update global references
    window.inventory = inventory;
    window.customers = customers;
    window.sales = sales;
    window.gallery = gallery;
    window.ideas = ideas;
    
    console.log('📱 Data loaded from localStorage:');
    console.log('  📦 Inventory items:', inventory.length);
    console.log('  👥 Customers:', customers.length);
    console.log('  💰 Sales records:', sales.length);
    console.log('  🖼️ Gallery items:', gallery.length);
    console.log('  💡 Ideas:', ideas.length);
}

function saveDataToLocalStorage() {
    localStorage.setItem('embroideryInventory', JSON.stringify(inventory));
    localStorage.setItem('embroideryCustomers', JSON.stringify(customers));
    localStorage.setItem('embroiderySales', JSON.stringify(sales));
    localStorage.setItem('embroideryGallery', JSON.stringify(gallery));
    localStorage.setItem('embroideryIdeas', JSON.stringify(ideas));
}

function saveData() {
    // Try API first, fallback to localStorage
    window.apiModule.saveDataToAPI();
    saveDataToLocalStorage();
}

// Invoice management
function loadInvoicesFromLocalStorage() {
    invoices = JSON.parse(localStorage.getItem('embroideryInvoices')) || [];
}

function saveInvoicesToLocalStorage() {
    localStorage.setItem('embroideryInvoices', JSON.stringify(invoices));
}

// Data manipulation functions
function addInventoryItem(item) {
    inventory.push(item);
    saveData();
}

function updateInventoryItem(index, item) {
    inventory[index] = item;
    saveData();
}

function deleteInventoryItem(index) {
    inventory.splice(index, 1);
    saveData();
}

function addCustomer(customer) {
    customers.push(customer);
    saveData();
}

function updateCustomer(index, customer) {
    customers[index] = customer;
    saveData();
}

function deleteCustomer(index) {
    customers.splice(index, 1);
    saveData();
}

function addSale(sale) {
    sales.push(sale);
    saveData();
}

function updateSale(index, sale) {
    sales[index] = sale;
    saveData();
}

function deleteSale(index) {
    sales.splice(index, 1);
    saveData();
}

function addGalleryItem(item) {
    gallery.push(item);
    saveData();
}

function updateGalleryItem(index, item) {
    gallery[index] = item;
    saveData();
}

function deleteGalleryItem(index) {
    gallery.splice(index, 1);
    saveData();
}

function addIdea(idea) {
    ideas.push(idea);
    saveData();
}

function updateIdea(index, idea) {
    ideas[index] = idea;
    saveData();
}

function deleteIdea(index) {
    ideas.splice(index, 1);
    saveData();
}

function addInvoice(invoice) {
    invoices.push(invoice);
    saveInvoicesToLocalStorage();
}

function updateInvoice(index, invoice) {
    invoices[index] = invoice;
    saveInvoicesToLocalStorage();
}

function deleteInvoice(index) {
    invoices.splice(index, 1);
    saveInvoicesToLocalStorage();
}

// Search and filter functions
function searchInventory(query, filters = {}) {
    return inventory.filter(item => {
        const matchesQuery = !query || 
            item.description?.toLowerCase().includes(query.toLowerCase()) ||
            item.notes?.toLowerCase().includes(query.toLowerCase());
        
        const matchesStatus = !filters.status || item.status === filters.status;
        const matchesCategory = !filters.category || item.category === filters.category;
        const matchesCustomer = !filters.customer || item.customer === filters.customer;
        
        return matchesQuery && matchesStatus && matchesCategory && matchesCustomer;
    });
}

function searchCustomers(query) {
    return customers.filter(customer => 
        !query || 
        customer.name?.toLowerCase().includes(query.toLowerCase()) ||
        customer.location?.toLowerCase().includes(query.toLowerCase()) ||
        customer.contact?.toLowerCase().includes(query.toLowerCase())
    );
}

function searchSales(query, filters = {}) {
    return sales.filter(sale => {
        const matchesQuery = !query || 
            sale.item?.toLowerCase().includes(query.toLowerCase()) ||
            sale.customer?.toLowerCase().includes(query.toLowerCase());
        
        const matchesDate = !filters.date || sale.saleDate === filters.date;
        
        return matchesQuery && matchesDate;
    });
}

function searchGallery(query, filters = {}) {
    return gallery.filter(item => {
        const matchesQuery = !query || 
            item.title?.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase());
        
        const matchesStatus = !filters.status || item.status === filters.status;
        
        return matchesQuery && matchesStatus;
    });
}

function searchIdeas(query, filters = {}) {
    return ideas.filter(idea => {
        const matchesQuery = !query || 
            idea.title?.toLowerCase().includes(query.toLowerCase()) ||
            idea.description?.toLowerCase().includes(query.toLowerCase());
        
        const matchesCategory = !filters.category || idea.category === filters.category;
        const matchesStatus = !filters.status || idea.status === filters.status;
        
        return matchesQuery && matchesCategory && matchesStatus;
    });
}

// Initialize data module
function initData() {
    // Load data from localStorage first
    loadDataFromLocalStorage();
    
    // Load invoices
    loadInvoicesFromLocalStorage();
    
    // Then try to load from API
    window.apiModule.loadDataFromAPI();
}

// Export functions for use in other modules
window.dataModule = {
    getData,
    setData,
    loadDataFromLocalStorage,
    saveDataToLocalStorage,
    saveData,
    loadInvoicesFromLocalStorage,
    saveInvoicesToLocalStorage,
    
    // Data manipulation
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSale,
    updateSale,
    deleteSale,
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    addIdea,
    updateIdea,
    deleteIdea,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    
    // Search functions
    searchInventory,
    searchCustomers,
    searchSales,
    searchGallery,
    searchIdeas,
    
    initData
};
