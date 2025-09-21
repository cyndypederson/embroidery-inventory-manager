# 🧵 CyndyP StitchCraft Inventory Management System

A comprehensive web-based inventory management system designed specifically for embroidery businesses. Track projects, manage inventory, handle customers, and generate reports all in one place.

## ✨ Features

### 📋 Project Management
- Track embroidery projects from start to finish
- Customer assignment and due date tracking
- Status management (Pending, In Progress, Completed, Sold)
- Pattern link integration with Google Drive
- Priority and tagging system

### 📦 Inventory Management
- Track supplies and materials
- Quantity monitoring with reorder points
- Location and supplier tracking
- Cost tracking and valuation
- Status indicators (Available, Low Stock, Out of Stock)

### 👥 Customer Management
- Customer database with contact information
- Order history and spending tracking
- Location-based organization
- Export and print capabilities

### 💰 Sales & Reporting
- Record sales with commission tracking
- Generate professional invoices
- Comprehensive financial reports
- Customer analytics and productivity metrics
- Export data in multiple formats

### 🖼️ Gallery & Ideas
- Photo gallery of completed work
- Inspiration and idea tracking
- Category-based organization
- Web link and source tracking

### 🔐 Security
- Admin authentication for sensitive features
- Secure MongoDB integration
- Environment-based configuration

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- Modern web browser

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd embroidery-inventory-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   NODE_ENV=development
   DB_NAME=embroidery_inventory
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser to `http://localhost:3000`

### 🗄️ Database Setup

The application automatically creates the necessary MongoDB collections and loads sample data on first run. No manual database setup required!

## 📱 Usage

### Adding Items
- **Projects**: Customer work with due dates and priorities
- **Inventory**: Supplies and materials with cost tracking
- Use the "Add New Item" button and select the appropriate type

### Managing Customers
- Add customers through the Customers tab
- Assign customers to projects
- Track customer history and spending

### Recording Sales
- Access the Sales tab (requires admin password)
- Record sales with commission tracking
- Generate professional invoices

### Reports & Analytics
- View comprehensive business metrics
- Generate financial, customer, and productivity reports
- Export data for external analysis

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `DB_NAME`: Database name (default: embroidery_inventory)
- `ADMIN_PASSWORD`: Password for Sales/Reports access

### Authentication
- Default admin password: `embroidery2024`
- Change password in Sales/Reports → Change Password
- Password is stored locally and encrypted

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production (PM2)
```bash
npm run pm2:start
```

### Vercel Deployment
The project includes Vercel configuration. Deploy with:
```bash
vercel --prod
```

## 📁 Project Structure

```
├── server.js              # Express server and API endpoints
├── script.js              # Frontend JavaScript functionality
├── styles.css             # Application styling
├── index.html             # Main application interface
├── data/                  # JSON data files (sample data)
├── fonts/                 # Custom fonts
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
└── vercel.json           # Vercel deployment configuration
```

## 🛠️ Development

### Available Scripts
- `npm start` - Start the application
- `npm run dev` - Start with nodemon (auto-restart)
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:stop` - Stop PM2 processes
- `npm run pm2:restart` - Restart PM2 processes

### API Endpoints
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Save inventory data
- `GET /api/customers` - Get customer list
- `POST /api/customers` - Save customer data
- `GET /api/sales` - Get sales data
- `POST /api/sales` - Save sales data
- `GET /health` - Health check endpoint

## 🔒 Security Notes

- Change default admin password before production use
- Use environment variables for sensitive configuration
- MongoDB connection string contains credentials - keep secure
- Regular backups recommended for production data

## 🤝 Support

For issues, questions, or feature requests, please contact the development team.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for embroidery businesses**
