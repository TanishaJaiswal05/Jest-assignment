import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import salonRoutes from './routes/salonRoutes';
import bookingRoutes from './routes/bookingRoutes';

// Load environment variables for local runs.
dotenv.config();

// Create a standalone Express app so tests can import it without starting MongoDB.
const app = express();

// Common middleware used by the API.
app.use(express.json());
app.use(cors());

// Health-check endpoint.
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Salon Backend is running!' });
});

// Mount the auth, salon, and booking routes.
app.use('/api', authRoutes);
app.use('/api', salonRoutes);
app.use('/api', bookingRoutes);

export default app;
