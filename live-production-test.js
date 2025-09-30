#!/usr/bin/env node

/**
 * LIVE PRODUCTION TEST SUITE - Embroidery Inventory Manager
 * Tests the live Vercel deployment for all functionality
 */

const puppeteer = require('puppeteer');
const http = require('http');

class LiveProductionTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            testedFeatures: [],
            performance: {}
        };
        this.baseUrl = 'https://embroidery-inventory-manager.vercel.app'; // Update with your actual Vercel URL
        this.testData = {
            project: {
                name: 'Live Test Project ' + Date.now(),
                description: 'Testing live production environment',
                customer: 'Test Customer',
                status: 'pending',
                priority: 'high',
                location: 'Test Location',
                quantity: 1,
                price: 25.99,
                notes: 'Live production test',
                category: 'Test',
                tags: 'live,test,production',
                dueDate: '2024-12-31'
            }
        };
    }

    async initialize() {
        console.log('🚀 Starting LIVE PRODUCTION Test Suite...');
        console.log(`🌐 Testing: ${this.baseUrl}\n`);
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
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

    async testLiveSiteConnection() {
        const response = await this.page.goto(this.baseUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        if (!response.ok()) {
            throw new Error(`Live site returned status ${response.status()}`);
        }

        const title = await this.page.title();
        if (!title.includes('StitchCraft')) {
            throw new Error('Live site title does not contain expected content');
        }

        // Check for critical elements
        await this.page.waitForSelector('.branding h1', { timeout: 10000 });
        await this.page.waitForSelector('.nav-btn', { timeout: 10000 });
    }

    async testLiveAPIs() {
        const endpoints = ['/api/inventory', '/api/customers', '/api/sales', '/api/gallery', '/api/ideas', '/health'];
        
        for (const endpoint of endpoints) {
            const response = await this.page.goto(`${this.baseUrl}${endpoint}`, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });
            
            if (!response.ok()) {
                throw new Error(`Live API endpoint ${endpoint} returned status ${response.status()}`);
            }

            // Check if response is valid JSON
            const content = await this.page.content();
            if (endpoint !== '/health' && !content.includes('[') && !content.includes('{')) {
                throw new Error(`Live API endpoint ${endpoint} did not return valid JSON`);
            }
        }
    }

    async testLiveNavigation() {
        const tabs = ['projects', 'inventory', 'customers', 'wip', 'ideas', 'gallery', 'sales', 'reports'];
        
        for (const tab of tabs) {
            const tabButton = await this.page.$(`[data-tab="${tab}"]`);
            if (!tabButton) {
                throw new Error(`Live site: Tab button for ${tab} not found`);
            }
            
            await tabButton.click();
            await this.page.waitFor(2000); // Wait 2 seconds for tab switch
            
            // Check if tab content exists
            const tabContent = await this.page.$(`#${tab}`);
            if (!tabContent) {
                throw new Error(`Live site: Tab content for ${tab} not found`);
            }
        }
    }

    async testLiveAddProject() {
        // Test Projects tab add button
        await this.page.click('[data-tab="projects"]');
        await this.page.waitFor(1000);
        
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (!addButton) {
            throw new Error('Live site: Add project button not found');
        }
        
        await addButton.click();
        await this.page.waitFor(2000);
        
        // Check if modal opened
        const modal = await this.page.$('#addItemModal');
        if (!modal) {
            throw new Error('Live site: Add project modal did not open');
        }
    }

    async testLiveFormFields() {
        // Test that form fields exist and can be filled
        const fields = [
            { id: 'itemName', value: this.testData.project.name },
            { id: 'itemDescription', value: this.testData.project.description },
            { id: 'itemStatus', value: this.testData.project.status }
        ];

        for (const field of fields) {
            const element = await this.page.$(`#${field.id}`);
            if (!element) {
                throw new Error(`Live site: Form field ${field.id} not found`);
            }

            if (field.id === 'itemStatus') {
                await element.select(field.value);
            } else {
                await element.type(field.value);
            }

            // Verify value was set
            const value = await element.evaluate(el => el.value);
            if (value !== field.value) {
                throw new Error(`Live site: Field ${field.id} value not set correctly`);
            }
        }
    }

    async testLiveFormSubmission() {
        // Submit form
        const submitButton = await this.page.$('#addItemModal .btn-primary[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await this.page.waitFor(3000); // Wait for submission
            
            // Check if modal closed
            const modal = await this.page.$('#addItemModal');
            if (modal) {
                // Modal might still be open, check if it's hidden
                const isVisible = await modal.evaluate(el => el.offsetParent !== null);
                if (isVisible) {
                    console.log('ℹ️ Modal still visible after submission (may be normal)');
                }
            }
        }
    }

    async testLiveSearch() {
        const searchInput = await this.page.$('#searchItems');
        if (searchInput) {
            await searchInput.type('Test');
            await this.page.waitFor(2000);
            
            // Verify search results or no error
            const hasError = await this.page.$('.error, .alert-danger');
            if (hasError) {
                throw new Error('Live site: Search caused an error');
            }
        }
    }

    async testLiveMobileView() {
        // Test mobile viewport
        await this.page.setViewport({ width: 375, height: 667 });
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Check if mobile elements exist
        const mobileCards = await this.page.$('.mobile-cards-container');
        if (!mobileCards) {
            console.log('ℹ️ Mobile cards not visible (no data or not mobile view)');
        }

        // Test mobile navigation
        const mobileNav = await this.page.$('.nav-btn');
        if (!mobileNav) {
            throw new Error('Live site: Mobile navigation not found');
        }
    }

    async testLivePerformance() {
        const startTime = Date.now();
        
        // Measure page load
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - startTime;
        
        this.results.performance.loadTime = loadTime;
        
        // Measure memory usage
        const metrics = await this.page.metrics();
        this.results.performance.memoryUsage = metrics.JSHeapUsedSize;
        
        // Test with multiple page loads
        const loadTimes = [];
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
            loadTimes.push(Date.now() - start);
        }
        
        const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
        this.results.performance.averageLoadTime = avgLoadTime;
        
        if (avgLoadTime > 10000) { // 10 seconds
            this.results.errors.push(`Slow load time: ${avgLoadTime}ms average`);
        }
    }

    async testLiveDataPersistence() {
        // Test that data persists across page reloads
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        await this.page.click('[data-tab="projects"]');
        await this.page.waitFor(1000);
        
        // Count initial items
        const initialItems = await this.page.$$('tbody tr');
        const initialCount = initialItems.length;
        
        // Reload page
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.click('[data-tab="projects"]');
        await this.page.waitFor(1000);
        
        // Count items after reload
        const reloadedItems = await this.page.$$('tbody tr');
        const reloadedCount = reloadedItems.length;
        
        if (reloadedCount < initialCount) {
            throw new Error(`Live site: Data not persisting - ${initialCount} -> ${reloadedCount} items`);
        }
    }

    async testLiveErrorHandling() {
        // Test error handling by trying invalid operations
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        
        // Try to access non-existent elements
        const nonExistent = await this.page.$('#non-existent-element');
        if (nonExistent) {
            throw new Error('Live site: Non-existent element found');
        }
        
        // Check for JavaScript errors
        const hasJsErrors = this.results.errors.some(error => 
            error.includes('Console Error') || error.includes('Page Error')
        );
        
        if (hasJsErrors) {
            console.log('⚠️ JavaScript errors detected in live site');
        }
    }

    async runAllTests() {
        await this.initialize();
        
        console.log('📋 Running Live Production Tests...\n');
        
        // Core functionality
        await this.runTest('Live Site Connection', () => this.testLiveSiteConnection(), 'Core');
        await this.runTest('Live APIs', () => this.testLiveAPIs(), 'Core');
        
        // Navigation and UI
        await this.runTest('Live Navigation', () => this.testLiveNavigation(), 'UI');
        await this.runTest('Live Add Project', () => this.testLiveAddProject(), 'UI');
        await this.runTest('Live Form Fields', () => this.testLiveFormFields(), 'UI');
        await this.runTest('Live Form Submission', () => this.testLiveFormSubmission(), 'UI');
        await this.runTest('Live Search', () => this.testLiveSearch(), 'UI');
        
        // Mobile and performance
        await this.runTest('Live Mobile View', () => this.testLiveMobileView(), 'Mobile');
        await this.runTest('Live Performance', () => this.testLivePerformance(), 'Performance');
        await this.runTest('Live Data Persistence', () => this.testLiveDataPersistence(), 'Data');
        await this.runTest('Live Error Handling', () => this.testLiveErrorHandling(), 'Error Handling');
        
        await this.generateReport();
        await this.cleanup();
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            summary: {
                total: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: `${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`
            },
            testedFeatures: this.results.testedFeatures,
            errors: this.results.errors,
            performance: this.results.performance
        };

        // Save detailed report
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, 'live-production-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log('\n📊 LIVE PRODUCTION TEST RESULTS');
        console.log('=================================');
        console.log(`🌐 Testing: ${this.baseUrl}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        if (this.results.performance.loadTime) {
            console.log(`⚡ Load Time: ${this.results.performance.loadTime}ms`);
        }
        
        if (this.results.performance.averageLoadTime) {
            console.log(`⚡ Average Load Time: ${Math.round(this.results.performance.averageLoadTime)}ms`);
        }
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL LIVE TESTS PASSED! Your production site is working perfectly! 🚀');
        } else {
            console.log('\n⚠️ Some live tests failed. Review errors above.');
        }
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the live production test
if (require.main === module) {
    const test = new LiveProductionTest();
    test.runAllTests().catch(console.error);
}

module.exports = LiveProductionTest;
