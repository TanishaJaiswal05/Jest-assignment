import mongoose from 'mongoose';
import dotenv from 'dotenv';

import app from './app';

// Load environment variables from the .env file.
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/salon-db';

// Connect to MongoDB before starting the API server.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
