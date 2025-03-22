/**
 * Simple script to test the token refresh functionality in TypeScript.
 * 
 * Usage:
 * 1. Run the server
 * 2. Run using ts-node:
 *    - npm install -g ts-node
 *    - ts-node testRefreshToken.ts
 */

import axios, { AxiosResponse } from 'axios';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  message: string;
}

interface RefreshTokenResponse {
  token: string;
  message: string;
}

const API_URL = 'http://localhost:5000';

async function testTokenRefresh(): Promise<void> {
  try {
    // 1. Login to get a token
    console.log('1. Attempting login...');
    const loginResponse: AxiosResponse<LoginResponse> = await axios.post(
      `${API_URL}/api/auth/login`, 
      {
        email: 'test@example.com', // Replace with a valid user
        password: 'password123'    // Replace with a valid password
      }
    );
    
    const token = loginResponse.data.token;
    console.log('Login successful. Token received.');
    
    // 2. Test a protected endpoint with the token
    console.log('2. Testing protected endpoint with token...');
    await axios.get(`${API_URL}/api/trades`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Protected endpoint access successful.');
    
    // 3. Test token refresh
    console.log('3. Testing token refresh...');
    const refreshResponse: AxiosResponse<RefreshTokenResponse> = await axios.post(
      `${API_URL}/api/auth/refresh-token`, 
      { token }
    );
    
    const newToken = refreshResponse.data.token;
    console.log('Token refresh successful. New token received.');
    
    // 4. Test protected endpoint with new token
    console.log('4. Testing protected endpoint with new token...');
    await axios.get(`${API_URL}/api/trades`, {
      headers: {
        Authorization: `Bearer ${newToken}`
      }
    });
    console.log('Protected endpoint access with new token successful.');
    
    console.log('All tests passed! Token refresh mechanism is working correctly.');
  } catch (error: unknown) {
    console.error('Error during token refresh test:');
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number, data: unknown } };
      console.error(`Status: ${axiosError.response.status}`);
      console.error('Response data:', axiosError.response.data);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
}

testTokenRefresh(); 