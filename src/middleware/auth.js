const AuthService = require('../services/AuthService');

/**
 * Authentication middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const user = await AuthService.verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        status: false,
        message: error.message,
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      status: false,
      message: 'Authentication error'
    });
  }
};

module.exports = {
  authenticate
};
