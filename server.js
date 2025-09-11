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

// API endpoints for data persistence
app.get('/api/inventory', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'data', 'inventory.json');
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load inventory data' });
    }
});

app.post('/api/inventory', (req, res) => {
    try {
        const fs = require('fs');
        const dataDir = path.join(__dirname, 'data');
        const dataPath = path.join(dataDir, 'inventory.json');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save inventory data' });
    }
});

app.get('/api/customers', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'data', 'customers.json');
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load customers data' });
    }
});

app.post('/api/customers', (req, res) => {
    try {
        const fs = require('fs');
        const dataDir = path.join(__dirname, 'data');
        const dataPath = path.join(dataDir, 'customers.json');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save customers data' });
    }
});

app.get('/api/sales', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'data', 'sales.json');
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load sales data' });
    }
});

app.post('/api/sales', (req, res) => {
    try {
        const fs = require('fs');
        const dataDir = path.join(__dirname, 'data');
        const dataPath = path.join(dataDir, 'sales.json');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save sales data' });
    }
});

app.get('/api/gallery', (req, res) => {
    try {
        const fs = require('fs');
        const dataPath = path.join(__dirname, 'data', 'gallery.json');
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load gallery data' });
    }
});

app.post('/api/gallery', (req, res) => {
    try {
        const fs = require('fs');
        const dataDir = path.join(__dirname, 'data');
        const dataPath = path.join(dataDir, 'gallery.json');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save gallery data' });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Embroidery Inventory Manager running at:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${getLocalIP()}:${PORT}`);
    console.log(`\n📱 Access from any device on your network using the Network URL`);
});

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
