import { IUser } from '../models/User';

// Extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser | { id: string };
  }
} 