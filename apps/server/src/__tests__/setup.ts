// Test setup file
import path from 'path';

import dotenv from 'dotenv';

// Load test environment variables (fallback to .env if .env.test missing)
const testEnvPath = path.resolve(__dirname, '../../.env.test');
const defaultEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: testEnvPath });
dotenv.config({ path: defaultEnvPath }); // .env.test takes precedence, .env fills gaps

// Ensure test environment
process.env.NODE_ENV = 'test';

// Set default test timeouts
jest.setTimeout(30000);
