const puppeteer = require('puppeteer');

class BasicTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3002';
    }

    async setup() {
        console.log('🚀 Running Basic Tests...');
        this.browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        await this.page.waitForSelector('button[data-tab="projects"]', { timeout: 10000 });
    }

    async testBasicFunctionality() {
        const tests = [
            {
                name: 'App Loads',
                test: async () => {
                    const title = await this.page.title();
                    return title.includes('StitchCraft');
                }
            },
            {
                name: 'Navigation Tabs Exist',
                test: async () => {
                    const tabs = await this.page.$$('button[data-tab]');
                    return tabs.length >= 7; // Should have at least 7 tabs
                }
            },
            {
                name: 'Projects Tab Switches',
                test: async () => {
                    await this.page.click('button[data-tab="projects"]');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const isActive = await this.page.evaluate(() => {
                        const btn = document.querySelector('button[data-tab="projects"]');
                        return btn && btn.classList.contains('active');
                    });
                    return isActive;
                }
            },
            {
                name: 'Inventory Tab Switches',
                test: async () => {
                    await this.page.click('button[data-tab="inventory"]');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const isActive = await this.page.evaluate(() => {
                        const btn = document.querySelector('button[data-tab="inventory"]');
                        return btn && btn.classList.contains('active');
                    });
                    return isActive;
                }
            },
            {
                name: 'Project Modal HTML Exists',
                test: async () => {
                    const modal = await this.page.$('#editProjectModal');
                    return modal !== null;
                }
            },
            {
                name: 'Inventory Modal HTML Exists',
                test: async () => {
                    const modal = await this.page.$('#editInventoryModal');
                    return modal !== null;
                }
            },
            {
                name: 'JavaScript Functions Exist',
                test: async () => {
                    const functionsExist = await this.page.evaluate(() => {
                        return typeof window.editProject === 'function' &&
                               typeof window.editInventoryItem === 'function' &&
                               typeof window.handleEditProject === 'function' &&
                               typeof window.handleEditInventory === 'function';
                    });
                    return functionsExist;
                }
            },
            {
                name: 'Mobile Viewport Works',
                test: async () => {
                    await this.page.setViewport({ width: 375, height: 667 });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const mobileCards = await this.page.$$('.mobile-card');
                    const hasMobileElements = mobileCards.length > 0;
                    
                    // Reset viewport
                    await this.page.setViewport({ width: 1200, height: 800 });
                    return hasMobileElements;
                }
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await test.test();
                if (result) {
                    console.log(`✅ ${test.name}`);
                    passed++;
                } else {
                    console.log(`❌ ${test.name}`);
                    failed++;
                }
            } catch (error) {
                console.log(`🚨 ${test.name} - Error: ${error.message}`);
                failed++;
            }
        }

        return { passed, failed, total: tests.length };
    }

    async run() {
        try {
            await this.setup();
            const results = await this.testBasicFunctionality();
            
            console.log('\n📊 BASIC TEST RESULTS:');
            console.log(`✅ Passed: ${results.passed}`);
            console.log(`❌ Failed: ${results.failed}`);
            console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
            
            if (results.failed > 0) {
                console.log('\n🚨 BASIC TESTS FAILED - CHECK IMPLEMENTATION');
                process.exit(1);
            } else {
                console.log('\n🎉 BASIC TESTS PASSED - CORE FUNCTIONALITY WORKING');
                process.exit(0);
            }
        } catch (error) {
            console.error('🚨 Basic test error:', error);
            process.exit(1);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run basic tests
new BasicTester().run();
