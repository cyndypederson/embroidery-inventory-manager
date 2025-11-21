const { launch } = require('./test-utils/puppeteer-config');

/**
 * Test Cleanup Utility
 * Ensures all test data is removed after testing
 */
class TestCleanup {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3002';
        this.testDataIds = []; // Track test data for cleanup
    }

    async setup() {
        console.log('🧹 Setting up test cleanup...');
        this.browser = await launch();
        this.page = await this.browser.newPage();
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        await this.page.waitForSelector('button[data-tab="projects"]', { timeout: 10000 });
    }

    /**
     * Add test data ID for tracking
     */
    trackTestData(id, type = 'project') {
        this.testDataIds.push({ id, type });
    }

    /**
     * Clean up all tracked test data
     */
    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');
        
        for (const testItem of this.testDataIds) {
            try {
                await this.deleteTestItem(testItem.id, testItem.type);
            } catch (error) {
                console.warn(`⚠️ Failed to delete test ${testItem.type} ${testItem.id}:`, error.message);
            }
        }
        
        this.testDataIds = [];
        console.log('✅ Test data cleanup completed');
    }

    /**
     * Delete a specific test item
     */
    async deleteTestItem(id, type) {
        const selectors = {
            project: {
                editBtn: `button[onclick*="editItem(${id})"]`,
                deleteBtn: `button[onclick*="deleteItem(${id})"]`
            },
            customer: {
                editBtn: `button[onclick*="editCustomer(${id})"]`,
                deleteBtn: `button[onclick*="deleteCustomer(${id})"]`
            },
            inventory: {
                editBtn: `button[onclick*="editItem(${id})"]`,
                deleteBtn: `button[onclick*="deleteItem(${id})"]`
            }
        };

        const typeSelectors = selectors[type];
        if (!typeSelectors) {
            console.warn(`⚠️ Unknown item type: ${type}`);
            return;
        }

        // Navigate to appropriate tab
        const tabMap = {
            project: 'projects',
            customer: 'customers', 
            inventory: 'inventory'
        };

        const tab = tabMap[type];
        if (tab) {
            await this.page.click(`button[data-tab="${tab}"]`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Try to find and click delete button
        const deleteBtn = await this.page.$(typeSelectors.deleteBtn);
        if (deleteBtn) {
            await deleteBtn.click();
            
            // Handle confirmation dialog if it appears
            await new Promise(resolve => setTimeout(resolve, 100));
            const confirmBtn = await this.page.$('button:contains("Yes")') || 
                              await this.page.$('button:contains("Confirm")') ||
                              await this.page.$('button:contains("Delete")');
            
            if (confirmBtn) {
                await confirmBtn.click();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log(`🗑️ Deleted test ${type} ${id}`);
        } else {
            console.warn(`⚠️ Delete button not found for test ${type} ${id}`);
        }
    }

    /**
     * Clean up by description/name (for items added during tests)
     */
    async cleanupByDescription(description, type = 'project') {
        console.log(`🧹 Cleaning up test item: "${description}"`);
        
        const tabMap = {
            project: 'projects',
            customer: 'customers',
            inventory: 'inventory'
        };

        const tab = tabMap[type];
        if (tab) {
            await this.page.click(`button[data-tab="${tab}"]`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Find items containing the test description
        const items = await this.page.$$eval('.project-card, .customer-card, .inventory-card', 
            (cards, desc) => {
                return cards
                    .map((card, index) => ({ 
                        index, 
                        text: card.textContent.toLowerCase(),
                        hasDesc: card.textContent.toLowerCase().includes(desc.toLowerCase())
                    }))
                    .filter(item => item.hasDesc)
                    .map(item => item.index);
            }, description);

        // Delete each matching item
        for (const itemIndex of items) {
            try {
                const deleteBtn = await this.page.$(`.project-card:nth-child(${itemIndex + 1}) button[onclick*="delete"], 
                                                    .customer-card:nth-child(${itemIndex + 1}) button[onclick*="delete"],
                                                    .inventory-card:nth-child(${itemIndex + 1}) button[onclick*="delete"]`);
                
                if (deleteBtn) {
                    await deleteBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Handle confirmation
                    const confirmBtn = await this.page.$('button:contains("Yes")') || 
                                      await this.page.$('button:contains("Confirm")') ||
                                      await this.page.$('button:contains("Delete")');
                    
                    if (confirmBtn) {
                        await confirmBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    console.log(`🗑️ Deleted test item: "${description}"`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to delete test item "${description}":`, error.message);
            }
        }
    }

    /**
     * Clean up all items with "TEST" in their name/description
     */
    async cleanupAllTestItems() {
        console.log('🧹 Cleaning up all test items...');
        
        const testDescriptions = [
            'TEST PROJECT',
            'TEST CUSTOMER', 
            'TEST INVENTORY',
            'Test Project',
            'Test Customer',
            'Test Inventory',
            'TEST_',
            'test_'
        ];

        for (const desc of testDescriptions) {
            await this.cleanupByDescription(desc, 'project');
            await this.cleanupByDescription(desc, 'customer');
            await this.cleanupByDescription(desc, 'inventory');
        }
    }

    /**
     * Complete cleanup - closes browser and cleans data
     */
    async completeCleanup() {
        try {
            await this.cleanupAllTestItems();
            await this.cleanupTestData();
        } catch (error) {
            console.warn('⚠️ Error during cleanup:', error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🧹 Browser closed');
            }
        }
    }

    /**
     * Static method for easy cleanup in other test files
     */
    static async quickCleanup(baseUrl = 'http://localhost:3002') {
        const cleanup = new TestCleanup();
        cleanup.baseUrl = baseUrl;
        await cleanup.setup();
        await cleanup.cleanupAllTestItems();
        await cleanup.browser.close();
    }
}

module.exports = TestCleanup;

// If run directly, perform cleanup
if (require.main === module) {
    const cleanup = new TestCleanup();
    cleanup.completeCleanup().then(() => {
        console.log('✅ Test cleanup completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test cleanup failed:', error);
        process.exit(1);
    });
}
