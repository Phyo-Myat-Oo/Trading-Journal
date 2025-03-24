import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

// Track success/failure of tests
const testResults = {
  tokenRotation: false,
  parallelUsage: false,
  rateLimiting: false
};

// Login function - returns tokens
async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
    console.log('Login successful');
    return {
      accessToken: response.data.token,
      refreshToken: response.headers['set-cookie'][0],
      success: true
    };
  } catch (error) {
    console.error('Login failed:', error.message);
    return { success: false };
  }
}

// Test token rotation
async function testTokenRotation() {
  console.log('\n--- Testing Token Rotation ---');
  
  try {
    // Initial login
    const initialTokens = await login();
    if (!initialTokens.success) return false;
    
    console.log('Initial tokens received');
    
    // First refresh
    const firstRefreshResponse = await axios.post(
      `${API_URL}/api/auth/refresh-token`, 
      {}, 
      { headers: { Cookie: initialTokens.refreshToken } }
    );
    
    console.log('First refresh successful:');
    console.log('- New access token received:', !!firstRefreshResponse.data.token);
    console.log('- New refresh token received:', !!firstRefreshResponse.headers['set-cookie']);
    
    // Second refresh with the new refresh token
    const secondRefreshResponse = await axios.post(
      `${API_URL}/api/auth/refresh-token`, 
      {}, 
      { headers: { Cookie: firstRefreshResponse.headers['set-cookie'][0] } }
    );
    
    console.log('Second refresh successful:');
    console.log('- New access token received:', !!secondRefreshResponse.data.token);
    console.log('- New refresh token received:', !!secondRefreshResponse.headers['set-cookie']);
    
    // Try using the old refresh token (should fail)
    try {
      await axios.post(
        `${API_URL}/api/auth/refresh-token`, 
        {}, 
        { headers: { Cookie: initialTokens.refreshToken } }
      );
      console.log('❌ Test failed: Old refresh token should not work');
      return false;
    } catch (error) {
      console.log('✅ Old refresh token correctly rejected');
    }
    
    testResults.tokenRotation = true;
    return true;
  } catch (error) {
    console.error('Token rotation test failed:', error.message);
    return false;
  }
}

// Test parallel token usage (simulates token theft)
async function testParallelTokenUsage() {
  console.log('\n--- Testing Parallel Token Usage ---');
  
  try {
    // Login to get initial tokens
    const initialTokens = await login();
    if (!initialTokens.success) return false;
    
    // First refresh - legitimate
    const firstRefreshResponse = await axios.post(
      `${API_URL}/api/auth/refresh-token`, 
      {}, 
      { headers: { Cookie: initialTokens.refreshToken } }
    );
    
    console.log('First refresh successful');
    
    // Second refresh from same original token - simulates stolen token
    try {
      await axios.post(
        `${API_URL}/api/auth/refresh-token`, 
        {}, 
        { headers: { Cookie: initialTokens.refreshToken } }
      );
      console.log('❌ Test failed: Parallel token usage should be detected');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Parallel token usage correctly detected and rejected');
        
        // Verify the legitimate token is now also invalid
        try {
          await axios.post(
            `${API_URL}/api/auth/refresh-token`, 
            {}, 
            { headers: { Cookie: firstRefreshResponse.headers['set-cookie'][0] } }
          );
          console.log('❌ Test failed: Legitimate token should be revoked after suspicious activity');
          return false;
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.log('✅ All tokens in family correctly revoked');
            testResults.parallelUsage = true;
            return true;
          } else {
            console.log('❌ Unexpected error when checking legitimate token:', error.message);
            return false;
          }
        }
      } else {
        console.log('❌ Unexpected error type:', error.message);
        return false;
      }
    }
  } catch (error) {
    console.error('Parallel usage test failed:', error.message);
    return false;
  }
}

// Test rate limiting
async function testRateLimiting() {
  console.log('\n--- Testing Rate Limiting ---');
  
  try {
    // Login to get initial tokens
    const initialTokens = await login();
    if (!initialTokens.success) return false;
    
    // Make multiple refresh requests to trigger rate limit
    // We'll make 31 requests which should exceed the limit (30 per 15 min)
    console.log('Making multiple refresh requests to trigger rate limit...');
    
    let limitHit = false;
    let validRefreshToken = initialTokens.refreshToken;
    
    for (let i = 1; i <= 35; i++) {
      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh-token`,
          {},
          { headers: { Cookie: validRefreshToken } }
        );
        
        // Keep track of the latest valid refresh token
        validRefreshToken = response.headers['set-cookie'][0];
        console.log(`Request ${i}: Success`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`✅ Rate limit correctly triggered at request ${i}`);
          limitHit = true;
          break;
        } else {
          console.log(`❌ Unexpected error on request ${i}:`, error.message);
          return false;
        }
      }
    }
    
    if (!limitHit) {
      console.log('❌ Test failed: Rate limit was not triggered');
      return false;
    }
    
    testResults.rateLimiting = true;
    return true;
  } catch (error) {
    console.error('Rate limiting test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting token family security tests...');
  
  await testTokenRotation();
  console.log(`Token Rotation Test: ${testResults.tokenRotation ? '✅ PASSED' : '❌ FAILED'}`);
  
  await testParallelTokenUsage();
  console.log(`Parallel Usage Test: ${testResults.parallelUsage ? '✅ PASSED' : '❌ FAILED'}`);
  
  await testRateLimiting();
  console.log(`Rate Limiting Test: ${testResults.rateLimiting ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\nTest Summary:');
  console.log('-------------');
  console.log(`Token Rotation: ${testResults.tokenRotation ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Parallel Usage: ${testResults.parallelUsage ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Rate Limiting: ${testResults.rateLimiting ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (testResults.tokenRotation && testResults.parallelUsage && testResults.rateLimiting) {
    console.log('\n✅ ALL TESTS PASSED');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
  }
}

// Execute tests
runTests(); 