import express from 'express';
import { 
  getCurrentUser, 
  updateUser, 
  deleteUser, 
  searchUsers,
  updateUserRole 
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/me', getCurrentUser);

// Update user profile
router.put('/me', updateUser);

// Delete user account
router.delete('/me', deleteUser);

// Admin routes (require admin role)
router.get('/search', authenticate, authorize('admin'), searchUsers);
router.put('/:userId/role', authenticate, authorize('admin'), updateUserRole);

export default router; 