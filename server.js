const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo').default;
const { MongoClient, ObjectId } = require('mongodb');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

// MongoDB connection
// SECURITY: Credentials must be in environment variables only
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'embroidery_inventory';
const TENANT_ID = process.env.TENANT_ID || 'embroidery';
const PARTNER_USERNAME = process.env.PARTNER_USERNAME || 'akeeler';
const MULTI_USER_ENABLED = TENANT_ID === 'knitting';
const IS_KNITTING_TENANT = MULTI_USER_ENABLED || DB_NAME === 'knitting_inventory';
let db;

const ALL_TABS = ['projects', 'inventory', 'customers', 'wip', 'completed', 'ideas', 'gallery', 'sales', 'reports', 'data'];

function getTenantConfig() {
    const enabledTabsRaw = process.env.ENABLED_TABS;
    const enabledTabs = enabledTabsRaw
        ? enabledTabsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : ALL_TABS;

    return {
        tenantId: TENANT_ID,
        appTitle: process.env.APP_TITLE || 'CyndyP StitchCraft Inventory Management',
        enabledTabs,
        defaultShopCustomer: process.env.DEFAULT_SHOP_CUSTOMER || '',
        hideTags: process.env.HIDE_TAGS === 'true' || IS_KNITTING_TENANT,
        multiUserEnabled: MULTI_USER_ENABLED,
        partnerUsername: PARTNER_USERNAME,
        knittingSiteUrl: process.env.KNITTING_SITE_URL || '',
        embroiderySiteUrl: process.env.EMBROIDERY_SITE_URL || 'https://embroidery-inventory-manager.vercel.app/'
    };
}

function isAdminCredential(username, password) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'Kobedavis#1';
    return username === adminUser && password === adminPass;
}

function isSessionAuthenticated(req) {
    return !!(req.session && req.session.authenticated === true);
}

function requireSessionAuth(req, res, next) {
    if (isSessionAuthenticated(req)) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required', message: 'You must be logged in to perform this action' });
}

function requireAdminSession(req, res, next) {
    if (!isSessionAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    if (req.session.username !== adminUser) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

async function findUserByUsername(username) {
    const database = await connectToDatabase();
    if (!database) return null;
    return database.collection('users').findOne({ username: username.toLowerCase() });
}

async function verifyUserPassword(username, password) {
    const user = await findUserByUsername(username);
    if (!user || !user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
}

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function sendLoginSuccess(req, res, payload) {
    saveSession(req)
        .then(() => res.json({ success: true, message: 'Login successful', ...payload }))
        .catch((err) => {
            console.error('Session save error:', err);
            res.status(500).json({ success: false, message: 'Login succeeded but session could not be saved' });
        });
}

if (!MONGODB_URI) {
    console.error('❌ CRITICAL: MONGODB_URI environment variable is not set!');
    console.error('Please set MONGODB_URI in your .env file or environment variables.');
    process.exit(1);
}

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
        if (IS_KNITTING_TENANT) {
            await initializeKnittingDefaults();
            return;
        }

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

async function initializeKnittingDefaults() {
    try {
        const config = getTenantConfig();
        const customersCount = await db.collection('customers').countDocuments();
        if (customersCount === 0 && config.defaultShopCustomer) {
            await db.collection('customers').insertOne({
                name: config.defaultShopCustomer,
                contact: '',
                location: '',
                dateAdded: new Date().toISOString(),
                status: 'active'
            });
            console.log(`👥 Knitting default shop customer: ${config.defaultShopCustomer}`);
        }
        console.log('🧶 Knitting tenant initialized (empty inventory, no sample seed data)');
    } catch (error) {
        console.error('Error initializing knitting defaults:', error);
    }
}

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Add URL encoded support

// Session middleware — MongoDB store so sessions survive Vercel serverless restarts
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'embroidery-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: IS_PRODUCTION,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

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

// Specific routes first (before general static)
app.use('/logos', express.static(path.join(__dirname, 'public', 'logos')));
// General static route last
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


// Health check endpoint
app.get('/health', async (req, res) => {
    const database = await connectToDatabase();
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: database ? 'Connected' : 'Disconnected'
    });
});


// Tenant configuration (public)
app.get('/api/config', (req, res) => {
    res.json(getTenantConfig());
});

// Authentication endpoints
app.get('/api/auth/status', (req, res) => {
    const config = getTenantConfig();
    res.json({
        authenticated: isSessionAuthenticated(req),
        username: req.session && req.session.username,
        authEnabled: true,
        isDbUser: !!(req.session && req.session.isDbUser),
        multiUserEnabled: config.multiUserEnabled,
        partnerUsername: config.partnerUsername
    });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        if (isAdminCredential(username, password)) {
            req.session.authenticated = true;
            req.session.username = username;
            req.session.isDbUser = false;
            return sendLoginSuccess(req, res, { username, isDbUser: false });
        }

        if (MULTI_USER_ENABLED) {
            const validUser = await verifyUserPassword(username, password);
            if (validUser) {
                req.session.authenticated = true;
                req.session.username = username.toLowerCase();
                req.session.isDbUser = true;
                return sendLoginSuccess(req, res, {
                    username: username.toLowerCase(),
                    isDbUser: true
                });
            }
        }

        res.status(401).json({ success: false, message: 'Invalid username or password' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.post('/api/change-password', requireSessionAuth, async (req, res) => {
    if (!req.session.isDbUser) {
        return res.status(403).json({
            success: false,
            message: 'Admin password is managed via server environment variables'
        });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'New password must be at least 4 characters' });
    }

    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }

        const user = await findUserByUsername(req.session.username);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const passwordHash = await hashPassword(newPassword);
        await database.collection('users').updateOne(
            { username: req.session.username },
            { $set: { passwordHash, updatedAt: new Date().toISOString() } }
        );

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

app.get('/api/users/status', async (req, res) => {
    const config = getTenantConfig();
    if (!config.multiUserEnabled) {
        return res.json({ multiUserEnabled: false, partnerExists: false });
    }

    try {
        const partner = await findUserByUsername(config.partnerUsername);
        res.json({
            multiUserEnabled: true,
            partnerUsername: config.partnerUsername,
            partnerExists: !!partner
        });
    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({ error: 'Failed to check user status' });
    }
});

app.post('/api/users/create', requireAdminSession, async (req, res) => {
    if (!MULTI_USER_ENABLED) {
        return res.status(404).json({ error: 'Multi-user is not enabled on this deployment' });
    }

    const { username, password } = req.body;
    const partnerName = (username || PARTNER_USERNAME).toLowerCase();
    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const existing = await findUserByUsername(partnerName);
        if (existing) {
            return res.status(409).json({ error: `User "${partnerName}" already exists` });
        }

        const passwordHash = await hashPassword(password);
        await database.collection('users').insertOne({
            username: partnerName,
            passwordHash,
            role: 'partner',
            createdAt: new Date().toISOString(),
            createdBy: req.session.username
        });

        res.json({ success: true, username: partnerName, message: 'Partner account created' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/users/setup-token', requireAdminSession, async (req, res) => {
    if (!MULTI_USER_ENABLED) {
        return res.status(404).json({ error: 'Multi-user is not enabled on this deployment' });
    }

    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const partnerName = PARTNER_USERNAME.toLowerCase();
        const existing = await findUserByUsername(partnerName);
        if (existing) {
            return res.status(409).json({ error: 'Partner account already exists' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await database.collection('users').insertOne({
            username: partnerName,
            passwordHash: null,
            setupToken: token,
            setupTokenExpires: expiresAt.toISOString(),
            role: 'partner',
            createdAt: new Date().toISOString(),
            createdBy: req.session.username
        });

        res.json({
            success: true,
            token,
            username: partnerName,
            expiresAt: expiresAt.toISOString(),
            setupPath: `/?setup=${token}`
        });
    } catch (error) {
        console.error('Setup token error:', error);
        res.status(500).json({ error: 'Failed to generate setup token' });
    }
});

app.post('/api/users/set-password', async (req, res) => {
    if (!MULTI_USER_ENABLED) {
        return res.status(404).json({ error: 'Multi-user is not enabled on this deployment' });
    }

    const { token, password } = req.body;
    if (!token || !password || password.length < 4) {
        return res.status(400).json({ error: 'Valid token and password (4+ chars) are required' });
    }

    try {
        const database = await connectToDatabase();
        if (!database) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const user = await database.collection('users').findOne({
            username: PARTNER_USERNAME.toLowerCase(),
            setupToken: token
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired setup link' });
        }
        if (user.setupTokenExpires && new Date(user.setupTokenExpires) < new Date()) {
            return res.status(400).json({ error: 'Setup link has expired. Ask admin for a new one.' });
        }
        if (user.passwordHash) {
            return res.status(409).json({ error: 'Account already set up. Use Change Password or login.' });
        }

        const passwordHash = await hashPassword(password);
        await database.collection('users').updateOne(
            { _id: user._id },
            {
                $set: { passwordHash, updatedAt: new Date().toISOString() },
                $unset: { setupToken: '', setupTokenExpires: '' }
            }
        );

        res.json({ success: true, message: 'Password set successfully. You can now log in.' });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({ error: 'Failed to set password' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        } else {
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        }
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

app.post('/api/inventory', requireSessionAuth, async (req, res) => {
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

app.post('/api/customers', requireSessionAuth, async (req, res) => {
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

app.post('/api/sales', requireSessionAuth, async (req, res) => {
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

app.post('/api/gallery', requireSessionAuth, async (req, res) => {
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
        if (!database) return res.status(500).json({ error: 'Database not connected' });
        const ideas = await database.collection('ideas').find({}).toArray();
        res.json(ideas);
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ error: 'Failed to fetch ideas data' });
    }
});

app.post('/api/ideas', requireSessionAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) return res.status(500).json({ error: 'Database not connected' });
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

app.get('/api/invoices', async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) return res.status(500).json({ error: 'Database not connected' });
        const invoices = await database.collection('invoices').find({}).toArray();
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

app.post('/api/invoices', requireSessionAuth, async (req, res) => {
    try {
        const database = await connectToDatabase();
        if (!database) return res.status(500).json({ error: 'Database not connected' });
        await database.collection('invoices').deleteMany({});
        if (req.body && req.body.length > 0) {
            await database.collection('invoices').insertMany(req.body);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving invoices:', error);
        res.status(500).json({ error: 'Failed to save invoices' });
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