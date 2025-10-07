const puppeteer = require('puppeteer');

class SmokeTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3002';
    }

    async setup() {
        console.log('🚀 Running Smoke Tests...');
        this.browser = await puppeteer.launch({ 
            headless: true, // Fast execution
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        await this.page.waitForSelector('button[data-tab="projects"]', { timeout: 10000 });
    }

    async testCriticalPaths() {
        const tests = [
            {
                name: 'App Loads',
                test: async () => {
                    const title = await this.page.title();
                    return title.includes('StitchCraft');
                }
            },
            {
                name: 'Projects Tab Works',
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
                name: 'Inventory Tab Works',
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
                name: 'Project Edit Modal Opens',
                test: async () => {
                    await this.page.click('button[data-tab="projects"]');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const editButtons = await this.page.$$('button[onclick*="editProject"]');
                    if (editButtons.length === 0) return false;
                    
                    await editButtons[0].click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const modal = await this.page.$('#editProjectModal');
                    const isVisible = await this.page.evaluate(modal => {
                        return modal && modal.style.display !== 'none';
                    }, modal);
                    
                    if (modal) await this.page.click('#editProjectModal .close');
                    return isVisible;
                }
            },
            {
                name: 'Inventory Edit Modal Opens',
                test: async () => {
                    await this.page.click('button[data-tab="inventory"]');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const editButtons = await this.page.$$('button[onclick*="editInventoryItem"]');
                    if (editButtons.length === 0) return false;
                    
                    await editButtons[0].click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const modal = await this.page.$('#editInventoryModal');
                    const isVisible = await this.page.evaluate(modal => {
                        return modal && modal.style.display !== 'none';
                    }, modal);
                    
                    if (modal) await this.page.click('#editInventoryModal .close');
                    return isVisible;
                }
            },
            {
                name: 'Mobile View Works',
                test: async () => {
                    await this.page.setViewport({ width: 375, height: 667 });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const mobileCards = await this.page.$$('.mobile-card');
                    await this.page.setViewport({ width: 1200, height: 800 });
                    
                    return mobileCards.length > 0;
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
            const results = await this.testCriticalPaths();
            
            console.log('\n📊 SMOKE TEST RESULTS:');
            console.log(`✅ Passed: ${results.passed}`);
            console.log(`❌ Failed: ${results.failed}`);
            console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
            
            if (results.failed > 0) {
                console.log('\n🚨 SMOKE TESTS FAILED - DO NOT DEPLOY');
                process.exit(1);
            } else {
                console.log('\n🎉 SMOKE TESTS PASSED - READY FOR DEPLOYMENT');
                process.exit(0);
            }
        } catch (error) {
            console.error('🚨 Smoke test error:', error);
            process.exit(1);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run smoke tests
new SmokeTester().run();
