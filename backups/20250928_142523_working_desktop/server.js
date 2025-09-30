const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cyndypstitchcraft_db_user:4G2vcEQSjAvJoUxY@embroider-inventory.2x57teq.mongodb.net/?retryWrites=true&w=majority&appName=embroider-inventory';
const DB_NAME = 'embroidery_inventory';
let db;

// Connect to MongoDB (lazy connection)
async function connectToDatabase() {
    if (db) return db; // Already connected
    
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            connectTimeoutMS: 5000,
        });
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ Connected to MongoDB Atlas');
        
        // Initialize collections with sample data if empty
        await initializeCollections();
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('❌ Full error:', error);
        return null;
    }
}

// Initialize collections with sample data
async function initializeCollections() {
    try {
        // Check if inventory collection is empty
        const inventoryCount = await db.collection('inventory').countDocuments();
        if (inventoryCount === 0) {
            // Load sample data from files
            const fs = require('fs');
            const inventoryPath = path.join(__dirname, 'data', 'inventory.json');
            const customersPath = path.join(__dirname, 'data', 'customers.json');
            const salesPath = path.join(__dirname, 'data', 'sales.json');
            const galleryPath = path.join(__dirname, 'data', 'gallery.json');
            
            if (fs.existsSync(inventoryPath)) {
                const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
                await db.collection('inventory').insertMany(inventoryData);
                console.log('📦 Loaded inventory sample data');
            }
            
            if (fs.existsSync(customersPath)) {
                const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
                await db.collection('customers').insertMany(customersData);
                console.log('👥 Loaded customers sample data');
            }
            
            if (fs.existsSync(salesPath)) {
                const salesData = JSON.parse(fs.readFileSync(salesPath, 'utf8'));
                await db.collection('sales').insertMany(salesData);
                console.log('💰 Loaded sales sample data');
            }
            
            if (fs.existsSync(galleryPath)) {
                const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
                await db.collection('gallery').insertMany(galleryData);
                console.log('🖼️ Loaded gallery sample data');
            }
            
            // Initialize ideas collection (empty by default)
            const ideasCount = await db.collection('ideas').countDocuments();
            if (ideasCount === 0) {
                console.log('💡 Ideas collection initialized');
            }
        }
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Add URL encoded support

// NUCLEAR CACHE CONTROL - Force no caching whatsoever
app.use((req, res, next) => {
    // Force no cache for all files to prevent version mismatches
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private, no-transform');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.setHeader('Vary', '*');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Lookup', 'MISS');
    
    // Add timestamp to all responses
    res.locals.timestamp = Date.now();
    res.locals.random = Math.random().toString(36).substring(7);
    
    next();
});

app.use(express.static(path.join(__dirname)));

// Version check endpoint for debugging
app.get('/version.json', (req, res) => {
    const packageJson = require('./package.json');
    res.json({
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        build: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve the main HTML file with NUCLEAR cache busting
app.get('/', (req, res) => {
    // Add timestamp to response headers
    res.setHeader('X-Timestamp', res.locals.timestamp);
    res.setHeader('X-Random', res.locals.random);
    res.setHeader('X-Cache-Bust', `${res.locals.timestamp}-${res.locals.random}`);
    
    // If no cache bust parameter, redirect with one
    if (!req.query.cb) {
        const timestamp = Date.now();
        return res.redirect(`/?cb=${timestamp}&r=${Math.random().toString(36).substring(7)}`);
    }
    
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const database = await connectToDatabase();
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: database ? 'Connected' : 'Disconnected'
    });
});

// API endpoints for data persistence
app.get('/api/inventory', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const inventory = await database.collection('inventory').find({}).toArray();
        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('inventory').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('inventory').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving inventory:', error);
        res.status(500).json({ error: 'Failed to save inventory data' });
    }
});

// Update individual inventory item
app.put('/api/inventory/:id', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { id } = req.params;
        const updateData = req.body;
        
        const result = await database.collection('inventory').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const customers = await database.collection('customers').find({}).toArray();
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers data' });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('customers').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('customers').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving customers:', error);
        res.status(500).json({ error: 'Failed to save customers data' });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const sales = await database.collection('sales').find({}).toArray();
        res.json(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('sales').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('sales').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving sales:', error);
        res.status(500).json({ error: 'Failed to save sales data' });
    }
});

app.get('/api/gallery', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const gallery = await database.collection('gallery').find({}).toArray();
        res.json(gallery);
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ error: 'Failed to fetch gallery data' });
    }
});

app.post('/api/gallery', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('gallery').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('gallery').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving gallery:', error);
        res.status(500).json({ error: 'Failed to save gallery data' });
    }
});

app.get('/api/ideas', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const ideas = await database.collection('ideas').find({}).toArray();
        res.json(ideas);
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ error: 'Failed to fetch ideas data' });
    }
});

app.post('/api/ideas', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('ideas').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('ideas').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving ideas:', error);
        res.status(500).json({ error: 'Failed to save ideas data' });
    }
});

// Connect to database and start server
connectToDatabase().then(() => {
    // Start server only if not in Vercel environment
    if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
        app.listen(PORT, () => {
            console.log(`\n🚀 Embroidery Inventory Manager Server Running!`);
            console.log(`   Local:   http://localhost:${PORT}`);
            console.log(`   Network: http://${getLocalIP()}:${PORT}`);
            console.log(`\n📱 Access from any device on your network using the Network URL`);
        });
    }
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

// Export for Vercel
module.exports = app;