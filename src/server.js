const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { sequelize, testConnection } = require('./config/database');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const tokenMarketRoutes = require('./routes/tokenMarketRoutes');
const gameRoutes = require('./routes/gameRoutes');

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
        url: `http://acad-celestia-backend.mygenius.ng`,
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
app.use('/api', walletRoutes);
app.use('/api', tokenMarketRoutes);
app.use('/api', gameRoutes);

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
    
    // Sync models with database
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized');
    
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
