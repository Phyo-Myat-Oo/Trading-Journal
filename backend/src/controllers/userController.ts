import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { z } from 'zod';
import { logAdminActivity } from './adminController';
import { AdminActionType } from '../models/AdminActivityLog';
import mongoose from 'mongoose';

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .optional(),
});

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

// Update user profile
export const updateUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const validatedData = updateUserSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password if trying to update password
    if (validatedData.newPassword) {
      const isPasswordValid = await user.comparePassword(validatedData.currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    // Update fields if provided
    if (validatedData.firstName) user.firstName = validatedData.firstName;
    if (validatedData.lastName) user.lastName = validatedData.lastName;
    if (validatedData.email) user.email = validatedData.email;
    if (validatedData.newPassword) user.password = validatedData.newPassword;

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
};

// Delete user account
export const deleteUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password before deletion
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    await user.deleteOne();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user account' });
  }
};

// Search users (admin-only endpoint)
export const searchUsers = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has admin role
    const user = req.user as IUser;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    const { query, page = 1, limit = 10 } = req.query;
    const searchQuery = query
      ? {
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
};

// Update user role (admin-only endpoint)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has admin role
    const user = req.user as IUser & { _id: mongoose.Types.ObjectId };
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    // Find user and get current role before update
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = targetUser.role;
    
    // Only update if role is changing
    if (oldRole !== role) {
      // Update the role
      targetUser.role = role;
      await targetUser.save();
      
      // Log the role change activity
      await logAdminActivity(
        user._id,
        AdminActionType.ROLE_UPDATE,
        `Changed user ${targetUser.email} (${targetUser._id}) role from ${oldRole} to ${role}`,
        req.ip || '127.0.0.1'
      );
    }

    // Return updated user without password
    const updatedUser = await User.findById(userId).select('-password');

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
}; 