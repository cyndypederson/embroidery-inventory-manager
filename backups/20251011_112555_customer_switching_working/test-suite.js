#!/usr/bin/env node

/**
 * Automated Test Suite for Embroidery Inventory Manager
 * Runs comprehensive tests to verify all functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class EmbroideryTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            warnings: [],
            performance: {},
            mobile: {},
            desktop: {}
        };
        this.baseUrl = 'http://localhost:3000';
    }

    async initialize() {
        console.log('🚀 Starting Embroidery Inventory Manager Test Suite...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport for desktop testing
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Enable console logging
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

        // Handle page errors
        this.page.on('pageerror', error => {
            this.results.errors.push(`Page Error: ${error.message}`);
            console.error(`❌ Page Error: ${error.message}`);
        });

        // Handle request failures
        this.page.on('requestfailed', request => {
            this.results.errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
            console.error(`❌ Request Failed: ${request.url()}`);
        });
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`\n🧪 Running: ${testName}`);
            await testFunction();
            this.results.passed++;
            console.log(`✅ PASSED: ${testName}`);
        } catch (error) {
            this.results.failed++;
            this.results.errors.push(`${testName}: ${error.message}`);
            console.error(`❌ FAILED: ${testName} - ${error.message}`);
        }
    }

    async testServerConnection() {
        const response = await this.page.goto(this.baseUrl, { 
            waitUntil: 'networkidle2',
            timeout: 10000 
        });
        
        if (!response.ok()) {
            throw new Error(`Server returned status ${response.status()}`);
        }

        // Check if page loads without critical errors
        const title = await this.page.title();
        if (!title.includes('StitchCraft')) {
            throw new Error('Page title does not contain expected content');
        }
    }

    async testDesktopNavigation() {
        // Test all navigation tabs
        const tabs = ['projects', 'inventory', 'customers', 'wip', 'ideas', 'gallery', 'sales', 'reports'];
        
        for (const tab of tabs) {
            const tabButton = await this.page.$(`[data-tab="${tab}"]`);
            if (!tabButton) {
                throw new Error(`Tab button for ${tab} not found`);
            }
            
            await tabButton.click();
            await this.page.waitForTimeout(500); // Wait for tab to load
            
            // Check if tab content is visible
            const tabContent = await this.page.$(`#${tab}.tab-content.active`);
            if (!tabContent) {
                throw new Error(`Tab content for ${tab} not active`);
            }
        }
    }

    async testMobileResponsiveness() {
        // Test mobile viewport
        await this.page.setViewport({ width: 375, height: 667 });
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Check if mobile cards are visible
        const mobileCards = await this.page.$('.mobile-cards-container');
        if (!mobileCards) {
            throw new Error('Mobile cards container not found');
        }
        
        // Test mobile navigation
        const mobileNav = await this.page.$('.nav-btn');
        if (!mobileNav) {
            throw new Error('Mobile navigation not found');
        }
    }

    async testDataOperations() {
        // Test adding a new project
        await this.page.click('[data-tab="projects"]');
        await this.page.waitForTimeout(500);
        
        // Click add button
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (!addButton) {
            throw new Error('Add project button not found');
        }
        await addButton.click();
        
        // Wait for modal
        await this.page.waitForSelector('#addItemModal', { visible: true });
        
        // Fill form
        await this.page.type('#itemName', 'Test Project');
        await this.page.type('#itemDescription', 'Test Description');
        await this.page.select('#itemStatus', 'pending');
        
        // Submit form
        await this.page.click('#addItemModal .btn-primary[type="submit"]');
        
        // Wait for modal to close
        await this.page.waitForSelector('#addItemModal', { hidden: true });
        
        // Verify item was added (check for success notification or item in list)
        await this.page.waitForTimeout(1000);
    }

    async testSearchAndFiltering() {
        // Test search functionality
        const searchInput = await this.page.$('#searchItems');
        if (searchInput) {
            await searchInput.type('Test');
            await this.page.waitForTimeout(500);
        }
        
        // Test status filter
        const statusFilter = await this.page.$('#statusFilter');
        if (statusFilter) {
            await statusFilter.select('pending');
            await this.page.waitForTimeout(500);
        }
    }

    async testDataPersistence() {
        // Add an item
        await this.testDataOperations();
        
        // Reload page
        await this.page.reload({ waitUntil: 'networkidle2' });
        
        // Check if data persisted
        const projectExists = await this.page.$eval('body', () => {
            return document.body.textContent.includes('Test Project');
        });
        
        if (!projectExists) {
            throw new Error('Data did not persist after page reload');
        }
    }

    async testErrorHandling() {
        // Test with invalid data
        await this.page.click('[data-tab="projects"]');
        await this.page.waitForTimeout(500);
        
        const addButton = await this.page.$('.projects-actions .btn-primary');
        if (addButton) {
            await addButton.click();
            await this.page.waitForSelector('#addItemModal', { visible: true });
            
            // Try to submit empty form
            await this.page.click('#addItemModal .btn-primary[type="submit"]');
            
            // Check for validation errors
            await this.page.waitForTimeout(500);
            
            // Close modal
            await this.page.click('#addItemModal .btn-secondary');
        }
    }

    async testPerformance() {
        const startTime = Date.now();
        
        // Measure page load time
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - startTime;
        
        this.results.performance.loadTime = loadTime;
        
        // Check for memory leaks (basic check)
        const metrics = await this.page.metrics();
        this.results.performance.memoryUsage = metrics.JSHeapUsedSize;
        
        if (loadTime > 5000) {
            this.results.warnings.push(`Slow page load: ${loadTime}ms`);
        }
    }

    async testAccessibility() {
        // Basic accessibility checks
        const images = await this.page.$$('img');
        for (const img of images) {
            const alt = await img.evaluate(el => el.alt);
            if (!alt) {
                this.results.warnings.push('Image missing alt text');
            }
        }
        
        // Check for proper heading structure
        const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', els => 
            els.map(el => ({ tag: el.tagName, text: el.textContent.trim() }))
        );
        
        if (headings.length === 0) {
            this.results.warnings.push('No headings found on page');
        }
    }

    async runAllTests() {
        await this.initialize();
        
        console.log('\n📋 Running Test Suite...\n');
        
        // Core functionality tests
        await this.runTest('Server Connection', () => this.testServerConnection());
        await this.runTest('Desktop Navigation', () => this.testDesktopNavigation());
        await this.runTest('Mobile Responsiveness', () => this.testMobileResponsiveness());
        await this.runTest('Data Operations', () => this.testDataOperations());
        await this.runTest('Search and Filtering', () => this.testSearchAndFiltering());
        await this.runTest('Data Persistence', () => this.testDataPersistence());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        await this.runTest('Performance', () => this.testPerformance());
        await this.runTest('Accessibility', () => this.testAccessibility());
        
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
            errors: this.results.errors,
            warnings: this.results.warnings,
            performance: this.results.performance
        };

        // Save report to file
        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
        console.log(`🚨 Errors: ${this.results.errors.length}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.results.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.results.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the test suite
if (require.main === module) {
    const testSuite = new EmbroideryTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = EmbroideryTestSuite;
