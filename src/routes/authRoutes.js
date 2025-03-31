const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { checkUserStatus } = require('../middleware/checkUserStatus');

const router = express.Router();

/**
 * @swagger
 * /api/institutions:
 *   get:
 *     summary: Get list of Nigerian institutions
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: List of institutions
 */
router.get('/institutions', AuthController.getInstitutions);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify user using JAMB details and create account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - institution_id
 *               - matric_number
 *               - jamb_number
 *               - date_of_birth
 *             properties:
 *               institution_id:
 *                 type: string
 *               matric_number:
 *                 type: string
 *               jamb_number:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: MM/DD/YYYY
 *     responses:
 *       200:
 *         description: JWT token on successful verification
 */
router.post('/auth/verify', [
  body('institution_id').notEmpty().withMessage('Institution ID is required'),
  body('matric_number').notEmpty().withMessage('Matriculation number is required'),
  body('jamb_number').notEmpty().withMessage('JAMB number is required'),
  body('date_of_birth').notEmpty().withMessage('Date of birth is required')
], AuthController.verifyUser);

/**
 * @swagger
 * /api/auth/send-email-verification:
 *   post:
 *     summary: Send email verification code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/auth/send-email-verification', [
  authenticate,
  body('email').isEmail().withMessage('Valid email is required')
], AuthController.sendEmailVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with verification code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification code
 *       401:
 *         description: Unauthorized
 */
router.post('/auth/verify-email', [
  authenticate,
  body('code').notEmpty().withMessage('Verification code is required')
], AuthController.verifyEmail);

/**
 * @swagger
 * /api/auth/set-password:
 *   post:
 *     summary: Set or update user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/auth/set-password', [
  authenticate,
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
], AuthController.setPassword);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post('/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], AuthController.login);

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Get current user details
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/me', authenticate, checkUserStatus, AuthController.getCurrentUser);

module.exports = router;
