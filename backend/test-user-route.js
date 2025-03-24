import axios from 'axios';

// Define the API URL
const API_URL = 'http://localhost:3000';

// Test user credentials - update these with valid credentials from your system
const userCredentials = {
  email: 'phyomyatoo.myanmar.1999@gmail.com',
  password: 'pweryou1Q1NYOC@' // IMPORTANT: Replace with an actual password
};

// Function to login and get a token
async function login() {
  try {
    console.log('Attempting to login...');
    const response = await axios.post(`${API_URL}/api/auth/login`, userCredentials);
    
    console.log('Login successful!');
    return response.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Function to test access to the user profile endpoint
async function testUserProfile(token) {
  try {
    console.log('Testing access to user profile endpoint...');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    
    const response = await axios.get(`${API_URL}/api/users/me`, config);
    
    console.log('Successfully accessed user profile endpoint!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to access user profile endpoint:', error.response?.data || error.message);
    throw error;
  }
}

// Function to test access to a admin-only endpoint (search users)
async function testAdminEndpoint(token) {
  try {
    console.log('Testing access to admin-only endpoint...');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    
    const response = await axios.get(`${API_URL}/api/users/search`, config);
    
    console.log('Successfully accessed admin-only endpoint!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to access admin-only endpoint:', error.response?.data || error.message);
    console.log('Error status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message);
    // This might be expected if the user is not an admin
  }
}

// Main function to run the tests
async function runTest() {
  try {
    // Step 1: Login and get token
    const token = await login();
    
    if (token) {
      // Step 2: Test access to user profile endpoint
      await testUserProfile(token);
      
      // Step 3: Test access to admin-only endpoint (might fail if user is not admin)
      await testAdminEndpoint(token);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
runTest(); 