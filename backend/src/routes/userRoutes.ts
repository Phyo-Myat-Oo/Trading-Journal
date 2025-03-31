import express from 'express';
import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfMiddleware';
import multer from 'multer';

const router = express.Router();

// Configure multer for profile picture uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  }
});

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes that don't require CSRF protection
// These routes should be authenticated but bypass CSRF
router.use(authenticate);

/**
 * @route POST /api/users/2fa/verify
 * @desc Verify and enable two-factor authentication
 * @access Private
 * @note CSRF protection intentionally disabled for this route to fix CORS issues
 */
router.post('/2fa/verify', userController.verifyAndEnableTwoFactor);

// Profile picture upload route - bypass CSRF for file upload
router.post('/profile/picture', upload.single('avatar'), userController.updateProfilePicture);

// Add CSRF protection for all other protected routes
router.use(csrfProtection);

// All routes below require both authentication and CSRF protection
router.get('/me', userController.getProfile);

// Update user profile
router.put('/me', userController.updateProfile);

// Delete user account
router.delete('/me', userController.deleteAccount);

// Security routes
router.get('/security-status', userController.getSecurityStatus);
router.get('/activity-log', userController.getUserActivityLog);

// Admin routes (require admin role)
router.get('/search', authorize('admin'), userController.searchUsers);
router.put('/:userId/role', authorize('admin'), userController.updateUserRole);

// Two-factor authentication routes (with CSRF protection)
/**
 * @route GET /api/users/2fa/setup
 * @desc Setup two-factor authentication
 * @access Private
 */
router.get('/2fa/setup', userController.setupTwoFactor);

/**
 * @route POST /api/users/2fa/disable
 * @desc Disable two-factor authentication
 * @access Private
 */
router.post('/2fa/disable', userController.disableTwoFactor);

// Profile management
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/password', userController.changePassword);

// Account management
router.post('/delete-account', userController.deleteAccount);

export default router; 