// Simple authentication setup for external access
// Run this to add basic username/password protection

const fs = require('fs');
const path = require('path');

// Create a simple auth configuration
const authConfig = {
  username: 'admin',
  password: 'embroidery2024', // Change this to something secure!
  enabled: false // Set to true to enable authentication
};

// Save auth config
const configPath = path.join(__dirname, 'data', 'auth.json');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

fs.writeFileSync(configPath, JSON.stringify(authConfig, null, 2));

console.log('🔐 Authentication setup complete!');
console.log('📁 Config saved to: data/auth.json');
console.log('');
console.log('To enable authentication:');
console.log('1. Edit data/auth.json');
console.log('2. Set "enabled": true');
console.log('3. Change the username and password');
console.log('4. Restart your application');
console.log('');
console.log('Default credentials:');
console.log('Username: admin');
console.log('Password: embroidery2024');
console.log('');
console.log('⚠️  IMPORTANT: Change these credentials before going live!');
