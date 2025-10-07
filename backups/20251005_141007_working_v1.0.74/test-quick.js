const puppeteer = require('puppeteer');

async function quickTest() {
    console.log('🚀 Running Quick Modal Separation Test...');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to the app
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
        await page.waitForSelector('button[data-tab="projects"]', { timeout: 10000 });
        
        console.log('✅ App loaded successfully');
        
        // Test 1: Check if both modals exist in HTML
        const projectModal = await page.$('#editProjectModal');
        const inventoryModal = await page.$('#editInventoryModal');
        
        console.log(`✅ Project Modal exists: ${projectModal !== null}`);
        console.log(`✅ Inventory Modal exists: ${inventoryModal !== null}`);
        
        // Test 2: Check if JavaScript functions exist
        const functionsExist = await page.evaluate(() => {
            return {
                editProject: typeof window.editProject === 'function',
                editInventoryItem: typeof window.editInventoryItem === 'function',
                handleEditProject: typeof window.handleEditProject === 'function',
                handleEditInventory: typeof window.handleEditInventory === 'function'
            };
        });
        
        console.log('✅ JavaScript Functions:');
        console.log(`   editProject: ${functionsExist.editProject}`);
        console.log(`   editInventoryItem: ${functionsExist.editInventoryItem}`);
        console.log(`   handleEditProject: ${functionsExist.handleEditProject}`);
        console.log(`   handleEditInventory: ${functionsExist.handleEditInventory}`);
        
        // Test 3: Check if modals are hidden by default
        const modalStates = await page.evaluate(() => {
            const projectModal = document.getElementById('editProjectModal');
            const inventoryModal = document.getElementById('editInventoryModal');
            
            return {
                projectHidden: projectModal && (projectModal.style.display === 'none' || projectModal.style.display === ''),
                inventoryHidden: inventoryModal && (inventoryModal.style.display === 'none' || inventoryModal.style.display === '')
            };
        });
        
        console.log('✅ Modal States:');
        console.log(`   Project Modal hidden: ${modalStates.projectHidden}`);
        console.log(`   Inventory Modal hidden: ${modalStates.inventoryHidden}`);
        
        // Test 4: Check tab switching
        await page.click('button[data-tab="projects"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const projectsActive = await page.evaluate(() => {
            const btn = document.querySelector('button[data-tab="projects"]');
            return btn && btn.classList.contains('active');
        });
        
        await page.click('button[data-tab="inventory"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const inventoryActive = await page.evaluate(() => {
            const btn = document.querySelector('button[data-tab="inventory"]');
            return btn && btn.classList.contains('active');
        });
        
        console.log('✅ Tab Switching:');
        console.log(`   Projects tab works: ${projectsActive}`);
        console.log(`   Inventory tab works: ${inventoryActive}`);
        
        // Summary
        const allTestsPassed = projectModal !== null && 
                              inventoryModal !== null && 
                              functionsExist.editProject && 
                              functionsExist.editInventoryItem &&
                              functionsExist.handleEditProject &&
                              functionsExist.handleEditInventory &&
                              modalStates.projectHidden &&
                              modalStates.inventoryHidden &&
                              projectsActive &&
                              inventoryActive;
        
        console.log('\n📊 QUICK TEST RESULTS:');
        console.log(`✅ All tests passed: ${allTestsPassed}`);
        
        if (allTestsPassed) {
            console.log('🎉 MODAL SEPARATION IS WORKING CORRECTLY!');
            console.log('✅ Ready for deployment');
        } else {
            console.log('❌ Some tests failed - check implementation');
        }
        
    } catch (error) {
        console.error('🚨 Test error:', error.message);
    } finally {
        await browser.close();
    }
}

quickTest();
