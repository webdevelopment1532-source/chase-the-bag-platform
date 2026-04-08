// @ts-nocheck
// 
// Global mock DB setup for Jest
// This file is loaded automatically before tests if specified in jest.config.js
// Add any global mocks, test DB setup, or teardown logic here.

// Example: (uncomment and adapt as needed)
// import { setupTestDB } from '../src/backend/db';
// beforeAll(async () => {
//   await setupTestDB();
// });

// afterAll(async () => {
//   // Clean up test DB
// });

jest.mock('mysql2');
jest.mock('mysql2/promise');

// Mock mysql2/promise for all tests to prevent sandbox errors
jest.mock('mysql2/promise', () => {
  return {
    createPool: jest.fn(() => ({
      query: jest.fn(),
      end: jest.fn(),
    })),
    createConnection: jest.fn(() => ({
      query: jest.fn(),
      end: jest.fn(),
    })),
  };
});
