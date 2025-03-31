import { User, IUser } from '../models/User';
import * as tokenService from './tokenService';
import { Request } from 'express';
import { splitDisplayName } from '../utils/nameUtils';

interface GoogleProfile {
  id: string;
  displayName: string;
  name: { familyName?: string; givenName?: string };
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
  
  // Handle name fields with proper fallbacks
  let firstName = profile.name?.givenName;
  let lastName = profile.name?.familyName;
  
  // If either name part is missing, try to split the displayName intelligently
  if (!firstName || !lastName) {
    // This utility splits displayName into firstName and lastName components
    // For example, "Su Khin Lin Khine" becomes firstName="Su", lastName="Khin Lin Khine"
    // This ensures we don't duplicate the full name in both fields
    const { firstName: parsedFirst, lastName: parsedLast } = splitDisplayName(profile.displayName);
    
    // Only use parsed values if the originals are missing
    firstName = firstName || parsedFirst;
    lastName = lastName || parsedLast;
  }
  
  // Create a new user with Google profile data
  const newUser = await User.create({
    email,
    firstName,
    lastName,
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