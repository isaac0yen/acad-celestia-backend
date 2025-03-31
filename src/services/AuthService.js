const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Wallet, VerificationCode } = require('../models');
const { generateVerificationCode } = require('../helpers/codeGenerator');
const { sendVerificationEmail } = require('../helpers/emailSender');
const { generateTokenId } = require('../helpers/tokenGenerator');
const { Op } = require('sequelize');

class AuthService {
  constructor() {
    this.baseUrl = process.env.NELF_API_BASE_URL;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
  }

  /**
   * Get list of Nigerian institutions
   * @returns {Promise<Array>} List of institutions
   */
  async getInstitutions() {
    try {
      const response = await axios.get(`${this.baseUrl}/services/institutions`);
      
      if (!response.data || !response.data.status) {
        throw new Error('Failed to fetch institutions');
      }
      
      return response.data.data;
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Verify institute details and obtain a verification token
   * @param {string} matricNumber - Student's matriculation number
   * @param {string} providerId - Institution's provider ID
   * @returns {Promise<string>} Verification token
   */
  async verifyInstituteDetails(matricNumber, providerId) {
    try {

      const existingUser = await User.findOne({ where: { matricNumber: `${matricNumber}` } });
      if (existingUser) {
        throw new Error('User already exists. Please login instead');
      }

      const response = await axios.post(
        `${this.baseUrl}/student/verify/institute-details`,
        {
          matric_number: matricNumber,
          provider_id: providerId
        }
      );

      if (response.status !== 200 || !response.data.status) {
        throw new Error(response.data.message || 'Institute verification failed');
      }

      return response.data.data.token;
    } catch (error) {
      if (error.response) {
        throw new Error(`Verification failed: ${error.response.data.message || 'Institute verification failed'}`);
      }
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Verify JAMB details using the token from institution verification
   * @param {string} dateOfBirth - Student's date of birth
   * @param {string} jambNumber - Student's JAMB registration number
   * @param {string} token - Verification token from institute verification
   * @returns {Promise<Object>} Student's verified JAMB details
   */
  async verifyJambDetails(dateOfBirth, jambNumber, token) {
    try {

      const existingUser = await User.findOne({ where: { regNumber: `${jambNumber}` } });
      if (existingUser) {
        throw new Error('User already exists. Please login instead');
      }

      const response = await axios.post(
        `${this.baseUrl}/student/register/jamb/verify`,
        {
          date_of_birth: dateOfBirth,
          jamb_number: jambNumber
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status !== 200 || !response.data.status) {
        throw new Error(response.data.message || 'JAMB verification failed');
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid verification token');
        } else if (error.response.status === 404) {
          throw new Error('JAMB record not found. Please check your JAMB number and date of birth');
        } else {
          throw new Error(`${error.response.data.message || 'JAMB verification failed'}`);
        }
      }
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Complete user verification and create account
   * @param {string} institutionId - Institution's provider ID
   * @param {string} matricNumber - Student's matriculation number
   * @param {string} jambNumber - Student's JAMB registration number
   * @param {string} dateOfBirth - Student's date of birth
   * @returns {Promise<Object>} Created user
   */
  async verifyUser(institutionId, matricNumber, jambNumber, dateOfBirth) {
    try {
      // Step 1: Verify institute details
      const token = await this.verifyInstituteDetails(matricNumber, institutionId);
      
      // Step 2: Verify JAMB details
      const userData = await this.verifyJambDetails(dateOfBirth, jambNumber, token);

      // Step 3: Check if user already exists
      const existingUser = await User.findOne({ where: { regNumber: `${userData.RegNumber}` } });
      if (existingUser) {
        throw new Error('User already exists. Please login instead');
      }

      // Step 4: Create user in database
      const user = await User.create({
        regNumber: userData.RegNumber,
        matricNumber: matricNumber,
        nin: userData.NIN,
        surname: userData.Surname,
        firstName: userData.FirstName,
        middleName: userData.Middlename || null,
        dateOfBirth: userData.DateofBirth,
        gender: userData.Gender,
        stateOfOrigin: userData.StateofOrigin,
        lgaOfOrigin: userData.LGAofOrigin,
        admissionYear: userData.AdmissionYear,
        institution: userData.Institution,
        institutionCode: userData.InstitutionCode,
        course: userData.Course,
        courseCode: userData.CourseCode,
        admissionType: userData.AdmissionType,
        profilePicture: userData.ProfilePicture || null,
        userType: 'student',
        status: 'PENDING'
      });

      // Step 5: Create wallet for the user
      await Wallet.create({
        userId: user.id,
        balance: 0.0,
        stakedBalance: 0.0
      });
      
      return { user };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send email verification code
   * @param {number} userId - User ID
   * @param {string} email - Email address to verify
   * @returns {Promise<void>}
   */
  async sendEmailVerification(userId, email) {
    try {
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user's email
      user.email = email;
      await user.save();
      
      // Generate verification code
      const code = generateVerificationCode();
      
      // Set expiration (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      // Delete any existing verification codes for this user
      await VerificationCode.destroy({
        where: {
          userId,
          type: 'EMAIL_VERIFICATION'
        }
      });
      
      // Create new verification code
      await VerificationCode.create({
        userId,
        code,
        type: 'EMAIL_VERIFICATION',
        expiresAt
      });
      
      // Send verification email
      await sendVerificationEmail(email, code);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email with verification code
   * @param {number} userId - User ID
   * @param {string} code - Verification code
   * @returns {Promise<Object>} Updated user
   */
  async verifyEmail(userId, code) {
    try {
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Find verification code
      const verificationCode = await VerificationCode.findOne({
        where: {
          userId,
          code,
          type: 'EMAIL_VERIFICATION',
          expiresAt: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!verificationCode) {
        throw new Error('Invalid or expired verification code');
      }
      
      // Update user
      user.emailVerified = true;
      user.status = 'ACTIVE';
      await user.save();
      
      // Delete verification code
      await verificationCode.destroy();
      
      return { user };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set or update user password
   * @param {number} userId - User ID
   * @param {string} password - New password
   * @returns {Promise<void>}
   */
  async setPassword(userId, password) {
    try {
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update user
      user.password = hashedPassword;
      await user.save();
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User
   */
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({
        where: { email }
      });
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check if user has a password set
      if (!user.password) {
        throw new Error('Password not set. Please set your password first.');
      }
      
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid email or password');
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Email not verified. Please verify your email first.');
      }
      
      // Check user status
      if (user.status === 'BANNED') {
        throw new Error('Your account has been banned. Please contact support.');
      }
      
      if (user.status === 'DELETED') {
        throw new Error('Your account has been deleted.');
      }
      
      return { user };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a JWT access token for user authentication
   * @param {number} userId - User ID to encode in the token
   * @param {string} firstName - User's first name
   * @param {string} surname - User's surname
   * @returns {string} JWT token
   */
  async createAccessToken(userId, firstName = '', surname = '') {
    try {
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate a new token ID
      const tokenId = generateTokenId(10);
      
      // Save token ID to user record
      user.tokenId = tokenId;
      await user.save();
      
      // Create JWT with token ID
      return jwt.sign(
        { 
          sub: userId,
          firstName,
          surname,
          tokenId
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify and decode a JWT token to authenticate a user
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} User object
   */
  async verifyToken(token) {
      try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const userId = decoded.sub;
      const tokenId = decoded.tokenId;
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify that the token ID matches the one stored in the database
      if (!tokenId || user.tokenId !== tokenId) {
        throw new Error('Invalid token. Please login again.');
      }
      
      return user;
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid authentication token');
      }
      throw error;
    }
  }
}

module.exports = new AuthService();
