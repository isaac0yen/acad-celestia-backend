const axios = require('axios');
const jwt = require('jsonwebtoken');
const { User, Wallet } = require('../models');

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
      throw new Error(`Failed to connect to NELF API: ${error.message}`);
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
      throw new Error(`Failed to connect to NELF API: ${error.message}`);
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
          throw new Error(`NELF API error: ${error.response.data.message || 'JAMB verification failed'}`);
        }
      }
      throw new Error(`Failed to connect to NELF API: ${error.message}`);
    }
  }

  /**
   * Complete user verification and create account
   * @param {string} institutionId - Institution's provider ID
   * @param {string} matricNumber - Student's matriculation number
   * @param {string} jambNumber - Student's JAMB registration number
   * @param {string} dateOfBirth - Student's date of birth
   * @returns {Promise<Object>} Created user and access token
   */
  async verifyUser(institutionId, matricNumber, jambNumber, dateOfBirth) {
    try {
      // Step 1: Verify institute details
      const token = await this.verifyInstituteDetails(matricNumber, institutionId);
      
      // Step 2: Verify JAMB details
      const userData = await this.verifyJambDetails(dateOfBirth, jambNumber, token);
      
      // Step 3: Create user in database
      const user = await User.create({
        regNumber: `${userData.RegNumber} ${matricNumber}`,
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
        requestId: userData.RequestID,
        userType: 'student'
      });

      // Step 4: Create wallet for the user
      await Wallet.create({
        userId: user.id,
        balance: 0.0,
        stakedBalance: 0.0
      });

      // Step 5: Generate JWT token
      const accessToken = this.createAccessToken(user.id);
      
      return {
        user,
        accessToken
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a JWT access token for user authentication
   * @param {number} userId - User ID to encode in the token
   * @returns {string} JWT token
   */
  createAccessToken(userId) {
    return jwt.sign(
      { sub: userId },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
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
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
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
