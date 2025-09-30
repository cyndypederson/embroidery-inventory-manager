#!/usr/bin/env node

/**
 * Browser Modal Testing Script
 * Tests modal layout in a real browser environment
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testModalLayout() {
    console.log('🌐 Starting Browser Modal Tests...\n');
    
    let browser;
    let page;
    
    try {
        // Launch browser
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({ 
            headless: false, // Set to true for headless testing
            defaultViewport: { width: 1200, height: 800 }
        });
        
        page = await browser.newPage();
        
        // Navigate to localhost
        console.log('📱 Navigating to localhost:3002...');
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Test 1: Check if version is correct
        console.log('\n📋 Test 1: Checking version...');
        const version = await page.evaluate(() => {
            const versionDisplay = document.getElementById('versionDisplay');
            return versionDisplay ? versionDisplay.textContent : 'Not found';
        });
        console.log(`  Version: ${version}`);
        
        // Test 2: Open Add Item Modal
        console.log('\n📋 Test 2: Testing Add Item Modal...');
        await page.click('#addItemBtn');
        await page.waitForTimeout(1000);
        
        // Check modal layout
        const addModalLayout = await page.evaluate(() => {
            const modal = document.getElementById('addItemModal');
            const form = document.getElementById('addItemForm');
            
            if (!modal || !form) return { error: 'Modal or form not found' };
            
            const computedStyle = window.getComputedStyle(form);
            return {
                display: computedStyle.display,
                gridTemplateColumns: computedStyle.gridTemplateColumns,
                gap: computedStyle.gap,
                width: computedStyle.width,
                isVisible: modal.style.display !== 'none'
            };
        });
        
        console.log('  Add Modal Layout:', addModalLayout);
        
        // Close modal
        await page.click('.close');
        await page.waitForTimeout(500);
        
        // Test 3: Open Edit Item Modal (if items exist)
        console.log('\n📋 Test 3: Testing Edit Item Modal...');
        
        // Check if there are items to edit
        const hasItems = await page.evaluate(() => {
            const editButtons = document.querySelectorAll('[onclick*="editItem"]');
            return editButtons.length > 0;
        });
        
        if (hasItems) {
            await page.click('[onclick*="editItem"]:first-child');
            await page.waitForTimeout(1000);
            
            const editModalLayout = await page.evaluate(() => {
                const modal = document.getElementById('editItemModal');
                const form = document.getElementById('editItemForm');
                
                if (!modal || !form) return { error: 'Modal or form not found' };
                
                const computedStyle = window.getComputedStyle(form);
                return {
                    display: computedStyle.display,
                    gridTemplateColumns: computedStyle.gridTemplateColumns,
                    gap: computedStyle.gap,
                    width: computedStyle.width,
                    isVisible: modal.style.display !== 'none'
                };
            });
            
            console.log('  Edit Modal Layout:', editModalLayout);
            
            // Check image section visibility
            const imageSection = await page.evaluate(() => {
                const imageSection = document.getElementById('editItemImageSection');
                return imageSection ? imageSection.style.display : 'Not found';
            });
            
            console.log('  Image Section Display:', imageSection);
            
            // Close modal
            await page.click('.close');
        } else {
            console.log('  No items to edit - skipping edit modal test');
        }
        
        // Test 4: Test mobile view
        console.log('\n📋 Test 4: Testing Mobile View...');
        await page.setViewport({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        await page.click('#addItemBtn');
        await page.waitForTimeout(1000);
        
        const mobileLayout = await page.evaluate(() => {
            const form = document.getElementById('addItemForm');
            if (!form) return { error: 'Form not found' };
            
            const computedStyle = window.getComputedStyle(form);
            return {
                display: computedStyle.display,
                gridTemplateColumns: computedStyle.gridTemplateColumns,
                gap: computedStyle.gap,
                width: computedStyle.width
            };
        });
        
        console.log('  Mobile Layout:', mobileLayout);
        
        // Close modal
        await page.click('.close');
        
        // Reset viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        console.log('\n✅ All browser tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if puppeteer is available
try {
    require('puppeteer');
    testModalLayout();
} catch (error) {
    console.log('⚠️  Puppeteer not installed. Installing...');
    const { execSync } = require('child_process');
    try {
        execSync('npm install puppeteer --save-dev', { stdio: 'inherit' });
        console.log('✅ Puppeteer installed. Run the test again.');
    } catch (installError) {
        console.log('❌ Failed to install puppeteer. Please install manually: npm install puppeteer --save-dev');
    }
}
