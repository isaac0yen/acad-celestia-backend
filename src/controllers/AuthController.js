const AuthService = require('../services/AuthService');
const { validationResult } = require('express-validator');

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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          errors: errors.array()
        });
      }

      const { institution_id, matric_number, jamb_number, date_of_birth } = req.body;
      
      const result = await AuthService.verifyUser(
        institution_id,
        matric_number,
        jamb_number,
        date_of_birth
      );
      
      const accessToken = await AuthService.createAccessToken(
        result.user.id, 
        result.user.firstName, 
        result.user.surname
      );
      
      res.status(200).json({
        access_token: accessToken,
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
   * Send email verification code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendEmailVerification(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          errors: errors.array()
        });
      }

      const { email } = req.body;
      const userId = req.user.id;
      
      await AuthService.sendEmailVerification(userId, email);
      
      res.status(200).json({
        status: true,
        message: 'Verification code sent successfully'
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Verify email with verification code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyEmail(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          errors: errors.array()
        });
      }

      const { code } = req.body;
      const userId = req.user.id;
      
      const result = await AuthService.verifyEmail(userId, code);
      
      const accessToken = await AuthService.createAccessToken(
        result.user.id, 
        result.user.firstName, 
        result.user.surname
      );
      
      res.status(200).json({
        status: true,
        message: 'Email verified successfully',
        access_token: accessToken,
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
   * Set or update user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setPassword(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          errors: errors.array()
        });
      }

      const { password } = req.body;
      const userId = req.user.id;
      
      await AuthService.setPassword(userId, password);
      
      res.status(200).json({
        status: true,
        message: 'Password set successfully'
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Login with email and password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      
      const result = await AuthService.login(email, password);
      
      const accessToken = await AuthService.createAccessToken(
        result.user.id, 
        result.user.firstName, 
        result.user.surname
      );
      
      res.status(200).json({
        status: true,
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          id: result.user.id,
          firstName: result.user.firstName,
          surname: result.user.surname,
          email: result.user.email,
          status: result.user.status
        }
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
