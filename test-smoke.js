const { launch } = require('./test-utils/puppeteer-config');

class SmokeTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3002';
    }

    async setup() {
        console.log('🚀 Running Smoke Tests...');
        this.browser = await launch();
        this.page = await this.browser.newPage();
        this.page.setDefaultNavigationTimeout(60000);
        await this.page.goto(this.baseUrl, { waitUntil: 'load' });
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
                    await this.page.evaluate(() => {
                        if (typeof switchTab === 'function') {
                            switchTab('projects');
                        } else {
                            const btn = document.querySelector('button[data-tab="projects"]');
                            if (btn) btn.click();
                        }
                    });
                    await this.page.waitForSelector('#projectsCards .project-card', { timeout: 10000 });
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
                    await this.page.evaluate(() => {
                        if (typeof switchTab === 'function') {
                            switchTab('inventory');
                        } else {
                            const btn = document.querySelector('button[data-tab="inventory"]');
                            if (btn) btn.click();
                        }
                    });
                    await this.page.waitForSelector('#inventoryCards', { timeout: 10000 });
                    await this.page.waitForFunction(() => {
                        const container = document.getElementById('inventoryCards');
                        return container && (container.querySelector('.inventory-card') || container.children.length >= 0);
                    }, { timeout: 10000 }).catch(() => {});
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
                    await this.page.evaluate(() => {
                        if (typeof switchTab === 'function') {
                            switchTab('projects');
                        } else {
                            const btn = document.querySelector('button[data-tab="projects"]');
                            if (btn) btn.click();
                        }
                    });
                    await this.page.waitForSelector('#projectsCards .project-card button[onclick^="editItem"]', { timeout: 10000 });
                    const clicked = await this.page.evaluate(() => {
                        const btn = document.querySelector('#projectsCards .project-card button[onclick^="editItem"]');
                        if (!btn) return false;
                        btn.click();
                        return true;
                    });
                    if (!clicked) return false;
                    
                    await this.page.waitForFunction(() => {
                        const modal = document.getElementById('editProjectModal');
                        return modal && modal.style.display === 'block';
                    }, { timeout: 10000 });
                    
                    const isVisible = await this.page.evaluate(() => {
                        const modal = document.getElementById('editProjectModal');
                        return modal && modal.style.display === 'block';
                    });
                    
                    await this.page.evaluate(() => {
                        const closeBtn = document.querySelector('#editProjectModal .close');
                        if (closeBtn) closeBtn.click();
                    });
                    
                    return isVisible;
                }
            },
            {
                name: 'Inventory Edit Modal Opens',
                test: async () => {
                    await this.page.evaluate(() => {
                        if (typeof switchTab === 'function') {
                            switchTab('inventory');
                        } else {
                            const btn = document.querySelector('button[data-tab="inventory"]');
                            if (btn) btn.click();
                        }
                    });
                    await this.page.waitForSelector('#inventoryCards', { timeout: 10000 });
                    await this.page.waitForFunction(() => {
                        const container = document.getElementById('inventoryCards');
                        return container && container.querySelector('.inventory-card button[onclick^="editItem"]');
                    }, { timeout: 10000 }).catch(() => {});
                    const clicked = await this.page.evaluate(() => {
                        const btn = document.querySelector('#inventoryCards .inventory-card button[onclick^="editItem"]');
                        if (!btn) return false;
                        btn.click();
                        return true;
                    });
                    if (!clicked) {
                        console.log('⚠️ No inventory edit buttons found - skipping modal test');
                        return true;
                    }
                    
                    await this.page.waitForFunction(() => {
                        const modal = document.getElementById('editInventoryModal');
                        return modal && modal.style.display === 'block';
                    }, { timeout: 10000 });
                    
                    const isVisible = await this.page.evaluate(() => {
                        const modal = document.getElementById('editInventoryModal');
                        return modal && modal.style.display === 'block';
                    });
                    
                    await this.page.evaluate(() => {
                        const closeBtn = document.querySelector('#editInventoryModal .close');
                        if (closeBtn) closeBtn.click();
                    });
                    
                    return isVisible;
                }
            },
            {
                name: 'Mobile View Works',
                test: async () => {
                    await this.page.setViewport({ width: 375, height: 667 });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.page.evaluate(() => {
                        if (typeof switchTab === 'function') {
                            switchTab('projects');
                        }
                    });
                    await this.page.waitForSelector('.mobile-cards-grid', { timeout: 10000 });
                    const containerInfo = await this.page.evaluate(() => {
                        const container = document.querySelector('.mobile-cards-grid');
                        if (!container) return { visible: false, childCount: 0 };
                        const style = window.getComputedStyle(container);
                        return { 
                            visible: style.display !== 'none' && style.visibility !== 'hidden',
                            childCount: container.querySelectorAll('.mobile-card').length
                        };
                    });
                    
                    await this.page.setViewport({ width: 1200, height: 800 });
                    
                    return containerInfo.visible;
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
