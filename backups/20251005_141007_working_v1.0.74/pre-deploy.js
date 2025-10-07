#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PreDeploymentChecker {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${timestamp}] ${message}`);
    }

    async runCommand(command, description) {
        try {
            this.log(`Running: ${description}`);
            const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
            this.log(`Success: ${description}`, 'success');
            return { success: true, output };
        } catch (error) {
            this.log(`Failed: ${description} - ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async checkServerRunning() {
        this.log('Checking if server is running...');
        
        try {
            const response = await fetch('http://localhost:3002');
            if (response.ok) {
                this.log('Server is running on localhost:3002', 'success');
                return true;
            } else {
                this.log('Server responded with error status', 'warning');
                return false;
            }
        } catch (error) {
            this.log('Server is not running. Starting server...', 'warning');
            
            // Try to start the server
            const startResult = await this.runCommand('PORT=3002 npm start &', 'Starting server');
            if (startResult.success) {
                // Wait for server to start
                await new Promise(resolve => setTimeout(resolve, 5000));
                return await this.checkServerRunning();
            }
            return false;
        }
    }

    async runSmokeTests() {
        this.log('Running smoke tests...');
        const result = await this.runCommand('node test-smoke.js', 'Smoke tests');
        
        if (result.success) {
            this.results.push({ test: 'Smoke Tests', status: 'PASS' });
        } else {
            this.results.push({ test: 'Smoke Tests', status: 'FAIL', error: result.error });
        }
        
        return result.success;
    }

    async runModalTests() {
        this.log('Running modal separation tests...');
        const result = await this.runCommand('node test-modal-separation.js', 'Modal separation tests');
        
        if (result.success) {
            this.results.push({ test: 'Modal Tests', status: 'PASS' });
        } else {
            this.results.push({ test: 'Modal Tests', status: 'FAIL', error: result.error });
        }
        
        return result.success;
    }

    async runComprehensiveTests() {
        this.log('Running comprehensive tests...');
        const result = await this.runCommand('node test-comprehensive.js', 'Comprehensive tests');
        
        if (result.success) {
            this.results.push({ test: 'Comprehensive Tests', status: 'PASS' });
        } else {
            this.results.push({ test: 'Comprehensive Tests', status: 'FAIL', error: result.error });
        }
        
        return result.success;
    }

    async checkFileIntegrity() {
        this.log('Checking file integrity...');
        
        const criticalFiles = [
            'index.html',
            'script.js',
            'styles.css',
            'server.js',
            'package.json'
        ];
        
        let allFilesExist = true;
        
        for (const file of criticalFiles) {
            if (fs.existsSync(file)) {
                this.log(`Found: ${file}`, 'success');
            } else {
                this.log(`Missing: ${file}`, 'error');
                allFilesExist = false;
            }
        }
        
        if (allFilesExist) {
            this.results.push({ test: 'File Integrity', status: 'PASS' });
        } else {
            this.results.push({ test: 'File Integrity', status: 'FAIL' });
        }
        
        return allFilesExist;
    }

    async checkModalFiles() {
        this.log('Checking modal separation files...');
        
        // Check if HTML contains both modals
        const htmlContent = fs.readFileSync('index.html', 'utf8');
        const hasProjectModal = htmlContent.includes('editProjectModal');
        const hasInventoryModal = htmlContent.includes('editInventoryModal');
        
        if (hasProjectModal && hasInventoryModal) {
            this.log('Both edit modals found in HTML', 'success');
            this.results.push({ test: 'Modal HTML', status: 'PASS' });
        } else {
            this.log('Missing modals in HTML', 'error');
            this.results.push({ test: 'Modal HTML', status: 'FAIL' });
        }
        
        // Check if JavaScript contains both functions
        const jsContent = fs.readFileSync('script.js', 'utf8');
        const hasEditProject = jsContent.includes('function editProject(');
        const hasEditInventory = jsContent.includes('function editInventoryItem(');
        const hasHandleProject = jsContent.includes('function handleEditProject(');
        const hasHandleInventory = jsContent.includes('function handleEditInventory(');
        
        if (hasEditProject && hasEditInventory && hasHandleProject && hasHandleInventory) {
            this.log('All modal functions found in JavaScript', 'success');
            this.results.push({ test: 'Modal JavaScript', status: 'PASS' });
        } else {
            this.log('Missing modal functions in JavaScript', 'error');
            this.results.push({ test: 'Modal JavaScript', status: 'FAIL' });
        }
        
        return hasProjectModal && hasInventoryModal && hasEditProject && hasEditInventory;
    }

    async createBackup() {
        this.log('Creating backup...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = `backup-pre-deploy-${timestamp}`;
        
        try {
            execSync(`mkdir -p ${backupDir}`);
            execSync(`cp -r data/ ${backupDir}/`);
            execSync(`cp index.html script.js styles.css server.js package.json ${backupDir}/`);
            
            this.log(`Backup created: ${backupDir}`, 'success');
            this.results.push({ test: 'Backup Creation', status: 'PASS' });
            return true;
        } catch (error) {
            this.log(`Backup failed: ${error.message}`, 'error');
            this.results.push({ test: 'Backup Creation', status: 'FAIL' });
            return false;
        }
    }

    async updateVersion() {
        this.log('Updating version number...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const currentVersion = packageJson.version;
            const versionParts = currentVersion.split('.');
            versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
            const newVersion = versionParts.join('.');
            
            packageJson.version = newVersion;
            fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
            
            this.log(`Version updated: ${currentVersion} → ${newVersion}`, 'success');
            this.results.push({ test: 'Version Update', status: 'PASS' });
            return true;
        } catch (error) {
            this.log(`Version update failed: ${error.message}`, 'error');
            this.results.push({ test: 'Version Update', status: 'FAIL' });
            return false;
        }
    }

    printResults() {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('🚀 PRE-DEPLOYMENT CHECK RESULTS');
        console.log('='.repeat(60));
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;
        
        console.log(`Duration: ${duration} seconds`);
        console.log(`Total Checks: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        console.log('\n📋 DETAILED RESULTS:');
        console.log('-'.repeat(60));
        
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        if (failed > 0) {
            console.log('\n🚨 DEPLOYMENT BLOCKED - ISSUES FOUND');
            console.log('Please fix the failed checks before deploying.');
            console.log('\nRecommended actions:');
            this.results.filter(r => r.status === 'FAIL').forEach(result => {
                console.log(`- Fix: ${result.test}`);
            });
            process.exit(1);
        } else {
            console.log('\n🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT');
            console.log('\nNext steps:');
            console.log('1. Review the DEPLOYMENT_CHECKLIST.md');
            console.log('2. Run manual testing if needed');
            console.log('3. Deploy to your target environment');
            console.log('4. Run post-deployment verification');
            process.exit(0);
        }
    }

    async run() {
        console.log('🚀 Starting Pre-Deployment Checks...\n');
        
        // Check if server is running
        const serverRunning = await this.checkServerRunning();
        if (!serverRunning) {
            this.log('Cannot proceed without running server', 'error');
            process.exit(1);
        }
        
        // Run all checks
        await this.checkFileIntegrity();
        await this.checkModalFiles();
        await this.runSmokeTests();
        await this.runModalTests();
        await this.runComprehensiveTests();
        await this.createBackup();
        await this.updateVersion();
        
        this.printResults();
    }
}

// Run pre-deployment checks
new PreDeploymentChecker().run().catch(console.error);
