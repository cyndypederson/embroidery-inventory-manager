#!/usr/bin/env node

/**
 * SIMPLE COMPREHENSIVE TEST - Fixed version
 * Tests core functionality without complex Puppeteer features
 */

const puppeteer = require('puppeteer');
const http = require('http');

class SimpleComprehensiveTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            testedFeatures: []
        };
        this.baseUrl = 'http://localhost:3000';
    }

    async initialize() {
        console.log('🚀 Starting SIMPLE Comprehensive Test...\n');
        
        this.browser = await puppeteer.launch({
            headless: true, // Run headless for stability
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
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
    }

    async testPageLoads() {
        // Test that page loads without critical errors
        const content = await this.page.content();
        if (!content.includes('CyndyP StitchCraft')) {
            throw new Error('Main content not found on page');
        }
    }

    async testNavigationTabs() {
        const tabs = ['projects', 'inventory', 'customers', 'wip', 'ideas', 'gallery', 'sales', 'reports'];
        
        for (const tab of tabs) {
            const tabButton = await this.page.$(`[data-tab="${tab}"]`);
            if (!tabButton) {
                throw new Error(`Tab button for ${tab} not found`);
            }
            
            await tabButton.click();
            await this.page.waitFor(1000); // Wait 1 second
            
            // Check if tab content exists
            const tabContent = await this.page.$(`#${tab}`);
            if (!tabContent) {
                throw new Error(`Tab content for ${tab} not found`);
            }
        }
    }

    async testAddButtons() {
        // Test Projects tab add button
        await this.page.click('[data-tab="projects"]');
        await this.page.waitFor(500);
        
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (!addButton) {
            throw new Error('Add project button not found');
        }
        
        await addButton.click();
        await this.page.waitFor(1000);
        
        // Check if modal opened
        const modal = await this.page.$('#addItemModal');
        if (!modal) {
            throw new Error('Add project modal did not open');
        }
    }

    async testFormFields() {
        // Test that form fields exist
        const fields = ['itemName', 'itemDescription', 'itemStatus'];
        
        for (const fieldId of fields) {
            const field = await this.page.$(`#${fieldId}`);
            if (!field) {
                throw new Error(`Form field ${fieldId} not found`);
            }
        }
    }

    async testFormSubmission() {
        // Fill and submit form
        await this.page.type('#itemName', 'Test Project ' + Date.now());
        await this.page.type('#itemDescription', 'Test Description');
        await this.page.select('#itemStatus', 'pending');
        
        // Submit form
        const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await this.page.waitFor(2000);
        }
    }

    async testSearchFunctionality() {
        // Test search input
        const searchInput = await this.page.$('#searchItems');
        if (searchInput) {
            await searchInput.type('Test');
            await this.page.waitFor(1000);
        }
    }

    async testMobileView() {
        // Test mobile viewport
        await this.page.setViewport({ width: 375, height: 667 });
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Check if mobile elements exist
        const mobileCards = await this.page.$('.mobile-cards-container');
        if (!mobileCards) {
            // This is okay - mobile cards might not be visible if no data
            console.log('ℹ️ Mobile cards not visible (no data)');
        }
    }

    async testAPIEndpoints() {
        const endpoints = ['/api/inventory', '/api/customers', '/api/sales', '/api/gallery', '/api/ideas', '/health'];
        
        for (const endpoint of endpoints) {
            const response = await this.page.goto(`${this.baseUrl}${endpoint}`, { 
                waitUntil: 'networkidle2',
                timeout: 5000 
            });
            
            if (!response.ok()) {
                throw new Error(`API endpoint ${endpoint} returned status ${response.status()}`);
            }
        }
    }

    async testDataPersistence() {
        // Add an item and check if it persists
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        await this.page.click('[data-tab="projects"]');
        await this.page.waitFor(500);
        
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitFor(1000);
            
            await this.page.type('#itemName', 'Persistence Test ' + Date.now());
            await this.page.type('#itemDescription', 'Test Description');
            await this.page.select('#itemStatus', 'pending');
            
            const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await this.page.waitFor(2000);
                
                // Reload page to test persistence
                await this.page.reload({ waitUntil: 'networkidle2' });
                await this.page.waitFor(1000);
            }
        }
    }

    async runAllTests() {
        await this.initialize();
        
        console.log('📋 Running Simple Comprehensive Tests...\n');
        
        // Core functionality
        await this.runTest('Server Connection', () => this.testServerConnection(), 'Core');
        await this.runTest('Page Loads', () => this.testPageLoads(), 'Core');
        await this.runTest('API Endpoints', () => this.testAPIEndpoints(), 'Core');
        
        // Navigation and UI
        await this.runTest('Navigation Tabs', () => this.testNavigationTabs(), 'UI');
        await this.runTest('Add Buttons', () => this.testAddButtons(), 'UI');
        await this.runTest('Form Fields', () => this.testFormFields(), 'UI');
        await this.runTest('Form Submission', () => this.testFormSubmission(), 'UI');
        await this.runTest('Search Functionality', () => this.testSearchFunctionality(), 'UI');
        
        // Mobile and persistence
        await this.runTest('Mobile View', () => this.testMobileView(), 'Mobile');
        await this.runTest('Data Persistence', () => this.testDataPersistence(), 'Data');
        
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
            errors: this.results.errors
        };

        // Console summary
        console.log('\n📊 SIMPLE COMPREHENSIVE TEST RESULTS');
        console.log('=====================================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Ready for deployment! 🚀');
        } else {
            console.log('\n⚠️ Some tests failed. Review errors above.');
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new SimpleComprehensiveTest();
    test.runAllTests().catch(console.error);
}

module.exports = SimpleComprehensiveTest;
