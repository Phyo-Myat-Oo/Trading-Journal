const axios = require('axios');
const speakeasy = require('speakeasy');

const API_URL = 'http://localhost:3000';

// Use our verified test user
const TEST_USER = {
  email: 'test4e62527a@example.com',
  password: 'TestPassword123!'
};

// Test the 2FA setup and verification process
async function testTwoFactorSetup() {
  try {
    console.log('Starting 2FA test with verified user...');
    console.log(`Using test email: ${TEST_USER.email}`);
    
    // Step 1: Login to get access token
    console.log('\nLogging in...');
    try {
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
      
      if (!loginResponse.data.accessToken) {
        throw new Error('Login failed: No access token received');
      }
      
      const accessToken = loginResponse.data.accessToken;
      const userId = loginResponse.data.user.id;
      
      console.log('Login successful!');
      console.log('User ID:', userId);
      
      // Create axios instance with auth token
      const api = axios.create({
        baseURL: API_URL,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true // Needed for cookies
      });
      
      // Step 2: Call 2FA setup endpoint
      console.log('\nInitiating 2FA setup...');
      const setupResponse = await api.get('/api/users/2fa/setup');
      
      if (!setupResponse.data.secret) {
        throw new Error('2FA setup failed: No secret received');
      }
      
      const secret = setupResponse.data.secret;
      console.log('2FA setup successful!');
      console.log('Secret:', secret);
      console.log('QR Code URL available:', !!setupResponse.data.qrCodeUrl);
      
      // Step 3: Generate a test TOTP token using the secret
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });
      
      console.log('\nGenerated TOTP token:', token);
      
      // Step 4: Verify and enable 2FA
      console.log('\nVerifying and enabling 2FA...');
      try {
        const verifyResponse = await api.post('/api/users/2fa/verify', { token });
        console.log('2FA verification successful!');
        console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
        
        // Print backup codes if available
        if (verifyResponse.data.backupCodes && verifyResponse.data.backupCodes.length > 0) {
          console.log('\nBackup Codes:');
          verifyResponse.data.backupCodes.forEach(code => console.log(code));
        }
      } catch (verifyError) {
        console.error('2FA verification failed:');
        if (verifyError.response) {
          console.error('Status:', verifyError.response.status);
          console.error('Data:', JSON.stringify(verifyError.response.data, null, 2));
          
          // Print request details for debugging
          console.log('\nRequest details:');
          console.log('URL:', `${API_URL}/api/users/2fa/verify`);
          console.log('Method:', 'POST');
          console.log('Headers:', {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          });
          console.log('Data:', { token });
        } else {
          console.error(verifyError.message);
        }
      }
    } catch (loginError) {
      console.error('Login failed:');
      if (loginError.response) {
        console.error('Status:', loginError.response.status);
        console.error('Data:', JSON.stringify(loginError.response.data, null, 2));
      } else {
        console.error(loginError.message);
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
testTwoFactorSetup(); 