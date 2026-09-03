import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: any; // We can type this to IUser if we want, but keeping it any for simplicity or basic properties
    }
  }
}
