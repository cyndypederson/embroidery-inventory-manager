#!/usr/bin/env node

/**
 * DATA INTEGRITY TEST SUITE
 * Validates MongoDB data consistency and structure
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection (same as server.js)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cyndypstitchcraft_db_user:4G2vcEQSjAvJoUxY@embroider-inventory.2x57teq.mongodb.net/?retryWrites=true&w=majority&appName=embroider-inventory';

// Color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log(`${colors.bold}${colors.cyan}🔍 ${title}${colors.reset}`);
    log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logPass(test, details = '') {
    log(`✅ PASSED: ${test}${details ? ` - ${details}` : ''}`, 'green');
}

function logFail(test, error = '') {
    log(`❌ FAILED: ${test}${error ? ` - ${error}` : ''}`, 'red');
}

function logWarn(test, warning = '') {
    log(`⚠️  WARNING: ${test}${warning ? ` - ${warning}` : ''}`, 'yellow');
}

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    issues: []
};

function recordResult(test, status, error = null) {
    if (status === 'pass') {
        results.passed++;
        logPass(test);
    } else if (status === 'fail') {
        results.failed++;
        logFail(test, error);
        if (error) results.errors.push({ test, error });
    } else if (status === 'warn') {
        results.warnings++;
        logWarn(test, error);
    }
}

async function testDataIntegrity() {
    let client;
    
    try {
        logSection('Data Integrity Test Suite');
        log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
        log(`🔗 MongoDB URI: Connected`, 'cyan');
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('embroidery_inventory');
        
        log('\n✅ Connected to MongoDB Atlas\n', 'green');
        
        // ===== TEST 1: Required Fields =====
        logSection('Test 1: Required Fields Validation');
        
        const inventory = await db.collection('inventory').find().toArray();
        log(`📦 Total inventory items: ${inventory.length}`, 'cyan');
        
        const missingMongoId = inventory.filter(item => !item._id);
        const missingAppId = inventory.filter(item => !item.id && !item._id);
        const missingType = inventory.filter(item => !item.type);
        const missingDescription = inventory.filter(item => !item.description && !item.name);
        
        if (missingMongoId.length === 0) {
            recordResult('All items have MongoDB _id');
        } else {
            recordResult('Items with missing _id', 'fail', `${missingMongoId.length} items missing MongoDB _id`);
            results.issues.push({ issue: 'Missing _id', count: missingMongoId.length });
        }
        
        if (missingAppId.length === 0) {
            recordResult('All items have either id or _id field');
        } else {
            recordResult('Items with no identifier', 'fail', `${missingAppId.length} items missing both id and _id`);
            results.issues.push({ issue: 'No Identifier', count: missingAppId.length });
        }
        
        if (missingType.length === 0) {
            recordResult('All items have type field');
        } else {
            recordResult('Items with missing type', 'fail', `${missingType.length} items missing type field`);
            results.issues.push({ issue: 'Missing Types', count: missingType.length, items: missingType.map(i => i._id) });
        }
        
        if (missingDescription.length === 0) {
            recordResult('All items have description/name');
        } else {
            recordResult('Items with missing description', 'warn', `${missingDescription.length} items without description`);
        }
        
        // ===== TEST 2: Type Consistency =====
        logSection('Test 2: Type Field Consistency');
        
        const validTypes = ['project', 'inventory', 'sale', 'photo', 'idea'];
        const typeDistribution = {};
        const invalidTypes = [];
        
        inventory.forEach(item => {
            const type = item.type;
            if (!typeDistribution[type]) typeDistribution[type] = 0;
            typeDistribution[type]++;
            
            if (type && !validTypes.includes(type)) {
                invalidTypes.push({ id: item.id, type: item.type });
            }
        });
        
        log('📊 Type Distribution:', 'cyan');
        Object.entries(typeDistribution).forEach(([type, count]) => {
            log(`   ${type}: ${count}`, 'cyan');
        });
        
        if (invalidTypes.length === 0) {
            recordResult('All items have valid types');
        } else {
            recordResult('Invalid type values found', 'fail', `${invalidTypes.length} items with invalid types`);
            results.issues.push({ issue: 'Invalid Types', items: invalidTypes });
        }
        
        // ===== TEST 3: Customer References =====
        logSection('Test 3: Customer Reference Integrity');
        
        const customers = await db.collection('customers').find().toArray();
        const customerNames = customers.map(c => c.name);
        
        log(`👥 Total customers: ${customers.length}`, 'cyan');
        
        const itemsWithCustomers = inventory.filter(item => item.customer);
        const orphanedCustomers = itemsWithCustomers.filter(item => 
            item.customer && !customerNames.includes(item.customer)
        );
        
        if (orphanedCustomers.length === 0) {
            recordResult('No orphaned customer references');
        } else {
            recordResult('Orphaned customer references', 'warn', 
                `${orphanedCustomers.length} items reference non-existent customers`);
            const uniqueOrphans = [...new Set(orphanedCustomers.map(i => i.customer))];
            results.issues.push({ issue: 'Orphaned Customers', customers: uniqueOrphans });
        }
        
        // ===== TEST 4: Customer Consistency =====
        logSection('Test 4: Customer Data Consistency');
        
        const duplicateCustomers = customers.filter((customer, index, self) =>
            self.findIndex(c => c.name === customer.name) !== index
        );
        
        if (duplicateCustomers.length === 0) {
            recordResult('No duplicate customer names');
        } else {
            recordResult('Duplicate customer names', 'warn', `${duplicateCustomers.length} duplicates found`);
            results.issues.push({ issue: 'Duplicate Customers', duplicates: duplicateCustomers.map(c => c.name) });
        }
        
        const customersWithoutContact = customers.filter(c => !c.contact && !c.location);
        if (customersWithoutContact.length > 0) {
            recordResult('Customers without contact info', 'warn', 
                `${customersWithoutContact.length} customers have no contact or location`);
        } else {
            recordResult('All customers have contact information');
        }
        
        // ===== TEST 5: Data Types =====
        logSection('Test 5: Data Type Validation');
        
        const invalidQuantities = inventory.filter(item => 
            item.quantity && (isNaN(item.quantity) || item.quantity < 0)
        );
        const invalidPrices = inventory.filter(item => 
            item.price && (isNaN(item.price) || item.price < 0)
        );
        
        if (invalidQuantities.length === 0) {
            recordResult('All quantities are valid numbers');
        } else {
            recordResult('Invalid quantity values', 'fail', `${invalidQuantities.length} items with invalid quantities`);
        }
        
        if (invalidPrices.length === 0) {
            recordResult('All prices are valid numbers');
        } else {
            recordResult('Invalid price values', 'fail', `${invalidPrices.length} items with invalid prices`);
        }
        
        // ===== TEST 6: Completed Items =====
        logSection('Test 6: Completed Items Validation');
        
        const completedItems = inventory.filter(item => item.status === 'completed');
        log(`✅ Total completed items: ${completedItems.length}`, 'cyan');
        
        const completedWithoutDate = completedItems.filter(item => !item.completedDate && !item.invoicedDate);
        if (completedWithoutDate.length > 0) {
            recordResult('Completed items without date', 'warn', 
                `${completedWithoutDate.length} completed items missing completion/invoice date`);
        } else {
            recordResult('All completed items have dates');
        }
        
        // ===== TEST 7: ID Uniqueness =====
        logSection('Test 7: ID Uniqueness');
        
        const mongoIds = inventory.map(item => item._id?.toString()).filter(id => id);
        const uniqueMongoIds = new Set(mongoIds);
        const duplicateMongoIds = mongoIds.length - uniqueMongoIds.size;
        
        if (duplicateMongoIds === 0) {
            recordResult('All MongoDB _ids are unique');
        } else {
            recordResult('Duplicate MongoDB _ids found', 'fail', `${duplicateMongoIds} duplicate _ids`);
        }
        
        const appIds = inventory.map(item => item.id).filter(id => id);
        if (appIds.length > 0) {
            const uniqueAppIds = new Set(appIds);
            const duplicateAppIds = appIds.length - uniqueAppIds.size;
            
            if (duplicateAppIds === 0) {
                recordResult('All application IDs are unique');
            } else {
                recordResult('Duplicate application IDs found', 'fail', `${duplicateAppIds} duplicate ids`);
            }
        }
        
        // ===== TEST 8: Gallery References =====
        logSection('Test 8: Gallery Item References');
        
        const galleryItems = inventory.filter(item => item.type === 'photo');
        log(`📷 Total gallery items: ${galleryItems.length}`, 'cyan');
        
        const galleryWithoutImage = galleryItems.filter(item => !item.image && !item.imageUrl);
        if (galleryWithoutImage.length > 0) {
            recordResult('Gallery items without images', 'warn', 
                `${galleryWithoutImage.length} gallery items have no image`);
        } else if (galleryItems.length > 0) {
            recordResult('All gallery items have images');
        }
        
        // ===== TEST 9: Sales Data =====
        logSection('Test 9: Sales Data Validation');
        
        const salesItems = inventory.filter(item => item.type === 'sale');
        log(`💰 Total sales: ${salesItems.length}`, 'cyan');
        
        const salesWithoutPrice = salesItems.filter(item => !item.price && !item.listPrice);
        if (salesWithoutPrice.length > 0) {
            recordResult('Sales without price', 'warn', `${salesWithoutPrice.length} sales missing price`);
        } else if (salesItems.length > 0) {
            recordResult('All sales have prices');
        }
        
        const salesWithoutCustomer = salesItems.filter(item => !item.customer);
        if (salesWithoutCustomer.length > 0) {
            recordResult('Sales without customer', 'warn', `${salesWithoutCustomer.length} sales missing customer`);
        } else if (salesItems.length > 0) {
            recordResult('All sales have customers');
        }
        
        // ===== TEST 10: Ideas Data =====
        logSection('Test 10: Ideas Data Validation');
        
        const ideas = inventory.filter(item => item.type === 'idea');
        log(`💡 Total ideas: ${ideas.length}`, 'cyan');
        
        const ideasWithoutDescription = ideas.filter(item => !item.description && !item.name);
        if (ideasWithoutDescription.length > 0) {
            recordResult('Ideas without description', 'warn', `${ideasWithoutDescription.length} ideas missing description`);
        } else if (ideas.length > 0) {
            recordResult('All ideas have descriptions');
        }
        
    } catch (error) {
        log(`\n❌ Critical Error: ${error.message}`, 'red');
        console.error(error);
        results.failed++;
        results.errors.push({ test: 'Database Connection', error: error.message });
    } finally {
        if (client) {
            await client.close();
        }
    }
    
    // ===== FINAL REPORT =====
    logSection('Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed:   ${results.passed}`, 'green');
    log(`   ❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`   ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
    
    if (results.issues.length > 0) {
        log(`\n🔧 Issues Found:`, 'yellow');
        results.issues.forEach(issue => {
            log(`   • ${issue.issue}`, 'yellow');
            if (issue.count) log(`     Count: ${issue.count}`, 'yellow');
            if (issue.items && issue.items.length <= 5) {
                log(`     Items: ${JSON.stringify(issue.items)}`, 'yellow');
            }
            if (issue.customers) log(`     Customers: ${issue.customers.join(', ')}`, 'yellow');
            if (issue.duplicates) log(`     Duplicates: ${issue.duplicates.join(', ')}`, 'yellow');
        });
    }
    
    if (results.errors.length > 0) {
        log(`\n💥 Errors:`, 'red');
        results.errors.forEach(error => {
            log(`   • ${error.test}: ${error.error}`, 'red');
        });
    }
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    process.exit(exitCode);
}

// Run tests
testDataIntegrity().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

