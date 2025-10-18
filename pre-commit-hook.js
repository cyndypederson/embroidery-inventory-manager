#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Pre-commit hook to ensure version bumping
function checkVersionBump() {
    console.log('🔍 Checking if version needs to be bumped...');
    
    // Get current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    
    // Check if there are uncommitted changes
    try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        const hasChanges = gitStatus.trim().length > 0;
        
        if (hasChanges) {
            console.log('📝 Found uncommitted changes');
            
            // Check if any of the tracked files have been modified
            const modifiedFiles = gitStatus.split('\n')
                .filter(line => line.startsWith('M'))
                .map(line => line.substring(3).trim());
            
            const versionFiles = ['package.json', 'script.js', 'index.html'];
            const versionFilesModified = modifiedFiles.some(file => 
                versionFiles.some(versionFile => file.includes(versionFile))
            );
            
            if (versionFilesModified) {
                console.log('✅ Version-related files have been modified');
                return true; // Version bump is appropriate
            } else {
                console.log('ℹ️  No version-related files modified, version bump not needed');
                return false;
            }
        } else {
            console.log('ℹ️  No uncommitted changes');
            return false;
        }
    } catch (error) {
        console.log('⚠️  Could not check git status:', error.message);
        return false;
    }
}

function suggestVersionBump() {
    console.log('\n📋 SUGGESTION: Consider bumping version before commit');
    console.log('   Run: npm run version:bump');
    console.log('   Or manually edit package.json version field');
    console.log('   Current version:', require('./package.json').version);
}

// Main execution
if (checkVersionBump()) {
    console.log('\n⚠️  WARNING: You have modified version-related files');
    console.log('   Consider running "npm run version:bump" before committing');
    console.log('   This ensures version consistency across all files');
    
    // Check if this is being run as a git hook
    if (process.env.GIT_HOOK === 'true') {
        console.log('❌ Version bump required before commit');
        process.exit(1);
    } else {
        suggestVersionBump();
    }
} else {
    console.log('✅ Version check passed');
}

module.exports = { checkVersionBump, suggestVersionBump };
