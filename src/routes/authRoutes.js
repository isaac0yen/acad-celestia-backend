const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

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
router.get('/me', authenticate, AuthController.getCurrentUser);

module.exports = router;
