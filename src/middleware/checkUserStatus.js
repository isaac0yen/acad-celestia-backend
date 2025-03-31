/**
 * Middleware to check if user status is ACTIVE
 * Blocks access for users with PENDING, BANNED, or DELETED status
 */
const checkUserStatus = (req, res, next) => {
  try {
    // User is attached to req by the auth middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    if (user.status !== 'ACTIVE') {
      let message = 'Access denied';
      
      switch (user.status) {
        case 'PENDING':
          message = 'Email verification required. Please verify your email to continue.';
          break;
        case 'BANNED':
          message = 'Your account has been banned. Please contact support for assistance.';
          break;
        case 'DELETED':
          message = 'Your account has been deleted.';
          break;
      }
      
      return res.status(403).json({
        status: false,
        message
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  checkUserStatus
};
