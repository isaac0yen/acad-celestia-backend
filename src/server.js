const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { sequelize, testConnection } = require('./config/database');
const { initCronJobs } = require('./cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const tokenMarketRoutes = require('./routes/tokenMarketRoutes');
const gameRoutes = require('./routes/gameRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import middleware
const { authenticate } = require('./middleware/auth');
const { checkUserStatus } = require('./middleware/checkUserStatus');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Acad Celestia API',
      version: '1.0.0',
      description: 'Acad Celestia Backend API - University Token Management System',
      contact: {
        name: 'Acad Celestia Team',
        url: 'https://acadcelestia.com',
        email: 'support@acadcelestia.com'
      },
      license: {
        name: 'Private'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
      {
        url: `https://acad-celestia-backend.mygenius.ng`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api', authRoutes);

// Apply checkUserStatus middleware to all protected routes except for auth routes
// This ensures that only ACTIVE users can access these endpoints
app.use('/api', authenticate, checkUserStatus, walletRoutes);
app.use('/api', authenticate, checkUserStatus, tokenMarketRoutes);
app.use('/api', authenticate, checkUserStatus, gameRoutes);
app.use('/api/dashboard', authenticate, checkUserStatus, dashboardRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Acad Celestia API',
    docs_url: '/api-docs',
  });
});

// Sync database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync models with database - disable alter mode to prevent "Too many keys" error
    //await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized');
    
    // Initialize cron jobs
    initCronJobs();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
