#!/usr/bin/env node

/**
 * Test Copy Button Functionality
 */

const puppeteer = require('puppeteer');

async function testCopyButton() {
    console.log('🧪 Testing Copy Button Functionality...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Track console messages
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        if (msg.type() === 'error') {
            errors.push(text);
            console.error('❌ Console Error:', text);
        } else if (text.includes('copy')) {
            console.log('📋', text);
        }
    });

    try {
        console.log('1️⃣ Navigating to app...');
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000);

        console.log('2️⃣ Switching to Inventory tab...');
        await page.click('#inventoryTab');
        await page.waitForTimeout(2000);

        console.log('3️⃣ Looking for copy button...');
        
        // Wait for the inventory table to load
        const inventoryTable = await page.$('#inventoryItemsTable');
        if (!inventoryTable) {
            throw new Error('Inventory table not found');
        }

        // Find all copy buttons
        const copyButtons = await page.$$('button[title="Copy Item"]');
        console.log(`   Found ${copyButtons.length} copy buttons`);

        if (copyButtons.length === 0) {
            throw new Error('No copy buttons found in the inventory table');
        }

        // Get initial inventory count
        const initialCount = await page.evaluate(() => {
            return window.inventory ? window.inventory.length : 0;
        });
        console.log(`   Initial inventory count: ${initialCount}`);

        console.log('4️⃣ Clicking first copy button...');
        await copyButtons[0].click();
        await page.waitForTimeout(3000); // Wait for copy operation to complete

        // Get new inventory count
        const newCount = await page.evaluate(() => {
            return window.inventory ? window.inventory.length : 0;
        });
        console.log(`   New inventory count: ${newCount}`);

        // Check for MongoDB errors in console
        const mongoErrors = consoleMessages.filter(msg => 
            msg.includes('E11000') || 
            msg.includes('duplicate key error') ||
            msg.includes('Failed to save')
        );

        console.log('\n📊 Test Results:');
        console.log('================');
        
        if (mongoErrors.length > 0) {
            console.log('❌ MongoDB Errors Found:');
            mongoErrors.forEach(err => console.log('   -', err));
        } else {
            console.log('✅ No MongoDB duplicate key errors');
        }

        if (newCount > initialCount) {
            console.log(`✅ Item copied successfully (${initialCount} → ${newCount})`);
        } else {
            console.log(`❌ Item not copied (count stayed at ${initialCount})`);
        }

        if (errors.length === 0) {
            console.log('✅ No console errors');
        } else {
            console.log(`❌ ${errors.length} console errors found`);
        }

        // Check if copy button still exists after copy (table refresh)
        await page.waitForTimeout(1000);
        const copyButtonsAfter = await page.$$('button[title="Copy Item"]');
        if (copyButtonsAfter.length > 0) {
            console.log('✅ Copy buttons still visible after copy');
        } else {
            console.log('❌ Copy buttons disappeared after copy');
        }

        console.log('\n✅ Copy button test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }

    console.log('\n🔄 Keeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    
    await browser.close();
}

testCopyButton().catch(console.error);

