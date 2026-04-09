// Test setup file
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Set default test timeouts
jest.setTimeout(30000);
