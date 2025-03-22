#!/usr/bin/env node

/**
 * This script runs Jest tests with the new type-safe mocking approach
 * It setups proper module aliases and ensures the TypeScript configuration is correct
 * 
 * Usage: node scripts/run-typed-tests.js [additional Jest arguments]
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// Get additional arguments to pass to Jest
const additionalArgs = process.argv.slice(2).join(' ');

// Define paths
const ROOT_DIR = path.resolve(__dirname, '..');
const MOCKS_DIR = path.join(ROOT_DIR, 'src/__tests__/mocks');

// Check if our type-safe mocking files exist
const requiredFiles = [
  path.join(MOCKS_DIR, 'mongoose-models.ts'),
  path.join(MOCKS_DIR, 'repository-mocks.ts'),
  path.join(MOCKS_DIR, 'test-setup.ts')
];

// Verify all required files exist
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('Error: The following required files are missing:');
  missingFiles.forEach(file => console.error(`- ${path.relative(ROOT_DIR, file)}`));
  process.exit(1);
}

console.log('Running tests with type-safe mocking approach...\n');

try {
  // Run the tests with proper TypeScript configuration
  const command = `npx jest --config=jest.config.js ${additionalArgs}`;
  console.log(`Executing: ${command}\n`);
  
  execSync(command, { 
    stdio: 'inherit',
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      TS_NODE_PROJECT: path.join(ROOT_DIR, 'tsconfig.json'),
      USE_TYPE_SAFE_MOCKS: 'true' // Environment flag to indicate using type-safe mocks
    }
  });
  
  console.log('\nTests completed successfully with type-safe mocking approach.\n');
} catch (error) {
  console.error('\nTests failed with exit code', error.status);
  process.exit(error.status);
} 