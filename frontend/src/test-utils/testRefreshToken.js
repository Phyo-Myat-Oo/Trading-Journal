/**
 * Simple script to test the token refresh functionality.
 * 
 * Usage:
 * 1. Run the server
 * 2. Install and run using Node:
 *    - npm install axios
 *    - node testRefreshToken.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testTokenRefresh() {
  try {
    // 1. Login to get a token
    console.log('1. Attempting login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com', // Replace with a valid user
      password: 'password123'    // Replace with a valid password
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful. Token received.');
    
    // 2. Test a protected endpoint with the token
    console.log('2. Testing protected endpoint with token...');
    const protectedResponse = await axios.get(`${API_URL}/api/trades`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Protected endpoint access successful.');
    
    // 3. Test token refresh
    console.log('3. Testing token refresh...');
    const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh-token`, {
      token
    });
    
    const newToken = refreshResponse.data.token;
    console.log('Token refresh successful. New token received.');
    
    // 4. Test protected endpoint with new token
    console.log('4. Testing protected endpoint with new token...');
    const newProtectedResponse = await axios.get(`${API_URL}/api/trades`, {
      headers: {
        Authorization: `Bearer ${newToken}`
      }
    });
    console.log('Protected endpoint access with new token successful.');
    
    console.log('All tests passed! Token refresh mechanism is working correctly.');
  } catch (error) {
    console.error('Error during token refresh test:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testTokenRefresh(); 