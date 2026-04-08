import express from 'express';
import dotenv from 'dotenv';
import { testConnection } from './models/db';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// TODO: Import and use production routes here
// import offerRoutes from './routes/offer';
// app.use('/api/offer', offerRoutes);

const PORT = process.env.PORT || 4000;

// Test DB connection before starting server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Chase the Bag Coin Exchange running on port ${PORT}`);
  });
});
