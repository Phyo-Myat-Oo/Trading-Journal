# Token Family Security: Refresh Token Rotation Enhanced Security

## Overview

This document outlines the security enhancements implemented for refresh token rotation in the Trading Journal application. These improvements address common JWT refresh token vulnerabilities and implement industry best practices for token security.

## Features Implemented

### 1. Token Family Tracking

Each refresh token is now part of a "family" that links all tokens derived from the original authentication. This allows:

- Tracking the complete lineage of tokens issued to a user
- Identifying the correct token rotation sequence
- Detecting and preventing token reuse or theft

### 2. Absolute Expiration

Even with token rotation, a session will now expire after 7 days, requiring users to re-authenticate. This prevents:

- Indefinite sessions through continuous token rotation
- Long-lived sessions that may pose security risks
- Potential abuse of compromised but valid refresh tokens

### 3. Suspicious Pattern Detection

The system now detects and responds to suspicious token usage patterns:

- **Parallel Usage**: If a token is used after its child token has already been created, it indicates potential token theft
- **Response to Detection**: When suspicious activity is detected:
  - All tokens in the affected family are immediately invalidated
  - The user is forced to re-authenticate
  - A security event is logged for administrator review

### 4. Rate Limiting

Token refresh operations are now rate-limited:

- 30 refresh operations per 15 minutes per IP address
- Helps prevent brute force attacks against the refresh token endpoint
- Limits the potential damage from compromised tokens

## Implementation Details

### Token Family Model

Each RefreshToken now contains:

- `familyId`: A UUID linking all related tokens
- `parentJti`: Reference to the token it was rotated from (null for the first token in family)
- `familyCreatedAt`: When the family was first created
- `rotationCounter`: Number of times the token has been rotated within family

### Security Events

A new `TokenEvent` model logs security-related token events:

- Suspicious token usage detection
- Token family revocation
- Rate limit violations
- Re-authentication requirements

Events include context data such as:
- User ID
- Token family ID
- Event type
- IP address
- User agent
- Timestamp
- Event-specific details

## Admin Monitoring

Administrators can monitor token security events via:

1. A new admin endpoint at `/api/admin/token-security-events`
2. Filtering options for event type, user, date range, etc.
3. Detailed information about suspicious activities

## User Experience Considerations

Users will notice the following changes:

1. **Mandatory Re-authentication**: Users will need to log in again after 7 days, even with active usage
2. **Security Notifications**: When token theft is detected, users will be logged out and can be notified of suspicious activity
3. **Rate Limiting**: Very frequent token refreshes will be temporarily blocked

## Testing

The implementation includes a test script (`test-token-family.js`) that validates the core security features. You can follow these steps to test the implementation:

### Automated Testing

1. **Setup the Test Script**
   - Ensure the backend server is running: `cd backend && npm run dev`
   - Open `backend/test-token-family.js`
   - Update the `TEST_USER` credentials with valid user credentials

2. **Run the Test Script**
   ```bash
   cd backend
   node test-token-family.js
   ```

3. **Test Scenarios Covered**
   - **Token Rotation**: Verifies that refresh tokens can be successfully rotated and that old tokens are invalidated
   - **Parallel Usage Detection**: Simulates a token theft scenario and verifies the system detects it
   - **Rate Limiting**: Verifies that excessive token refresh requests are rate-limited

### Manual Testing

You can also test these features manually:

#### Testing Token Rotation

1. Login through the web interface or using a tool like Postman
2. Capture the refresh token from the cookie
3. Use the refresh token to get a new access token
4. Verify the response includes a new refresh token cookie
5. Try to use the original refresh token again - this should fail with a 401 error

#### Testing Suspicious Activity Detection

1. Login to get a refresh token (RT1)
2. Use RT1 to get a new access token and refresh token (RT2)
3. Try to use RT1 again - this should fail with a 401 error indicating suspicious activity
4. Now try to use RT2 - this should also fail as the entire family should be revoked

#### Testing Family Expiration

1. In the database, find a refresh token and modify its `familyCreatedAt` to be 8 days ago
2. Try to use this token - it should fail requiring re-authentication
3. Check the `TokenEvent` collection for a corresponding event

#### Testing Rate Limiting

1. Write a script to rapidly send refresh token requests
2. After approximately 30 requests, you should receive a 429 (Too Many Requests) response
3. Wait 15 minutes and verify that requests succeed again

### Verifying Security Events

After conducting these tests, check the security events:

1. Access the admin endpoint: `/api/admin/token-security-events`
2. Verify events are recorded for:
   - Suspicious parallel usage
   - Token family revocations
   - Rate limit violations

## Security Best Practices

These enhancements follow security best practices for JWT refresh tokens:

1. **Limited Lifespan**: All token families have a maximum lifespan
2. **One-Time Use**: Each refresh token can only be used once
3. **Chain of Trust**: Each token must be derived from a valid parent
4. **Immediate Revocation**: Security issues trigger immediate family-wide revocation
5. **Audit Trail**: All security-related events are logged
6. **Rate Limiting**: Prevents abuse and brute force attacks

## Future Enhancements

Potential future security improvements include:

1. Device fingerprinting to further validate token usage
2. Geolocation validation for high-security operations
3. Machine learning-based anomaly detection for token usage patterns
4. User notifications for suspicious activity 