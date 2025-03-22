/**
 * Cookie testing utility script
 * 
 * This script helps diagnose cookie-related issues with authentication.
 * Run this in your browser console to test various cookie scenarios.
 */

(function() {
  const API_URL = 'http://localhost:3000';

  // Test setting a regular cookie
  function testRegularCookie() {
    console.log('Testing regular cookie...');
    document.cookie = 'testCookie=regular-value; path=/;';
    console.log('Regular cookie set, all cookies:', document.cookie);
  }

  // Test fetch with credentials
  async function testCredentialsRequest() {
    console.log('Testing fetch with credentials...');
    try {
      const response = await fetch(`${API_URL}/api/auth/check-cookies`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Response from cookie check:', data);
      return data;
    } catch (error) {
      console.error('Error testing credentials:', error);
    }
  }

  // Test secure cookie
  async function testSecureCookie() {
    console.log('Testing secure cookie setting...');
    try {
      const response = await fetch(`${API_URL}/api/auth/test-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Response from test cookie endpoint:', data);
      console.log('All cookies after test:', document.cookie);
      return data;
    } catch (error) {
      console.error('Error testing secure cookie:', error);
    }
  }

  // Check third-party cookie settings
  function checkBrowserSettings() {
    console.log('Checking browser third-party cookie settings...');
    console.log('Note: This is limited in what it can detect. Check browser settings manually.');
    
    const isSameSite = window.location.origin === API_URL;
    console.log('Is same site:', isSameSite);
    console.log('Frontend origin:', window.location.origin);
    console.log('API origin:', API_URL);
    
    if (!isSameSite) {
      console.warn('Cross-origin scenario detected. Check that third-party cookies are allowed in your browser.');
    }
  }

  // Run all tests
  async function runAllTests() {
    console.log('=== STARTING COOKIE TESTS ===');
    checkBrowserSettings();
    testRegularCookie();
    await testSecureCookie();
    await testCredentialsRequest();
    console.log('=== COOKIE TESTS COMPLETE ===');
  }

  // Expose functions to global scope for console access
  window.cookieTests = {
    testRegularCookie,
    testCredentialsRequest,
    testSecureCookie,
    checkBrowserSettings,
    runAllTests
  };

  console.log('Cookie test utilities loaded. Run window.cookieTests.runAllTests() to start testing.');
})(); 