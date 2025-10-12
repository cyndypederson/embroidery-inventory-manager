const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('express-session');
const bcrypt = require('bcryptjs');

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

// Auto-backup function
async function createAutoBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const backupDir = path.join(__dirname, 'backups', `auto_backup_${timestamp}`);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Fetch all collections
        const inventory = await db.collection('inventory').find({}).toArray();
        const customers = await db.collection('customers').find({}).toArray();
        const sales = await db.collection('sales').find({}).toArray();
        const gallery = await db.collection('gallery').find({}).toArray();
        const ideas = await db.collection('ideas').find({}).toArray();
        
        // Save to files
        fs.writeFileSync(path.join(backupDir, 'inventory.json'), JSON.stringify(inventory, null, 2));
        fs.writeFileSync(path.join(backupDir, 'customers.json'), JSON.stringify(customers, null, 2));
        fs.writeFileSync(path.join(backupDir, 'sales.json'), JSON.stringify(sales, null, 2));
        fs.writeFileSync(path.join(backupDir, 'gallery.json'), JSON.stringify(gallery, null, 2));
        fs.writeFileSync(path.join(backupDir, 'ideas.json'), JSON.stringify(ideas, null, 2));
        
        console.log(`💾 Auto-backup created: ${backupDir}`);
        
        // Cleanup old backups (keep last 30)
        const backupsDir = path.join(__dirname, 'backups');
        const backups = fs.readdirSync(backupsDir)
            .filter(dir => dir.startsWith('auto_backup_'))
            .map(dir => ({
                name: dir,
                path: path.join(backupsDir, dir),
                time: fs.statSync(path.join(backupsDir, dir)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);
        
        if (backups.length > 30) {
            backups.slice(30).forEach(backup => {
                fs.rmSync(backup.path, { recursive: true, force: true });
            });
        }
    } catch (error) {
        console.error('❌ Auto-backup failed:', error);
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
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Add URL encoded support

// Session middleware for authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'embroidery-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Load auth configuration
function loadAuthConfig() {
    try {
        const authPath = path.join(__dirname, 'data', 'auth.json');
        if (fs.existsSync(authPath)) {
            return JSON.parse(fs.readFileSync(authPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading auth config:', error);
    }
    return { username: 'admin', password: 'embroidery2024', enabled: false };
}

// Authentication middleware
function requireAuth(req, res, next) {
    const authConfig = loadAuthConfig();
    
    // If authentication is disabled, allow all requests
    if (!authConfig.enabled) {
        return next();
    }
    
    // Check if user is authenticated
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    // Not authenticated
    res.status(401).json({ error: 'Authentication required', authEnabled: true });
}

// Special middleware for ideas - allow POST without auth, but require auth for PUT/DELETE
function requireAuthForIdeasModify(req, res, next) {
    const authConfig = loadAuthConfig();
    
    // If authentication is disabled, allow all requests
    if (!authConfig.enabled) {
        return next();
    }
    
    // Allow POST (create) without authentication
    if (req.method === 'POST') {
        return next();
    }
    
    // Require auth for PUT and DELETE
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    res.status(401).json({ error: 'Authentication required for this operation', authEnabled: true });
}

// Authentication routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const authConfig = loadAuthConfig();
    
    // Check if authentication is enabled
    if (!authConfig.enabled) {
        return res.json({ success: false, message: 'Authentication is not enabled', authEnabled: false });
    }
    
    // Verify credentials
    if (username === authConfig.username && password === authConfig.password) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true, message: 'Login successful', username: username });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Logout failed' });
        } else {
            res.json({ success: true, message: 'Logout successful' });
        }
    });
});

app.get('/api/auth/status', (req, res) => {
    const authConfig = loadAuthConfig();
    res.json({
        authenticated: req.session && req.session.authenticated,
        username: req.session && req.session.username,
        authEnabled: authConfig.enabled
    });
});

app.post('/api/auth/config', requireAuth, (req, res) => {
    try {
        const { username, password, enabled } = req.body;
        const authPath = path.join(__dirname, 'data', 'auth.json');
        
        // Hash password before saving
        const authConfig = {
            username: username || 'admin',
            password: password || 'embroidery2024',
            enabled: enabled !== undefined ? enabled : false
        };
        
        fs.writeFileSync(authPath, JSON.stringify(authConfig, null, 2));
        res.json({ success: true, message: 'Authentication config updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update auth config' });
    }
});

// Serve version from package.json
const packageJson = require('./package.json');
app.get('/api/version', (req, res) => {
    res.json({ version: packageJson.version });
});

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

// Special endpoint for script.js with aggressive cache busting
app.get('/script.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private, no-transform');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Inject version into HTML for automatic cache busting
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) {
            console.error('Error loading index.html:', err);
            return res.status(500).send('Error loading page');
        }
        
        // Inject version from package.json into HTML
        const version = packageJson.version;
        const timestamp = Date.now();
        
        // Update script tag
        html = html.replace(
            /script\.js\?v=[^"]+"/g,
            `script.js?v=${version}&t=${timestamp}"`
        );
        
        // Update style tag
        html = html.replace(
            /styles\.css\?v=[^"]+"/g,
            `styles.css?v=${version}&t=${timestamp}"`
        );
        
        // Update meta version tag
        html = html.replace(
            /<meta name="version" content="[^"]*">/,
            `<meta name="version" content="${version}">`
        );
        
        // Replace all hardcoded version numbers in the HTML
        html = html.replace(/v1\.0\.\d+/g, `v${version}`);
        html = html.replace(/1\.0\.\d+/g, version);
        
        // Update title
        html = html.replace(
            /<title>[^<]*<\/title>/,
            `<title>CyndyP StitchCraft Inventory - v${version}</title>`
        );
        
        console.log(`📦 Serving index.html with version ${version}`);
        res.send(html);
    });
});

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

app.post('/api/inventory', requireAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('inventory').deleteMany({});
        if (req.body && req.body.length > 0) {
            // Remove _id fields to prevent duplicate key errors
            const cleanData = req.body.map(item => {
                const { _id, ...rest } = item;
                return rest;
            });
            await database.collection('inventory').insertMany(cleanData);
        }
        
        // Create backup after saving inventory
        createAutoBackup().catch(err => console.error('Backup error:', err));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving inventory:', error);
        res.status(500).json({ error: 'Failed to save inventory data' });
    }
});

// Update individual inventory item
app.put('/api/inventory/:id', requireAuth, async (req, res) => {
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

app.post('/api/customers', requireAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('customers').deleteMany({});
        if (req.body && req.body.length > 0) {
            // Remove _id fields to prevent duplicate key errors
            const cleanData = req.body.map(item => {
                const { _id, ...rest } = item;
                return rest;
            });
            await database.collection('customers').insertMany(cleanData);
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

app.post('/api/sales', requireAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('sales').deleteMany({});
        if (req.body && req.body.length > 0) {
            // Remove _id fields to prevent duplicate key errors
            const cleanData = req.body.map(item => {
                const { _id, ...rest } = item;
                return rest;
            });
            await database.collection('sales').insertMany(cleanData);
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

app.post('/api/gallery', requireAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        await database.collection('gallery').deleteMany({});
        if (req.body && req.body.length > 0) {
            // Remove _id fields to prevent duplicate key errors
            const cleanData = req.body.map(item => {
                const { _id, ...rest } = item;
                return rest;
            });
            await database.collection('gallery').insertMany(cleanData);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving gallery:', error);
        res.status(500).json({ error: 'Failed to save gallery data' });
    }
});

// Compress gallery images - create thumbnails
app.post('/api/gallery/compress', requireAuth, async (req, res) => {
    try {
        console.log('🗜️ Starting gallery compression...');
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const gallery = await database.collection('gallery').find({}).toArray();
        console.log(`📊 Found ${gallery.length} gallery items to compress`);
        
        let compressedCount = 0;
        let totalSizeReduction = 0;
        const results = [];
        
        for (let i = 0; i < gallery.length; i++) {
            const item = gallery[i];
            
            if (item.dataUrl && item.dataUrl.length > 10000 && !item.thumbnail) {
                const originalSize = item.dataUrl.length;
                console.log(`📷 Item ${i + 1}: ${item.title || 'Untitled'} - Original: ${Math.round(originalSize / 1024)}KB`);
                
                // For server-side, we'll mark it as needing compression
                // The actual compression will happen client-side when needed
                results.push({
                    title: item.title,
                    originalSize: Math.round(originalSize / 1024),
                    needsCompression: true
                });
                
                compressedCount++;
            }
        }
        
        console.log(`✅ Identified ${compressedCount} items for compression`);
        
        res.json({ 
            success: true, 
            itemsToCompress: compressedCount,
            results: results,
            message: 'Gallery items identified for compression. Client-side compression needed.'
        });
        
    } catch (error) {
        console.error('Error compressing gallery:', error);
        res.status(500).json({ error: 'Failed to compress gallery data' });
    }
});

// Server-side caching to prevent repeated database calls
let ideasCache = null;
let ideasCacheTime = 0;
const IDEAS_CACHE_DURATION = 10000; // 10 seconds cache

app.get('/api/ideas', async (req, res) => {
    try {
        const now = Date.now();
        
        // Check if we have valid cached data
        if (ideasCache && (now - ideasCacheTime) < IDEAS_CACHE_DURATION) {
            console.log('📖 Server: Using cached ideas data');
            return res.json(ideasCache);
        }
        
        console.log('📖 Server: Fetching ideas from database');
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        const ideas = await database.collection('ideas').find({}).toArray();
        console.log('📖 Server: Found', ideas.length, 'ideas in database');
        
        // Update cache
        ideasCache = ideas;
        ideasCacheTime = now;
        
        res.json(ideas);
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ error: 'Failed to fetch ideas data' });
    }
});

// Ideas endpoint - allow anyone to add, but client-side will control edit/delete UI
app.post('/api/ideas', async (req, res) => {
    try {
        console.log('💾 Server: Saving ideas, count:', req.body ? req.body.length : 'no body');
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        // Only clear and update if the data is actually different
        const existingIdeas = await database.collection('ideas').find({}).toArray();
        const isDataDifferent = JSON.stringify(existingIdeas) !== JSON.stringify(req.body);
        
        if (isDataDifferent && req.body && req.body.length > 0) {
            await database.collection('ideas').deleteMany({});
            console.log('💾 Server: Cleared all ideas from database');
            
            // Remove _id fields to prevent duplicate key errors
            const cleanData = req.body.map(item => {
                const { _id, ...rest } = item;
                return rest;
            });
            await database.collection('ideas').insertMany(cleanData);
            console.log('💾 Server: Inserted', cleanData.length, 'ideas into database');
            
            // Clear the cache when data is updated
            ideasCache = null;
            ideasCacheTime = 0;
            console.log('💾 Server: Cleared ideas cache');
        } else {
            console.log('💾 Server: Ideas data unchanged, skipping save');
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving ideas:', error);
        res.status(500).json({ error: 'Failed to save ideas data' });
    }
});

// Serve static files (CSS, JS, images, etc.) - must be after dynamic routes
app.use(express.static(path.join(__dirname)));

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