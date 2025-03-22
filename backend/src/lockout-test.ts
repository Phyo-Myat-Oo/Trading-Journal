import axios from 'axios';
import dotenv from 'dotenv';
import { User } from './models/User';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const EMAIL = 'lockout-test@example.com';
const CORRECT_PASSWORD = 'Correct-Password-123!';
const WRONG_PASSWORD = 'Wrong-Password-456!';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-journal';

// Helper function to make a pause
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Connect to the database
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Close the database connection
async function closeDatabaseConnection() {
  await mongoose.connection.close();
  console.log('Closed MongoDB connection');
}

// Function to create a test user and force verification
async function createAndVerifyTestUser(lockoutCount = 0) {
  try {
    console.log('Creating or updating test user...');
    
    // Check if user exists in database
    await connectToDatabase();
    let user = await User.findOne({ email: EMAIL });
    
    if (user) {
      console.log('User already exists, updating verification status...');
      // Ensure the user is verified
      user.isVerified = true;
      // Reset lockout status to start fresh
      user.failedLoginAttempts = 0;
      user.accountLocked = false;
      user.accountLockedUntil = undefined;
      // Set the previous lockouts count
      user.previousLockouts = lockoutCount;
      await user.save();
    } else {
      console.log('Creating new test user...');
      
      // Create user via API
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: EMAIL,
          password: CORRECT_PASSWORD,
          firstName: 'Lockout',
          lastName: 'Test'
        });
      } catch (error) {
        console.log('API user creation failed, creating directly in database...');
        // If API fails, create directly in database
      }
      
      // Find the user and verify it
      user = await User.findOne({ email: EMAIL });
      if (user) {
        user.isVerified = true;
        user.previousLockouts = lockoutCount;
        await user.save();
      } else {
        // If still doesn't exist, create it directly
        user = new User({
          email: EMAIL,
          password: CORRECT_PASSWORD, // This will be hashed by the model
          firstName: 'Lockout',
          lastName: 'Test',
          isVerified: true,
          previousLockouts: lockoutCount
        });
        await user.save();
      }
    }
    
    console.log(`Test user verified successfully with ${lockoutCount} previous lockouts`);
    return user;
  } catch (error) {
    console.error('Error creating/verifying test user:', error);
    throw error;
  } finally {
    await closeDatabaseConnection();
  }
}

// Function to attempt login
async function attemptLogin(password: string, attempt: number) {
  try {
    console.log(`Attempt ${attempt}: Logging in with ${password === CORRECT_PASSWORD ? 'correct' : 'wrong'} password...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password
    });
    
    console.log('Login successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(`Login failed (${error.response?.status}):`, error.response?.data);
      return { 
        success: false, 
        status: error.response?.status, 
        data: error.response?.data,
        isLocked: error.response?.data?.isLocked,
        requiresAdminUnlock: error.response?.data?.requiresAdminUnlock,
        message: error.response?.data?.message
      };
    }
    
    console.error('Error during login attempt:', error);
    throw error;
  }
}

// Main test function for progressive lockouts
async function testProgressiveLockouts() {
  try {
    console.log("\n==== Testing Progressive Lockout Durations ====\n");
    
    // Test first lockout (15 minutes)
    console.log("\n--- Testing First Lockout (15 minutes) ---");
    await createAndVerifyTestUser(0); // 0 previous lockouts
    await testLockout(15); // Expected 15 minutes lockout
    
    // Test second lockout (30 minutes)
    console.log("\n--- Testing Second Lockout (30 minutes) ---");
    await createAndVerifyTestUser(1); // 1 previous lockout
    await testLockout(30); // Expected 30 minutes lockout
    
    // Test third lockout (60 minutes)
    console.log("\n--- Testing Third Lockout (60 minutes) ---");
    await createAndVerifyTestUser(2); // 2 previous lockouts
    await testLockout(60); // Expected 60 minutes lockout
    
    // Test admin intervention requirement for 4+ lockouts
    console.log("\n--- Testing Admin Intervention Required (4+ lockouts) ---");
    await createAndVerifyTestUser(3); // 3 previous lockouts
    await testLockout(60, true); // Expected 60 minutes and admin intervention
    
    console.log("\n==== Progressive Lockout Test Completed ====");
  } catch (error) {
    console.error('Error testing progressive lockouts:', error);
  }
}

// Helper function to test a specific lockout duration
async function testLockout(expectedMinutes: number, expectAdminIntervention = false) {
  // Get max login attempts from environment or default to 5
  const MAX_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  console.log(`Account should lock after ${MAX_ATTEMPTS} failed attempts`);
  
  // Attempt several wrong password logins
  let accountLocked = false;
  let message = '';
  let requiresAdminUnlock = false;
  
  for (let i = 1; i <= MAX_ATTEMPTS + 2; i++) {
    const result = await attemptLogin(WRONG_PASSWORD, i);
    
    // If the account is locked, save details and break
    if (result.isLocked) {
      accountLocked = true;
      message = result.message || '';
      requiresAdminUnlock = !!result.requiresAdminUnlock;
      break;
    }
    
    // Add a small delay between attempts
    await sleep(300);
  }
  
  if (accountLocked) {
    // Check if lockout duration matches expected
    const match = message.match(/in (\d+) minutes?/);
    const actualMinutes = match ? parseInt(match[1], 10) : 0;
    
    if (actualMinutes === expectedMinutes) {
      console.log(`✅ SUCCESS: Account locked with correct duration of ${actualMinutes} minutes`);
    } else {
      console.log(`❌ FAILURE: Expected ${expectedMinutes} minutes lockout, got ${actualMinutes}`);
    }
    
    // Check admin intervention
    if (expectAdminIntervention && requiresAdminUnlock) {
      console.log('✅ SUCCESS: Account correctly requires admin intervention');
    } else if (expectAdminIntervention && !requiresAdminUnlock) {
      console.log('❌ FAILURE: Account should require admin intervention but does not');
    } else if (!expectAdminIntervention && requiresAdminUnlock) {
      console.log('❌ FAILURE: Account requires admin intervention but should not');
    }
  } else {
    console.log('❌ FAILURE: Account was not locked after exceeding maximum attempts');
  }
  
  // Try correct password to ensure account is still locked
  const correctAttempt = await attemptLogin(CORRECT_PASSWORD, 1);
  
  if (!correctAttempt.success && correctAttempt.isLocked) {
    console.log('✅ SUCCESS: Account remained locked even with correct password');
  } else {
    console.log('❌ FAILURE: Account accepted correct password while locked');
  }
}

// Run the progressive lockout test
testProgressiveLockouts(); 