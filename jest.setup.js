const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Custom Jest setup that loads environment variables from .env.local or .env.test
 * for testing purposes
 */
module.exports = async () => {
  console.log('Loading environment variables for testing...');
  
  // Try to load .env.test first (if it exists)
  const testEnvPath = path.resolve(process.cwd(), '.env.test');
  if (fs.existsSync(testEnvPath)) {
    console.log('Loading .env.test');
    dotenv.config({ path: testEnvPath });
  }
  
  // Then try to load .env.local (with higher precedence)
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(localEnvPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: localEnvPath });
  }
  
  // If API key still not set, use a test value
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    console.log('Setting test GOOGLE_TRANSLATE_API_KEY');
    process.env.GOOGLE_TRANSLATE_API_KEY = 'test-api-key-for-jest';
  }

  // Set up mock server runtime config for Next.js
  process.env.NEXT_PUBLIC_RUNTIME_CONFIG = JSON.stringify({
    serverRuntimeConfig: {
      GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
    }
  });
};