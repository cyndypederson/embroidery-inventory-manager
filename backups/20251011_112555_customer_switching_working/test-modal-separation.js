const puppeteer = require('puppeteer');

class ModalSeparationTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
    }

    async setup() {
        console.log('🚀 Setting up browser for modal separation testing...');
        this.browser = await puppeteer.launch({ 
            headless: false, // Set to true for CI/CD
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Set viewport to mobile size for mobile testing
        await this.page.setViewport({ width: 375, height: 667 });
        
        // Navigate to the app
        await this.page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
        
        // Wait for the app to load
        await this.page.waitForSelector('button[data-tab="projects"]', { timeout: 10000 });
        console.log('✅ App loaded successfully');
    }

    async testProjectModal() {
        console.log('\n🧪 Testing Project Modal...');
        
        try {
            // Switch to Projects tab
            await this.page.click('button[data-tab="projects"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for edit buttons in projects table
            const projectEditButtons = await this.page.$$('button[onclick*="editProject"]');
            
            if (projectEditButtons.length === 0) {
                this.testResults.push({
                    test: 'Project Modal - Edit Button Exists',
                    status: 'FAIL',
                    message: 'No project edit buttons found'
                });
                return;
            }
            
            // Click first edit button
            await projectEditButtons[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if project modal opened
            const projectModal = await this.page.$('#editProjectModal');
            const isProjectModalVisible = await this.page.evaluate(modal => {
                return modal && modal.style.display !== 'none';
            }, projectModal);
            
            if (!isProjectModalVisible) {
                this.testResults.push({
                    test: 'Project Modal - Opens Correctly',
                    status: 'FAIL',
                    message: 'Project modal did not open'
                });
            } else {
                this.testResults.push({
                    test: 'Project Modal - Opens Correctly',
                    status: 'PASS',
                    message: 'Project modal opened successfully'
                });
            }
            
            // Check for project-specific fields
            const projectFields = [
                'editProjectDescription',
                'editProjectCustomer',
                'editProjectStatus',
                'editProjectDueDate',
                'editProjectPriority',
                'editProjectTags',
                'editProjectPatternLink'
            ];
            
            for (const fieldId of projectFields) {
                const field = await this.page.$(`#${fieldId}`);
                if (!field) {
                    this.testResults.push({
                        test: `Project Modal - Field ${fieldId}`,
                        status: 'FAIL',
                        message: `Project field ${fieldId} not found`
                    });
                } else {
                    this.testResults.push({
                        test: `Project Modal - Field ${fieldId}`,
                        status: 'PASS',
                        message: `Project field ${fieldId} exists`
                    });
                }
            }
            
            // Check for image section (should exist for projects)
            const imageSection = await this.page.$('#editProjectImageSection');
            if (imageSection) {
                this.testResults.push({
                    test: 'Project Modal - Image Section',
                    status: 'PASS',
                    message: 'Image section exists for projects'
                });
            } else {
                this.testResults.push({
                    test: 'Project Modal - Image Section',
                    status: 'FAIL',
                    message: 'Image section missing for projects'
                });
            }
            
            // Close modal
            await this.page.click('#editProjectModal .close');
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            this.testResults.push({
                test: 'Project Modal - General',
                status: 'ERROR',
                message: `Error testing project modal: ${error.message}`
            });
        }
    }

    async testInventoryModal() {
        console.log('\n🧪 Testing Inventory Modal...');
        
        try {
            // Switch to Inventory tab
            await this.page.click('button[data-tab="inventory"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Look for edit buttons in inventory table
            const inventoryEditButtons = await this.page.$$('button[onclick*="editInventoryItem"]');
            
            if (inventoryEditButtons.length === 0) {
                this.testResults.push({
                    test: 'Inventory Modal - Edit Button Exists',
                    status: 'FAIL',
                    message: 'No inventory edit buttons found'
                });
                return;
            }
            
            // Click first edit button
            await inventoryEditButtons[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if inventory modal opened
            const inventoryModal = await this.page.$('#editInventoryModal');
            const isInventoryModalVisible = await this.page.evaluate(modal => {
                return modal && modal.style.display !== 'none';
            }, inventoryModal);
            
            if (!isInventoryModalVisible) {
                this.testResults.push({
                    test: 'Inventory Modal - Opens Correctly',
                    status: 'FAIL',
                    message: 'Inventory modal did not open'
                });
            } else {
                this.testResults.push({
                    test: 'Inventory Modal - Opens Correctly',
                    status: 'PASS',
                    message: 'Inventory modal opened successfully'
                });
            }
            
            // Check for inventory-specific fields
            const inventoryFields = [
                'editInventoryDescription',
                'editInventoryPrice',
                'editInventoryLocation',
                'editInventorySupplier',
                'editInventoryReorderPoint',
                'editInventoryStatus'
            ];
            
            for (const fieldId of inventoryFields) {
                const field = await this.page.$(`#${fieldId}`);
                if (!field) {
                    this.testResults.push({
                        test: `Inventory Modal - Field ${fieldId}`,
                        status: 'FAIL',
                        message: `Inventory field ${fieldId} not found`
                    });
                } else {
                    this.testResults.push({
                        test: `Inventory Modal - Field ${fieldId}`,
                        status: 'PASS',
                        message: `Inventory field ${fieldId} exists`
                    });
                }
            }
            
            // Check that image section does NOT exist (should be hidden for inventory)
            const imageSection = await this.page.$('#editInventoryImageSection');
            if (!imageSection) {
                this.testResults.push({
                    test: 'Inventory Modal - No Image Section',
                    status: 'PASS',
                    message: 'No image section for inventory items (correct)'
                });
            } else {
                // Check if it's hidden
                const isHidden = await this.page.evaluate(section => {
                    return section.style.display === 'none';
                }, imageSection);
                
                if (isHidden) {
                    this.testResults.push({
                        test: 'Inventory Modal - No Image Section',
                        status: 'PASS',
                        message: 'Image section is hidden for inventory items (correct)'
                    });
                } else {
                    this.testResults.push({
                        test: 'Inventory Modal - No Image Section',
                        status: 'FAIL',
                        message: 'Image section should be hidden for inventory items'
                    });
                }
            }
            
            // Close modal
            await this.page.click('#editInventoryModal .close');
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            this.testResults.push({
                test: 'Inventory Modal - General',
                status: 'ERROR',
                message: `Error testing inventory modal: ${error.message}`
            });
        }
    }

    async testModalIndependence() {
        console.log('\n🧪 Testing Modal Independence...');
        
        try {
            // Test that opening one modal doesn't affect the other
            await this.page.click('#projectsTab');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Open project modal
            const projectEditButtons = await this.page.$$('button[onclick*="editProject"]');
            if (projectEditButtons.length > 0) {
                await projectEditButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check that inventory modal is not open
                const inventoryModal = await this.page.$('#editInventoryModal');
                const isInventoryModalOpen = await this.page.evaluate(modal => {
                    return modal && modal.style.display !== 'none';
                }, inventoryModal);
                
                if (isInventoryModalOpen) {
                    this.testResults.push({
                        test: 'Modal Independence - Inventory Not Open',
                        status: 'FAIL',
                        message: 'Inventory modal opened when project modal was clicked'
                    });
                } else {
                    this.testResults.push({
                        test: 'Modal Independence - Inventory Not Open',
                        status: 'PASS',
                        message: 'Inventory modal correctly closed when project modal opened'
                    });
                }
                
                // Close project modal
                await this.page.click('#editProjectModal .close');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Modal Independence - General',
                status: 'ERROR',
                message: `Error testing modal independence: ${error.message}`
            });
        }
    }

    async testMobileLayout() {
        console.log('\n🧪 Testing Mobile Layout...');
        
        try {
            // Test mobile add buttons
            const mobileAddButtons = await this.page.$$('.mobile-add-btn');
            
            if (mobileAddButtons.length === 0) {
                this.testResults.push({
                    test: 'Mobile Layout - Add Buttons',
                    status: 'FAIL',
                    message: 'No mobile add buttons found'
                });
            } else {
                this.testResults.push({
                    test: 'Mobile Layout - Add Buttons',
                    status: 'PASS',
                    message: `Found ${mobileAddButtons.length} mobile add buttons`
                });
                
                // Test button styling
                const firstButton = mobileAddButtons[0];
                const buttonStyles = await this.page.evaluate(button => {
                    const styles = window.getComputedStyle(button);
                    return {
                        display: styles.display,
                        alignItems: styles.alignItems,
                        justifyContent: styles.justifyContent,
                        whiteSpace: styles.whiteSpace
                    };
                }, firstButton);
                
                if (buttonStyles.display === 'flex' && 
                    buttonStyles.alignItems === 'center' && 
                    buttonStyles.justifyContent === 'center' &&
                    buttonStyles.whiteSpace === 'nowrap') {
                    this.testResults.push({
                        test: 'Mobile Layout - Button Styling',
                        status: 'PASS',
                        message: 'Mobile add buttons have correct styling'
                    });
                } else {
                    this.testResults.push({
                        test: 'Mobile Layout - Button Styling',
                        status: 'FAIL',
                        message: `Mobile button styling incorrect: ${JSON.stringify(buttonStyles)}`
                    });
                }
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Mobile Layout - General',
                status: 'ERROR',
                message: `Error testing mobile layout: ${error.message}`
            });
        }
    }

    async testFormSubmissions() {
        console.log('\n🧪 Testing Form Submissions...');
        
        try {
            // Test project form submission
            await this.page.click('#projectsTab');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const projectEditButtons = await this.page.$$('button[onclick*="editProject"]');
            if (projectEditButtons.length > 0) {
                await projectEditButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if form has correct event listener
                const hasProjectListener = await this.page.evaluate(() => {
                    const form = document.getElementById('editProjectForm');
                    return form && form.onsubmit !== null;
                });
                
                this.testResults.push({
                    test: 'Form Submission - Project Form',
                    status: hasProjectListener ? 'PASS' : 'FAIL',
                    message: hasProjectListener ? 'Project form has event listener' : 'Project form missing event listener'
                });
                
                await this.page.click('#editProjectModal .close');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Test inventory form submission
            await this.page.click('#inventoryTab');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const inventoryEditButtons = await this.page.$$('button[onclick*="editInventoryItem"]');
            if (inventoryEditButtons.length > 0) {
                await inventoryEditButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if form has correct event listener
                const hasInventoryListener = await this.page.evaluate(() => {
                    const form = document.getElementById('editInventoryForm');
                    return form && form.onsubmit !== null;
                });
                
                this.testResults.push({
                    test: 'Form Submission - Inventory Form',
                    status: hasInventoryListener ? 'PASS' : 'FAIL',
                    message: hasInventoryListener ? 'Inventory form has event listener' : 'Inventory form missing event listener'
                });
                
                await this.page.click('#editInventoryModal .close');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            this.testResults.push({
                test: 'Form Submission - General',
                status: 'ERROR',
                message: `Error testing form submissions: ${error.message}`
            });
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Modal Separation Test Suite...\n');
        
        await this.setup();
        await this.testProjectModal();
        await this.testInventoryModal();
        await this.testModalIndependence();
        await this.testMobileLayout();
        await this.testFormSubmissions();
        
        await this.cleanup();
        this.printResults();
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    printResults() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const errors = this.testResults.filter(r => r.status === 'ERROR').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`🚨 Errors: ${errors}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        console.log('\n📋 DETAILED RESULTS:');
        console.log('-'.repeat(50));
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '🚨';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        
        if (failed > 0 || errors > 0) {
            console.log('\n🚨 ISSUES FOUND - DO NOT DEPLOY');
            process.exit(1);
        } else {
            console.log('\n🎉 ALL TESTS PASSED - READY FOR DEPLOYMENT');
            process.exit(0);
        }
    }
}

// Run the tests
const tester = new ModalSeparationTester();
tester.runAllTests().catch(console.error);
