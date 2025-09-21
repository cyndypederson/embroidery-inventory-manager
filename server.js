const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const Joi = require('joi');
const winston = require('winston');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'embroidery-inventory',
        version: require('./package.json').version,
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Add request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        });
    });
    
    next();
});

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Validation schemas
const inventoryItemSchema = Joi.object({
    description: Joi.string().min(1).max(500).required(),
    quantity: Joi.number().integer().min(0).required(),
    type: Joi.string().valid('inventory', 'project').required(),
    category: Joi.string().max(50),
    status: Joi.string().valid('pending', 'in-progress', 'work-in-progress', 'completed', 'sold', 'available', 'low-stock', 'out-of-stock'),
    notes: Joi.string().max(1000),
    price: Joi.number().min(0),
    location: Joi.string().max(100),
    supplier: Joi.string().max(100),
    reorderPoint: Joi.number().integer().min(0),
    customer: Joi.string().max(100),
    dueDate: Joi.date(),
    priority: Joi.string().valid('low', 'medium', 'high'),
    tags: Joi.string().max(200),
    patternLink: Joi.string().uri()
});

const customerSchema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
    location: Joi.string().max(100),
    contact: Joi.string().max(200)
});

const saleSchema = Joi.object({
    type: Joi.string().valid('inventory', 'custom').required(),
    itemName: Joi.string().max(200),
    itemDescription: Joi.string().max(500),
    listedPrice: Joi.number().min(0).required(),
    salePrice: Joi.number().min(0).required(),
    commission: Joi.number().min(0).max(100),
    saleDate: Joi.date(),
    customer: Joi.string().max(100),
    notes: Joi.string().max(500)
});

// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: error.details.map(detail => detail.message) 
            });
        }
        next();
    };
};

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cyndypstitchcraft_db_user:4G2vcEQSjAvJoUxY@embroider-inventory.2x57teq.mongodb.net/?retryWrites=true&w=majority&appName=embroider-inventory';
const DB_NAME = process.env.DB_NAME || 'embroidery_inventory';
let db;

// Connect to MongoDB (lazy connection)
async function connectToDatabase() {
    if (db) return db; // Already connected
    
    try {
        logger.info('🔄 Attempting to connect to MongoDB...');
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            connectTimeoutMS: 5000,
        });
        await client.connect();
        db = client.db(DB_NAME);
        logger.info('✅ Connected to MongoDB Atlas');
        
        // Initialize collections with sample data if empty
        await initializeCollections();
        
        // Create database indexes for performance
        await createIndexes();
        
        return db;
    } catch (error) {
        logger.error('❌ MongoDB connection error:', { error: error.message, stack: error.stack });
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
                logger.info('📦 Loaded inventory sample data', { count: inventoryData.length });
            }
            
            if (fs.existsSync(customersPath)) {
                const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
                await db.collection('customers').insertMany(customersData);
                logger.info('👥 Loaded customers sample data', { count: customersData.length });
            }
            
            if (fs.existsSync(salesPath)) {
                const salesData = JSON.parse(fs.readFileSync(salesPath, 'utf8'));
                await db.collection('sales').insertMany(salesData);
                logger.info('💰 Loaded sales sample data', { count: salesData.length });
            }
            
            if (fs.existsSync(galleryPath)) {
                const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
                await db.collection('gallery').insertMany(galleryData);
                logger.info('🖼️ Loaded gallery sample data', { count: galleryData.length });
            }
            
            // Initialize ideas collection (empty by default)
            const ideasCount = await db.collection('ideas').countDocuments();
            if (ideasCount === 0) {
                logger.info('💡 Ideas collection initialized');
            }
        }
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
}

// Create database indexes for performance
async function createIndexes() {
    try {
        logger.info('🔧 Creating database indexes...');
        
        // Inventory collection indexes
        await db.collection('inventory').createIndex({ "type": 1 });
        await db.collection('inventory').createIndex({ "status": 1 });
        await db.collection('inventory').createIndex({ "category": 1 });
        await db.collection('inventory').createIndex({ "customer": 1 });
        await db.collection('inventory').createIndex({ "dueDate": 1 });
        await db.collection('inventory').createIndex({ "description": "text", "notes": "text" });
        
        // Customers collection indexes
        await db.collection('customers').createIndex({ "name": "text" });
        await db.collection('customers').createIndex({ "location": 1 });
        
        // Sales collection indexes
        await db.collection('sales').createIndex({ "saleDate": 1 });
        await db.collection('sales').createIndex({ "customer": 1 });
        await db.collection('sales').createIndex({ "type": 1 });
        
        // Gallery collection indexes
        await db.collection('gallery').createIndex({ "status": 1 });
        await db.collection('gallery').createIndex({ "title": "text", "description": "text" });
        
        // Ideas collection indexes
        await db.collection('ideas').createIndex({ "category": 1 });
        await db.collection('ideas').createIndex({ "status": 1 });
        await db.collection('ideas').createIndex({ "priority": 1 });
        await db.collection('ideas').createIndex({ "title": "text", "description": "text" });
        
        logger.info('✅ Database indexes created successfully');
    } catch (error) {
        logger.error('❌ Error creating database indexes:', { error: error.message, stack: error.stack });
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Add URL encoded support
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
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
            logger.error('Database not connected for inventory fetch');
            return res.status(500).json({ error: 'Database not connected' });
        }
        const inventory = await database.collection('inventory').find({}).toArray();
        logger.info('Inventory fetched successfully', { count: inventory.length });
        res.json(inventory);
    } catch (error) {
        logger.error('Error fetching inventory:', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        // Validate each item in the array
        if (req.body && Array.isArray(req.body)) {
            for (const item of req.body) {
                const { error } = inventoryItemSchema.validate(item);
                if (error) {
                    return res.status(400).json({ 
                        error: 'Validation failed', 
                        details: error.details.map(detail => detail.message) 
                    });
                }
            }
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
            logger.error('Database not connected for inventory update');
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { id } = req.params;
        const updateData = req.body;
        
        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
            logger.warn('Invalid ObjectId format for inventory update', { id });
            return res.status(400).json({ error: 'Invalid item ID format' });
        }
        
        // Validate update data
        const { error } = inventoryItemSchema.validate(updateData);
        if (error) {
            logger.warn('Invalid update data for inventory item', { id, errors: error.details });
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: error.details.map(detail => detail.message) 
            });
        }
        
        const result = await database.collection('inventory').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            logger.warn('Inventory item not found for update', { id });
            return res.status(404).json({ error: 'Item not found' });
        }
        
        logger.info('Inventory item updated successfully', { id, modifiedCount: result.modifiedCount });
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        logger.error('Error updating inventory item:', { 
            id: req.params.id, 
            error: error.message, 
            stack: error.stack 
        });
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
        
        // Validate each customer in the array
        if (req.body && Array.isArray(req.body)) {
            for (const customer of req.body) {
                const { error } = customerSchema.validate(customer);
                if (error) {
                    return res.status(400).json({ 
                        error: 'Validation failed', 
                        details: error.details.map(detail => detail.message) 
                    });
                }
            }
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
            logger.info('🚀 Embroidery Inventory Manager Server Running!', {
                port: PORT,
                localUrl: `http://localhost:${PORT}`,
                networkUrl: `http://${getLocalIP()}:${PORT}`
            });
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

// Global error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body
    });
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn('404 - Route not found', { url: req.url, method: req.method });
    res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel
module.exports = app;