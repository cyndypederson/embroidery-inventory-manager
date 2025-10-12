const fs = require('fs');
const { execSync } = require('child_process');

function killExistingProcesses() {
    console.log('🔄 Checking for existing processes on port 3002...');
    try {
        // Check if port 3002 is in use
        const result = execSync('lsof -i :3002', { encoding: 'utf8' });
        if (result.trim()) {
            console.log('⚠️  Found existing processes on port 3002, killing them...');
            // Kill all node processes
            execSync('pkill -f "node server.js"', { stdio: 'ignore' });
            // Kill any processes on port 3002
            execSync('lsof -ti :3002 | xargs kill -9', { stdio: 'ignore' });
            console.log('✅ Killed existing processes');
        } else {
            console.log('✅ No existing processes found on port 3002');
        }
    } catch (error) {
        console.log('✅ No existing processes found on port 3002');
    }
}

function updateVersion(newVersion) {
    console.log(`🔄 Updating all version references to ${newVersion}...`);
    
    // Kill existing processes first
    killExistingProcesses();
    
    // 1. Update script.js
    let scriptContent = fs.readFileSync('script.js', 'utf8');
    scriptContent = scriptContent.replace(/appVersion: '[\d.]+'/g, `appVersion: '${newVersion}'`);
    scriptContent = scriptContent.replace(/currentVersion = '[\d.]+'/g, `currentVersion = '${newVersion}'`);
    fs.writeFileSync('script.js', scriptContent);
    console.log('✅ Updated script.js');
    
    // 2. Update index.html
    let htmlContent = fs.readFileSync('index.html', 'utf8');
    htmlContent = htmlContent.replace(/<meta name="version" content="[\d.]+">/g, `<meta name="version" content="${newVersion}">`);
    htmlContent = htmlContent.replace(/<title>CyndyP StitchCraft Inventory - v[\d.]+ - CACHE BUST<\/title>/g, `<title>CyndyP StitchCraft Inventory - v${newVersion} - CACHE BUST</title>`);
    htmlContent = htmlContent.replace(/<i class="fas fa-tag"><\/i> v[\d.]+/g, `<i class="fas fa-tag"></i> v${newVersion}`);
    htmlContent = htmlContent.replace(/document\.title = 'CyndyP StitchCraft Inventory - v[\d.]+ - '/g, `document.title = 'CyndyP StitchCraft Inventory - v${newVersion} - '`);
    htmlContent = htmlContent.replace(/appVersion !== '[\d.]+'/g, `appVersion !== '${newVersion}'`);
    htmlContent = htmlContent.replace(/Version: [\d.]+/g, `Version: ${newVersion}`);
    htmlContent = htmlContent.replace(/script\.js\?v=[\d.]+/g, `script.js?v=${newVersion}`);
    fs.writeFileSync('index.html', htmlContent);
    console.log('✅ Updated index.html');
    
    // 3. Update package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');
    
    console.log(`🎉 All version references updated to ${newVersion}!`);
}

function restartServer() {
    console.log('🔄 Starting server with new version...');
    try {
        // Start server in background
        const { spawn } = require('child_process');
        const server = spawn('node', ['server.js'], {
            detached: true,
            stdio: 'ignore'
        });
        server.unref();
        
        // Wait a moment for server to start
        setTimeout(() => {
            try {
                const result = execSync('curl -s http://localhost:3002/version.json', { encoding: 'utf8' });
                const versionInfo = JSON.parse(result);
                console.log(`✅ Server restarted successfully! Running version ${versionInfo.version}`);
                console.log(`🌐 Server available at: http://localhost:3002`);
            } catch (error) {
                console.log('⚠️  Server started but version check failed. Please check manually.');
            }
        }, 3000);
        
    } catch (error) {
        console.log('❌ Failed to restart server:', error.message);
        console.log('Please start the server manually with: node server.js');
    }
}

// Get new version from command line or increment current
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);
versionParts[2]++; // Increment patch version
const newVersion = versionParts.join('.');

updateVersion(newVersion);

// Ask user if they want to restart the server
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('🔄 Do you want to restart the server automatically? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        restartServer();
    } else {
        console.log('📝 To start the server manually, run: node server.js');
    }
    rl.close();
});
