import { User, IUser } from '../models/User';
import * as tokenService from './tokenService';
import { Request } from 'express';

interface GoogleProfile {
  id: string;
  displayName: string;
  name: { familyName: string; givenName: string };
  emails: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

/**
 * Find or create a user based on Google profile
 * @param profile Google OAuth profile
 * @param req Express request object
 */
export const findOrCreateGoogleUser = async (profile: GoogleProfile, _req: Request): Promise<IUser> => {
  // First check if user already exists with this Google ID
  let user = await User.findOne({ googleId: profile.id });
  
  // If user exists, return it
  if (user) {
    return user;
  }
  
  // Check if user with same email exists
  const email = profile.emails[0].value;
  user = await User.findOne({ email });
  
  if (user) {
    // Link Google ID to existing account
    user.googleId = profile.id;
    user.provider = 'google';
    user.isVerified = true; // Google accounts are automatically verified
    
    // If user doesn't have a profile picture but Google provides one
    if (!user.profilePicture && profile.photos && profile.photos.length > 0) {
      user.profilePicture = profile.photos[0].value;
    }
    
    await user.save();
    return user;
  }
  
  // Create a new user with Google profile data
  const newUser = await User.create({
    email,
    firstName: profile.name.givenName,
    lastName: profile.name.familyName,
    googleId: profile.id,
    profilePicture: profile.photos?.[0]?.value,
    provider: 'google',
    isVerified: true, // Google accounts are automatically verified
  });
  
  return newUser;
};

/**
 * Generate tokens for a Google-authenticated user
 * @param user User document
 * @param req Express request object
 */
export const generateTokensForGoogleUser = async (user: IUser, req: Request) => {
  // Generate access token
  const accessToken = tokenService.generateAccessToken(user);
  
  // Generate refresh token with context information
  const { token: refreshToken, expiresAt } = await tokenService.generateRefreshToken(user, req, {
    extendedExpiration: true // Default to extended expiration for social logins
  });
  
  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
      twoFactorEnabled: user.twoFactorEnabled
    }
  };
}; 