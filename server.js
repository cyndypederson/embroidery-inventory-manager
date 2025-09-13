const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// In-memory data store (for Vercel serverless)
let inventoryData = [];
let customersData = [];
let salesData = [];
let galleryData = [];

// Load initial data from files if available
try {
    const fs = require('fs');
    const inventoryPath = path.join(__dirname, 'data', 'inventory.json');
    const customersPath = path.join(__dirname, 'data', 'customers.json');
    const salesPath = path.join(__dirname, 'data', 'sales.json');
    const galleryPath = path.join(__dirname, 'data', 'gallery.json');
    
    if (fs.existsSync(inventoryPath)) {
        inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    }
    if (fs.existsSync(customersPath)) {
        customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
    }
    if (fs.existsSync(salesPath)) {
        salesData = JSON.parse(fs.readFileSync(salesPath, 'utf8'));
    }
    if (fs.existsSync(galleryPath)) {
        galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
    }
} catch (error) {
    console.log('Could not load initial data, starting with empty arrays');
}

// API endpoints for data persistence
app.get('/api/inventory', (req, res) => {
    res.json(inventoryData);
});

app.post('/api/inventory', (req, res) => {
    inventoryData = req.body;
    res.json({ success: true });
});

app.get('/api/customers', (req, res) => {
    res.json(customersData);
});

app.post('/api/customers', (req, res) => {
    customersData = req.body;
    res.json({ success: true });
});

app.get('/api/sales', (req, res) => {
    res.json(salesData);
});

app.post('/api/sales', (req, res) => {
    salesData = req.body;
    res.json({ success: true });
});

app.get('/api/gallery', (req, res) => {
    res.json(galleryData);
});

app.post('/api/gallery', (req, res) => {
    galleryData = req.body;
    res.json({ success: true });
});

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Embroidery Inventory Manager Server Running!`);
        console.log(`   Local:   http://localhost:${PORT}`);
        console.log(`   Network: http://${getLocalIP()}:${PORT}`);
        console.log(`\n📱 Access from any device on your network using the Network URL`);
    });
}

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Export for Vercel
module.exports = app;