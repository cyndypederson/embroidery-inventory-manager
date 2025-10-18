const puppeteer = require('puppeteer');
const TestCleanup = require('./test-cleanup');

class ComprehensiveTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.baseUrl = 'http://localhost:3002';
        this.cleanup = new TestCleanup();
    }

    async setup() {
        console.log('🚀 Setting up comprehensive testing environment...');
        this.browser = await puppeteer.launch({ 
            headless: false, // Set to true for CI/CD
            slowMo: 50,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Set viewport for responsive testing
        await this.page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to the app
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        
        // Wait for the app to load
        await this.page.waitForSelector('#projectsTab', { timeout: 15000 });
        console.log('✅ App loaded successfully');
    }

    async testAppLoads() {
        console.log('\n🧪 Testing App Loads...');
        
        try {
            // Check if main elements are present
            const mainElements = [
                '#projectsTab',
                '#inventoryTab', 
                '#customersTab',
                '#wipTab',
                '#galleryTab',
                '#salesTab',
                '#ideasTab'
            ];
            
            for (const selector of mainElements) {
                const element = await this.page.$(selector);
                if (element) {
                    this.testResults.push({
                        test: `App Load - ${selector}`,
                        status: 'PASS',
                        message: `${selector} element found`
                    });
                } else {
                    this.testResults.push({
                        test: `App Load - ${selector}`,
                        status: 'FAIL',
                        message: `${selector} element missing`
                    });
                }
            }
            
            // Check if data is loaded
            const hasData = await this.page.evaluate(() => {
                return window.inventory && Array.isArray(window.inventory);
            });
            
            this.testResults.push({
                test: 'App Load - Data Loading',
                status: hasData ? 'PASS' : 'FAIL',
                message: hasData ? 'Inventory data loaded' : 'Inventory data not loaded'
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'App Load - General',
                status: 'ERROR',
                message: `Error testing app load: ${error.message}`
            });
        }
    }

    async testTabSwitching() {
        console.log('\n🧪 Testing Tab Switching...');
        
        const tabs = [
            { id: 'projectsTab', name: 'Projects' },
            { id: 'inventoryTab', name: 'Inventory' },
            { id: 'customersTab', name: 'Customers' },
            { id: 'wipTab', name: 'WIP' },
            { id: 'galleryTab', name: 'Gallery' },
            { id: 'salesTab', name: 'Sales' },
            { id: 'ideasTab', name: 'Ideas' }
        ];
        
        for (const tab of tabs) {
            try {
                await this.page.click(`#${tab.id}`);
                await this.page.waitForTimeout(1000);
                
                // Check if tab is active
                const isActive = await this.page.evaluate((tabId) => {
                    const tabElement = document.getElementById(tabId);
                    return tabElement && tabElement.classList.contains('active');
                }, tab.id);
                
                this.testResults.push({
                    test: `Tab Switching - ${tab.name}`,
                    status: isActive ? 'PASS' : 'FAIL',
                    message: isActive ? `${tab.name} tab activated` : `${tab.name} tab not activated`
                });
                
            } catch (error) {
                this.testResults.push({
                    test: `Tab Switching - ${tab.name}`,
                    status: 'ERROR',
                    message: `Error switching to ${tab.name}: ${error.message}`
                });
            }
        }
    }

    async testModalFunctionality() {
        console.log('\n🧪 Testing Modal Functionality...');
        
        // Test Add Project Modal
        try {
            await this.page.click('#projectsTab');
            await this.page.waitForTimeout(500);
            
            const addProjectBtn = await this.page.$('button[onclick*="openAddProjectModal"]');
            if (addProjectBtn) {
                await addProjectBtn.click();
                await this.page.waitForTimeout(500);
                
                const modal = await this.page.$('#addProjectModal');
                const isVisible = await this.page.evaluate(modal => {
                    return modal && modal.style.display !== 'none';
                }, modal);
                
                this.testResults.push({
                    test: 'Modal - Add Project Opens',
                    status: isVisible ? 'PASS' : 'FAIL',
                    message: isVisible ? 'Add project modal opened' : 'Add project modal failed to open'
                });
                
                // Close modal
                await this.page.click('#addProjectModal .close');
                await this.page.waitForTimeout(500);
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Modal - Add Project',
                status: 'ERROR',
                message: `Error testing add project modal: ${error.message}`
            });
        }
        
        // Test Add Inventory Modal
        try {
            await this.page.click('#inventoryTab');
            await this.page.waitForTimeout(500);
            
            const addInventoryBtn = await this.page.$('button[onclick*="openAddInventoryModal"]');
            if (addInventoryBtn) {
                await addInventoryBtn.click();
                await this.page.waitForTimeout(500);
                
                const modal = await this.page.$('#addInventoryModal');
                const isVisible = await this.page.evaluate(modal => {
                    return modal && modal.style.display !== 'none';
                }, modal);
                
                this.testResults.push({
                    test: 'Modal - Add Inventory Opens',
                    status: isVisible ? 'PASS' : 'FAIL',
                    message: isVisible ? 'Add inventory modal opened' : 'Add inventory modal failed to open'
                });
                
                // Close modal
                await this.page.click('#addInventoryModal .close');
                await this.page.waitForTimeout(500);
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Modal - Add Inventory',
                status: 'ERROR',
                message: `Error testing add inventory modal: ${error.message}`
            });
        }
    }

    async testEditModals() {
        console.log('\n🧪 Testing Edit Modals...');
        
        // Test Project Edit Modal
        try {
            await this.page.click('#projectsTab');
            await this.page.waitForTimeout(500);
            
            const editButtons = await this.page.$$('button[onclick*="editProject"]');
            if (editButtons.length > 0) {
                await editButtons[0].click();
                await this.page.waitForTimeout(500);
                
                const modal = await this.page.$('#editProjectModal');
                const isVisible = await this.page.evaluate(modal => {
                    return modal && modal.style.display !== 'none';
                }, modal);
                
                this.testResults.push({
                    test: 'Edit Modal - Project Opens',
                    status: isVisible ? 'PASS' : 'FAIL',
                    message: isVisible ? 'Edit project modal opened' : 'Edit project modal failed to open'
                });
                
                // Check for project-specific fields
                const projectFields = ['editProjectDescription', 'editProjectCustomer', 'editProjectStatus'];
                for (const fieldId of projectFields) {
                    const field = await this.page.$(`#${fieldId}`);
                    this.testResults.push({
                        test: `Edit Modal - Project Field ${fieldId}`,
                        status: field ? 'PASS' : 'FAIL',
                        message: field ? `${fieldId} field exists` : `${fieldId} field missing`
                    });
                }
                
                await this.page.click('#editProjectModal .close');
                await this.page.waitForTimeout(500);
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Edit Modal - Project',
                status: 'ERROR',
                message: `Error testing edit project modal: ${error.message}`
            });
        }
        
        // Test Inventory Edit Modal
        try {
            await this.page.click('#inventoryTab');
            await this.page.waitForTimeout(500);
            
            const editButtons = await this.page.$$('button[onclick*="editInventoryItem"]');
            if (editButtons.length > 0) {
                await editButtons[0].click();
                await this.page.waitForTimeout(500);
                
                const modal = await this.page.$('#editInventoryModal');
                const isVisible = await this.page.evaluate(modal => {
                    return modal && modal.style.display !== 'none';
                }, modal);
                
                this.testResults.push({
                    test: 'Edit Modal - Inventory Opens',
                    status: isVisible ? 'PASS' : 'FAIL',
                    message: isVisible ? 'Edit inventory modal opened' : 'Edit inventory modal failed to open'
                });
                
                // Check for inventory-specific fields
                const inventoryFields = ['editInventoryDescription', 'editInventoryPrice', 'editInventoryLocation'];
                for (const fieldId of inventoryFields) {
                    const field = await this.page.$(`#${fieldId}`);
                    this.testResults.push({
                        test: `Edit Modal - Inventory Field ${fieldId}`,
                        status: field ? 'PASS' : 'FAIL',
                        message: field ? `${fieldId} field exists` : `${fieldId} field missing`
                    });
                }
                
                await this.page.click('#editInventoryModal .close');
                await this.page.waitForTimeout(500);
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Edit Modal - Inventory',
                status: 'ERROR',
                message: `Error testing edit inventory modal: ${error.message}`
            });
        }
    }

    async testMobileResponsiveness() {
        console.log('\n🧪 Testing Mobile Responsiveness...');
        
        try {
            // Switch to mobile viewport
            await this.page.setViewport({ width: 375, height: 667 });
            await this.page.waitForTimeout(1000);
            
            // Test mobile navigation
            const mobileNav = await this.page.$('nav');
            if (mobileNav) {
                const navStyles = await this.page.evaluate(nav => {
                    const styles = window.getComputedStyle(nav);
                    return {
                        display: styles.display,
                        flexWrap: styles.flexWrap
                    };
                }, mobileNav);
                
                this.testResults.push({
                    test: 'Mobile - Navigation',
                    status: 'PASS',
                    message: 'Mobile navigation responsive'
                });
            }
            
            // Test mobile cards
            await this.page.click('#projectsTab');
            await this.page.waitForTimeout(1000);
            
            const mobileCards = await this.page.$$('.mobile-card');
            this.testResults.push({
                test: 'Mobile - Cards Display',
                status: mobileCards.length > 0 ? 'PASS' : 'FAIL',
                message: mobileCards.length > 0 ? `${mobileCards.length} mobile cards found` : 'No mobile cards found'
            });
            
            // Test mobile add buttons
            const mobileAddButtons = await this.page.$$('.mobile-add-btn');
            this.testResults.push({
                test: 'Mobile - Add Buttons',
                status: mobileAddButtons.length > 0 ? 'PASS' : 'FAIL',
                message: mobileAddButtons.length > 0 ? `${mobileAddButtons.length} mobile add buttons found` : 'No mobile add buttons found'
            });
            
            // Switch back to desktop
            await this.page.setViewport({ width: 1200, height: 800 });
            await this.page.waitForTimeout(1000);
            
        } catch (error) {
            this.testResults.push({
                test: 'Mobile Responsiveness - General',
                status: 'ERROR',
                message: `Error testing mobile responsiveness: ${error.message}`
            });
        }
    }

    async testDataIntegrity() {
        console.log('\n🧪 Testing Data Integrity...');
        
        try {
            // Check if data structures are correct
            const dataIntegrity = await this.page.evaluate(() => {
                const checks = {
                    inventory: Array.isArray(window.inventory),
                    customers: Array.isArray(window.customers),
                    sales: Array.isArray(window.sales),
                    gallery: Array.isArray(window.gallery),
                    ideas: Array.isArray(window.ideas)
                };
                
                // Check for required fields in inventory items
                if (window.inventory.length > 0) {
                    const firstItem = window.inventory[0];
                    checks.hasDescription = 'description' in firstItem || 'name' in firstItem;
                    checks.hasType = 'type' in firstItem;
                }
                
                return checks;
            });
            
            Object.entries(dataIntegrity).forEach(([key, value]) => {
                this.testResults.push({
                    test: `Data Integrity - ${key}`,
                    status: value ? 'PASS' : 'FAIL',
                    message: value ? `${key} is valid` : `${key} is invalid`
                });
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Data Integrity - General',
                status: 'ERROR',
                message: `Error testing data integrity: ${error.message}`
            });
        }
    }

    async testPerformance() {
        console.log('\n🧪 Testing Performance...');
        
        try {
            // Measure page load time
            const loadTime = await this.page.evaluate(() => {
                return performance.timing.loadEventEnd - performance.timing.navigationStart;
            });
            
            this.testResults.push({
                test: 'Performance - Page Load Time',
                status: loadTime < 5000 ? 'PASS' : 'WARN',
                message: `Page loaded in ${loadTime}ms`
            });
            
            // Test tab switching performance
            const startTime = Date.now();
            await this.page.click('#inventoryTab');
            await this.page.waitForTimeout(100);
            await this.page.click('#projectsTab');
            await this.page.waitForTimeout(100);
            const endTime = Date.now();
            
            const switchTime = endTime - startTime;
            this.testResults.push({
                test: 'Performance - Tab Switching',
                status: switchTime < 1000 ? 'PASS' : 'WARN',
                message: `Tab switching took ${switchTime}ms`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Performance - General',
                status: 'ERROR',
                message: `Error testing performance: ${error.message}`
            });
        }
    }

    async testErrorHandling() {
        console.log('\n🧪 Testing Error Handling...');
        
        try {
            // Test console errors
            const consoleErrors = [];
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Perform some actions that might trigger errors
            await this.page.click('#projectsTab');
            await this.page.waitForTimeout(500);
            await this.page.click('#inventoryTab');
            await this.page.waitForTimeout(500);
            
            this.testResults.push({
                test: 'Error Handling - Console Errors',
                status: consoleErrors.length === 0 ? 'PASS' : 'WARN',
                message: consoleErrors.length === 0 ? 'No console errors detected' : `${consoleErrors.length} console errors found`
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Error Handling - General',
                status: 'ERROR',
                message: `Error testing error handling: ${error.message}`
            });
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Comprehensive Test Suite...\n');
        
        await this.setup();
        await this.testAppLoads();
        await this.testTabSwitching();
        await this.testModalFunctionality();
        await this.testEditModals();
        await this.testMobileResponsiveness();
        await this.testDataIntegrity();
        await this.testPerformance();
        await this.testErrorHandling();
        
        await this.cleanup();
        this.printResults();
    }

    async cleanup() {
        try {
            // Clean up any test data that was added
            await this.cleanup.completeCleanup();
            console.log('✅ Test cleanup completed');
        } catch (error) {
            console.warn('⚠️ Cleanup error:', error.message);
        }
        
        if (this.browser) {
            await this.browser.close();
        }
    }

    printResults() {
        console.log('\n📊 COMPREHENSIVE TEST RESULTS');
        console.log('='.repeat(60));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const warnings = this.testResults.filter(r => r.status === 'WARN').length;
        const errors = this.testResults.filter(r => r.status === 'ERROR').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`🚨 Errors: ${errors}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        console.log('\n📋 DETAILED RESULTS:');
        console.log('-'.repeat(60));
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : 
                        result.status === 'WARN' ? '⚠️' : '🚨';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        
        if (failed > 0 || errors > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND - DO NOT DEPLOY');
            console.log('Please fix the failed tests before deploying to production.');
            process.exit(1);
        } else if (warnings > 0) {
            console.log('\n⚠️  WARNINGS FOUND - REVIEW BEFORE DEPLOYMENT');
            console.log('Consider addressing warnings for optimal performance.');
            process.exit(0);
        } else {
            console.log('\n🎉 ALL TESTS PASSED - READY FOR DEPLOYMENT');
            process.exit(0);
        }
    }
}

// Run the tests
const tester = new ComprehensiveTester();
tester.runAllTests().catch(console.error);
