const axios = require('axios');
const speakeasy = require('speakeasy');

const API_URL = 'http://localhost:3000';

// Use our verified test user with 2FA already enabled
const TEST_USER = {
  email: 'test4e62527a@example.com',
  password: 'TestPassword123!',
  twoFactorSecret: 'LI2EMN3EG5QUYI3RKFFTG2KQGA2DK2ZV' // This is the secret we got from the previous test
};

// Test the 2FA login process
async function testTwoFactorLogin() {
  try {
    console.log('Starting 2FA login test...');
    console.log(`Using test email: ${TEST_USER.email}`);
    
    // Step 1: Initial login attempt (should return userId for 2FA)
    console.log('\nAttempting login with 2FA-enabled account...');
    
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    console.log('Initial login response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!loginResponse.data.requiresTwoFactor || !loginResponse.data.userId) {
      throw new Error('Expected 2FA challenge, but none was received');
    }
    
    const userId = loginResponse.data.userId;
    console.log(`\nUser requires 2FA verification. User ID: ${userId}`);
    
    // Step 2: Generate TOTP token using the secret
    const token = speakeasy.totp({
      secret: TEST_USER.twoFactorSecret,
      encoding: 'base32'
    });
    
    console.log(`\nGenerated TOTP token: ${token}`);
    
    // Step 3: Complete 2FA verification
    console.log('\nCompleting 2FA verification...');
    
    try {
      const verifyResponse = await axios.post(`${API_URL}/api/auth/2fa/verify`, {
        userId,
        token
      });
      
      console.log('2FA verification successful!');
      console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
      
      // Check if we received access token
      if (!verifyResponse.data.accessToken) {
        throw new Error('No access token received after 2FA verification');
      }
      
      console.log('\nLogin flow with 2FA completed successfully!');
      
    } catch (verifyError) {
      console.error('2FA verification failed:');
      if (verifyError.response) {
        console.error('Status:', verifyError.response.status);
        console.error('Data:', JSON.stringify(verifyError.response.data, null, 2));
      } else {
        console.error(verifyError.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testTwoFactorLogin(); 