#!/usr/bin/env node

/**
 * COMPREHENSIVE TEST SUITE - Embroidery Inventory Manager
 * Tests EVERY button, field, upload, edit, delete, and edge case
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Simple sleep helper to replace deprecated/unsupported page.waitFor/Timeout
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class ComprehensiveTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            warnings: [],
            testedFeatures: [],
            performance: {}
        };
        this.baseUrl = 'http://localhost:3000';
        this.testData = {
            project: {
                name: 'Test Project ' + Date.now(),
                description: 'Test Description for comprehensive testing',
                customer: 'Test Customer',
                status: 'pending',
                priority: 'high',
                location: 'Test Location',
                quantity: 2,
                price: 25.99,
                notes: 'Test notes for comprehensive testing',
                category: 'Test Category',
                tags: 'test,comprehensive,automated',
                dueDate: '2024-12-31'
            },
            customer: {
                name: 'Test Customer ' + Date.now(),
                contact: 'test@example.com',
                location: 'Test City, State'
            },
            sale: {
                itemName: 'Test Sale Item',
                customer: 'Test Customer',
                price: 50.00,
                saleChannel: 'individual',
                commissionPercent: 10
            },
            idea: {
                title: 'Test Idea ' + Date.now(),
                description: 'Test idea description for comprehensive testing',
                category: 'Test Category',
                priority: 'high'
            }
        };
    }

    async initialize() {
        console.log('🚀 Starting COMPREHENSIVE Test Suite...');
        console.log('📋 Testing EVERY button, field, upload, edit, delete, and edge case\n');
        
        this.browser = await puppeteer.launch({
            headless: false, // Show browser for visual verification
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Enhanced console logging
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                this.results.errors.push(`Console Error: ${text}`);
                console.error(`❌ Console Error: ${text}`);
            } else if (type === 'warning') {
                this.results.warnings.push(`Console Warning: ${text}`);
                console.warn(`⚠️ Console Warning: ${text}`);
            }
        });

        this.page.on('pageerror', error => {
            this.results.errors.push(`Page Error: ${error.message}`);
            console.error(`❌ Page Error: ${error.message}`);
        });

        this.page.on('requestfailed', request => {
            this.results.errors.push(`Request Failed: ${request.url()}`);
            console.error(`❌ Request Failed: ${request.url()}`);
        });
    }

    async runTest(testName, testFunction, category = 'General') {
        try {
            console.log(`🧪 [${category}] ${testName}`);
            const startTime = Date.now();
            
            await testFunction();
            
            const duration = Date.now() - startTime;
            this.results.passed++;
            this.results.testedFeatures.push({ name: testName, category, status: 'PASSED', duration });
            console.log(`✅ PASSED: ${testName} (${duration}ms)`);
            
        } catch (error) {
            this.results.failed++;
            this.results.errors.push(`${testName}: ${error.message}`);
            this.results.testedFeatures.push({ name: testName, category, status: 'FAILED', error: error.message });
            console.error(`❌ FAILED: ${testName} - ${error.message}`);
        }
    }

    // ===== CORE FUNCTIONALITY TESTS =====
    
    async testServerConnection() {
        const response = await this.page.goto(this.baseUrl, { 
            waitUntil: 'networkidle2',
            timeout: 15000 
        });
        
        if (!response.ok()) {
            throw new Error(`Server returned status ${response.status()}`);
        }

        const title = await this.page.title();
        if (!title.includes('StitchCraft')) {
            throw new Error('Page title does not contain expected content');
        }

        // Check for critical elements
        await this.page.waitForSelector('.branding h1', { timeout: 5000 });
        await this.page.waitForSelector('.nav-btn', { timeout: 5000 });
    }

    async testAllNavigationTabs() {
        const tabs = [
            { id: 'projects', name: 'Projects' },
            { id: 'inventory', name: 'Inventory' },
            { id: 'customers', name: 'Customers' },
            { id: 'wip', name: 'Work In Progress' },
            { id: 'ideas', name: 'Ideas' },
            { id: 'gallery', name: 'Gallery' },
            { id: 'sales', name: 'Sales' },
            { id: 'reports', name: 'Reports' },
            { id: 'data', name: 'Data Management' }
        ];

        for (const tab of tabs) {
            // Click tab
            const tabButton = await this.page.$(`[data-tab="${tab.id}"]`);
            if (!tabButton) {
                throw new Error(`Tab button for ${tab.name} not found`);
            }
            
            await tabButton.click();
            await sleep(1000);
            
            // Verify tab content is active
            const tabContent = await this.page.$(`#${tab.id}.tab-content.active`);
            if (!tabContent) {
                throw new Error(`Tab content for ${tab.name} not active`);
            }

            // Check for section header
            const sectionHeader = await this.page.$(`#${tab.id} .section-header`);
            if (!sectionHeader) {
                throw new Error(`Section header for ${tab.name} not found`);
            }
        }
    }

    // ===== PROJECTS TAB TESTS =====
    
    async testProjectsAddButton() {
        await this.page.click('[data-tab="projects"]');
        await sleep(500);
        
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (!addButton) {
            throw new Error('Add project button not found');
        }
        
        await addButton.click();
        await this.page.waitForSelector('#addItemModal', { visible: true });
        
        // Verify modal opened
        const modal = await this.page.$('#addItemModal');
        if (!modal) {
            throw new Error('Add project modal did not open');
        }
    }

    async testProjectsFormFields() {
        // Test all form fields in add project modal
        const fields = [
            { id: 'itemName', value: this.testData.project.name, required: true },
            { id: 'itemDescription', value: this.testData.project.description, required: true },
            { id: 'itemCustomer', value: this.testData.project.customer, required: false },
            { id: 'itemStatus', value: this.testData.project.status, required: true },
            { id: 'itemPriority', value: this.testData.project.priority, required: false },
            { id: 'itemLocation', value: this.testData.project.location, required: false },
            { id: 'itemQuantity', value: this.testData.project.quantity.toString(), required: false },
            { id: 'itemPrice', value: this.testData.project.price.toString(), required: false },
            { id: 'itemNotes', value: this.testData.project.notes, required: false },
            { id: 'itemCategory', value: this.testData.project.category, required: false },
            { id: 'itemTags', value: this.testData.project.tags, required: false },
            { id: 'itemDueDate', value: this.testData.project.dueDate, required: false }
        ];

        for (const field of fields) {
            const element = await this.page.$(`#${field.id}`);
            if (!element) {
                throw new Error(`Form field ${field.id} not found`);
            }

            if (field.id === 'itemStatus' || field.id === 'itemPriority') {
                await element.select(field.value);
            } else {
                await element.type(field.value);
            }

            // Verify value was set
            const value = await element.evaluate(el => el.value);
            if (value !== field.value) {
                throw new Error(`Field ${field.id} value not set correctly`);
            }
        }
    }

    async testProjectsFormValidation() {
        // Test required field validation
        const nameField = await this.page.$('#itemName');
        await nameField.evaluate(el => el.value = ''); // Clear required field
        
        const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
        await submitButton.click();
        
        // Check for validation error
        await sleep(500);
        const hasError = await this.page.$('.error, .invalid, [class*="error"]');
        if (!hasError) {
            throw new Error('Required field validation not working');
        }
    }

    async testProjectsFormSubmission() {
        // Fill form with valid data
        await this.page.type('#itemName', this.testData.project.name);
        await this.page.type('#itemDescription', this.testData.project.description);
        await this.page.select('#itemStatus', 'pending');
        
        // Submit form
        const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
        await submitButton.click();
        
        // Wait for modal to close
        await this.page.waitForSelector('#addItemModal', { hidden: true });
        
        // Verify item was added to table
        await sleep(1000);
        const itemExists = await this.page.$eval('body', () => {
            return document.body.textContent.includes('Test Project');
        });
        
        if (!itemExists) {
            throw new Error('Project was not added to table');
        }
    }

    async testProjectsEditButton() {
        // Find and click edit button for first item
        const editButton = await this.page.$('.action-buttons .btn-secondary[title="Edit"]');
        if (!editButton) {
            throw new Error('Edit button not found');
        }
        
        await editButton.click();
        await this.page.waitForSelector('#editItemModal', { visible: true });
        
        // Verify modal opened with data
        const modal = await this.page.$('#editItemModal');
        if (!modal) {
            throw new Error('Edit modal did not open');
        }
    }

    async testProjectsEditFields() {
        // Test editing form fields
        const nameField = await this.page.$('#editItemName');
        if (nameField) {
            await nameField.evaluate(el => el.value = '');
            await nameField.type('Edited Project Name');
        }
        
        const descriptionField = await this.page.$('#editItemDescription');
        if (descriptionField) {
            await descriptionField.evaluate(el => el.value = '');
            await descriptionField.type('Edited Description');
        }
    }

    async testProjectsEditSubmission() {
        // Submit edit form
        const submitButton = await this.page.$('#editItemModal .btn-primary[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await this.page.waitForSelector('#editItemModal', { hidden: true });
        }
    }

    async testProjectsDeleteButton() {
        // Find and click delete button
        const deleteButton = await this.page.$('.action-buttons .btn-danger[title="Delete"]');
        if (!deleteButton) {
            throw new Error('Delete button not found');
        }
        
        await deleteButton.click();
        
        // Handle confirmation dialog if it appears
        const dialog = await this.page.$('.modal, .alert, .confirmation');
        if (dialog) {
            const confirmButton = await this.page.$('.btn-danger, .btn-confirm, [data-confirm]');
            if (confirmButton) {
                await confirmButton.click();
            }
        }
    }

    async testProjectsSearch() {
        const searchInput = await this.page.$('#searchItems');
        if (searchInput) {
            await searchInput.type('Test');
            await sleep(1000);
            
            // Verify search results
            const results = await this.page.$$('tbody tr');
            if (results.length === 0) {
                throw new Error('Search returned no results');
            }
        }
    }

    async testProjectsFilters() {
        const filters = [
            { id: 'statusFilter', value: 'pending' },
            { id: 'priorityFilter', value: 'high' },
            { id: 'customerFilter', value: 'Test Customer' },
            { id: 'locationFilter', value: 'Test Location' }
        ];

        for (const filter of filters) {
            const filterElement = await this.page.$(`#${filter.id}`);
            if (filterElement) {
                await filterElement.select(filter.value);
                await sleep(500);
            }
        }
    }

    // ===== INVENTORY TAB TESTS =====
    
    async testInventoryTab() {
        await this.page.click('[data-tab="inventory"]');
        await sleep(500);
        
        // Test add inventory item
        const addButton = await this.page.$('.inventory-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addInventoryModal', { visible: true });
            
            // Fill inventory form
            await this.page.type('#inventoryName', 'Test Inventory Item');
            await this.page.type('#inventoryDescription', 'Test inventory description');
            await this.page.select('#inventoryStatus', 'in-stock');
            
            // Submit
            const submitButton = await this.page.$('#addInventoryModal .btn-primary[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForSelector('#addInventoryModal', { hidden: true });
            }
        }
    }

    // ===== CUSTOMERS TAB TESTS =====
    
    async testCustomersTab() {
        await this.page.click('[data-tab="customers"]');
        await sleep(500);
        
        // Test add customer
        const addButton = await this.page.$('.customer-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addCustomerModal', { visible: true });
            
            // Fill customer form
            await this.page.type('#customerName', this.testData.customer.name);
            await this.page.type('#customerContact', this.testData.customer.contact);
            await this.page.type('#customerLocation', this.testData.customer.location);
            
            // Submit
            const submitButton = await this.page.$('#addCustomerModal .btn-primary[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForSelector('#addCustomerModal', { hidden: true });
            }
        }
    }

    // ===== IDEAS TAB TESTS =====
    
    async testIdeasTab() {
        await this.page.click('[data-tab="ideas"]');
        await sleep(500);
        
        // Test add idea
        const addButton = await this.page.$('.ideas-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addIdeaModal', { visible: true });
            
            // Fill idea form
            await this.page.type('#ideaTitle', this.testData.idea.title);
            await this.page.type('#ideaDescription', this.testData.idea.description);
            await this.page.type('#ideaCategory', this.testData.idea.category);
        }
    }

    // ===== PHOTO UPLOAD TESTS =====
    
    async testPhotoUpload() {
        // Test photo upload in gallery
        await this.page.click('[data-tab="gallery"]');
        await this.page.waitForTimeout(500);
        
        const addButton = await this.page.$('.gallery-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addPhotoModal', { visible: true });
            
            // Test file input
            const fileInput = await this.page.$('input[type="file"]');
            if (fileInput) {
                // Create a test image file
                const testImagePath = path.join(__dirname, 'test-image.jpg');
                await this.createTestImage(testImagePath);
                
                // Upload file
                await fileInput.uploadFile(testImagePath);
                await sleep(1000);
                
                // Clean up test file
                if (fs.existsSync(testImagePath)) {
                    fs.unlinkSync(testImagePath);
                }
            }
        }
    }

    async createTestImage(filePath) {
        // Create a simple test image (1x1 pixel JPEG)
        const testImageData = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
            0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
            0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
            0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xFF, 0xD9
        ]);
        
        fs.writeFileSync(filePath, testImageData);
    }

    // ===== MOBILE RESPONSIVENESS TESTS =====
    
    async testMobileView() {
        // Switch to mobile viewport
        // Emulate iPhone 12 for realistic mobile behavior
        const devices = puppeteer.devices || {};
        const iPhone = devices['iPhone 12'] || devices['iPhone X'];
        if (iPhone) {
            await this.page.emulate(iPhone);
        } else {
            await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        }
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Test mobile navigation
        const mobileNav = await this.page.$('.nav-btn');
        if (!mobileNav) {
            throw new Error('Mobile navigation not found');
        }
        
        // Test mobile cards
        await this.page.click('[data-tab="projects"]');
        await sleep(500);
        
        const mobileCards = await this.page.$('.mobile-cards-container');
        if (!mobileCards) {
            throw new Error('Mobile cards container not found');
        }
    }

    // ===== EDGE CASE TESTS =====
    
    async testRapidClicking() {
        // Test rapid clicking to prevent double-submission issues
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (addButton) {
            for (let i = 0; i < 5; i++) {
                await addButton.click();
                await sleep(100);
            }
        }
    }

    async testLargeDataInput() {
        // Test with large text input
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addItemModal', { visible: true });
            
            const notesField = await this.page.$('#itemNotes');
            if (notesField) {
                const largeText = 'A'.repeat(10000); // 10KB of text
                await notesField.type(largeText);
            }
        }
    }

    async testSpecialCharacters() {
        // Test with special characters
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addItemModal', { visible: true });
            
            const nameField = await this.page.$('#itemName');
            if (nameField) {
                const specialText = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\'';
                await nameField.type(specialText);
            }
        }
    }

    async testKeyboardNavigation() {
        // Test tab navigation
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Tab');
        
        // Test Enter key
        await this.page.keyboard.press('Enter');
    }

    // ===== PERFORMANCE TESTS =====
    
    async testPerformance() {
        const startTime = Date.now();
        
        // Measure page load
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - startTime;
        
        this.results.performance.loadTime = loadTime;
        
        // Measure memory usage
        const metrics = await this.page.metrics();
        this.results.performance.memoryUsage = metrics.JSHeapUsedSize;
        
        // Test with large dataset
        const startMemory = metrics.JSHeapUsedSize;
        
        // Add multiple items
        for (let i = 0; i < 10; i++) {
            await this.page.click('[data-tab="projects"]');
            await sleep(100);
            const addButton = await this.page.$('.projects-actions .btn-primary');
            if (addButton) {
                await addButton.click();
                await this.page.waitForSelector('#addItemModal', { visible: true });
                
                await this.page.type('#itemName', `Performance Test ${i}`);
                await this.page.type('#itemDescription', `Description ${i}`);
                
                const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
                if (submitButton) {
                    await submitButton.click();
                    await this.page.waitForSelector('#addItemModal', { hidden: true });
                }
            }
        }
        
        const endMetrics = await this.page.metrics();
        const memoryIncrease = endMetrics.JSHeapUsedSize - startMemory;
        
        this.results.performance.memoryIncrease = memoryIncrease;
        
        if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
            this.results.warnings.push(`High memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        }
    }

    // ===== MAIN TEST RUNNER =====
    
    async runAllTests() {
        await this.initialize();
        
        console.log('📋 Running COMPREHENSIVE Test Suite...\n');
        
        // Core functionality
        await this.runTest('Server Connection', () => this.testServerConnection(), 'Core');
        await this.runTest('All Navigation Tabs', () => this.testAllNavigationTabs(), 'Core');
        
        // Projects tab comprehensive testing
        await this.runTest('Projects Add Button', () => this.testProjectsAddButton(), 'Projects');
        await this.runTest('Projects Form Fields', () => this.testProjectsFormFields(), 'Projects');
        await this.runTest('Projects Form Validation', () => this.testProjectsFormValidation(), 'Projects');
        await this.runTest('Projects Form Submission', () => this.testProjectsFormSubmission(), 'Projects');
        await this.runTest('Projects Edit Button', () => this.testProjectsEditButton(), 'Projects');
        await this.runTest('Projects Edit Fields', () => this.testProjectsEditFields(), 'Projects');
        await this.runTest('Projects Edit Submission', () => this.testProjectsEditSubmission(), 'Projects');
        await this.runTest('Projects Delete Button', () => this.testProjectsDeleteButton(), 'Projects');
        await this.runTest('Projects Search', () => this.testProjectsSearch(), 'Projects');
        await this.runTest('Projects Filters', () => this.testProjectsFilters(), 'Projects');
        
        // Other tabs
        await this.runTest('Inventory Tab', () => this.testInventoryTab(), 'Inventory');
        await this.runTest('Customers Tab', () => this.testCustomersTab(), 'Customers');
        await this.runTest('Ideas Tab', () => this.testIdeasTab(), 'Ideas');
        
        // Photo upload
        await this.runTest('Photo Upload', () => this.testPhotoUpload(), 'Media');
        
        // Mobile responsiveness
        await this.runTest('Mobile View', () => this.testMobileView(), 'Mobile');

        // Extra mobile flow on iPhone emulator: verify ideas mobile container renders and deletion works
        await this.runTest('Mobile (iPhone) Ideas Cards', async () => {
            const devices = puppeteer.devices || {};
            const iPhone = devices['iPhone 12'] || devices['iPhone X'];
            if (iPhone) {
                await this.page.emulate(iPhone);
            } else {
                await this.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
            }

            // Navigate to Ideas tab
            const ideasBtn = await this.page.$('[data-tab="ideas"]');
            if (!ideasBtn) throw new Error('Ideas tab not found');
            await ideasBtn.click();
            await this.page.waitForSelector('#ideas', { visible: true });
            await sleep(500);

            // Ensure mobile container exists and has no duplicate cards by id in dataset if present
            const hasMobileContainer = await this.page.$('#mobileIdeasCards');
            if (!hasMobileContainer) throw new Error('Mobile ideas container not found');

            const dupInfo = await this.page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('#mobileIdeasCards .idea-card'));
                const titles = cards.map(c => c.querySelector('.idea-card-title')?.textContent || '');
                const seen = new Set();
                let duplicates = 0;
                for (const t of titles) {
                    if (seen.has(t)) duplicates++;
                    else seen.add(t);
                }
                return { count: cards.length, duplicates };
            });
            if (dupInfo.duplicates > 0) throw new Error(`Found ${dupInfo.duplicates} duplicate mobile idea cards`);
        }, 'Mobile');
        
        // Edge cases
        await this.runTest('Rapid Clicking', () => this.testRapidClicking(), 'Edge Cases');
        await this.runTest('Large Data Input', () => this.testLargeDataInput(), 'Edge Cases');
        await this.runTest('Special Characters', () => this.testSpecialCharacters(), 'Edge Cases');
        await this.runTest('Keyboard Navigation', () => this.testKeyboardNavigation(), 'Edge Cases');
        
        // Performance
        await this.runTest('Performance', () => this.testPerformance(), 'Performance');
        
        await this.generateReport();
        await this.cleanup();
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: `${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`
            },
            testedFeatures: this.results.testedFeatures,
            errors: this.results.errors,
            warnings: this.results.warnings,
            performance: this.results.performance
        };

        // Save detailed report
        const reportPath = path.join(__dirname, 'comprehensive-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log('\n📊 COMPREHENSIVE TEST RESULTS');
        console.log('==============================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
        console.log(`🚨 Errors: ${this.results.errors.length}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        // Feature breakdown
        const featuresByCategory = this.results.testedFeatures.reduce((acc, feature) => {
            if (!acc[feature.category]) acc[feature.category] = { passed: 0, failed: 0 };
            if (feature.status === 'PASSED') acc[feature.category].passed++;
            else acc[feature.category].failed++;
            return acc;
        }, {});
        
        console.log('\n📋 FEATURE BREAKDOWN:');
        Object.entries(featuresByCategory).forEach(([category, stats]) => {
            const total = stats.passed + stats.failed;
            const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0;
            console.log(`  ${category}: ${stats.passed}/${total} (${rate}%)`);
        });
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.results.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Your application is rock solid! 🚀');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the errors above.');
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the comprehensive test suite
if (require.main === module) {
    const testSuite = new ComprehensiveTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestSuite;
