import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';
import { findOrCreateGoogleUser } from '../services/oauthService';
import { Request } from 'express';

/**
 * Configure Passport with Google OAuth 2.0 strategy
 */
export const configurePassport = () => {
  // Configure Google strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientID,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackURL,
        passReqToCallback: true,
      },
      async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Find or create user based on the Google profile
          const user = await findOrCreateGoogleUser(profile, req);
          
          // Return the user to Passport
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await import('../models/User').then(module => module.User.findById(id));
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  
  return passport;
}; 