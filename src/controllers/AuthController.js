const AuthService = require('../services/AuthService');

class AuthController {
  /**
   * Get list of Nigerian institutions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getInstitutions(req, res) {
    try {
      const institutions = await AuthService.getInstitutions();
      res.status(200).json({
        status: true,
        data: institutions
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Verify user using JAMB details and create account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyUser(req, res) {
    try {
      const { institution_id, matric_number, jamb_number, date_of_birth } = req.body;
      
      const result = await AuthService.verifyUser(
        institution_id,
        matric_number,
        jamb_number,
        date_of_birth
      );
      
      res.status(200).json({
        access_token: result.accessToken,
        token_type: 'bearer'
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Get current user details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      // User is already attached to req by the auth middleware
      res.status(200).json(req.user);
    } catch (error) {
      res.status(401).json({
        status: false,
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();
