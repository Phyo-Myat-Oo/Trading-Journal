# Token Security Implementation

## Introduction

This document provides technical details on the token security enhancements implemented in the Trading Journal application, focusing on refresh token rotation security with token family tracking.

## Files Modified

1. **Models**
   - `RefreshToken.ts` - Added token family tracking fields
   - `TokenEvent.ts` (new) - Model for logging security events

2. **Services**
   - `tokenService.ts` - Enhanced with family tracking and security checks

3. **Controllers**
   - `authController.ts` - Updated refresh token handling
   - `adminController.ts` - Added token security event monitoring

4. **Middleware**
   - `rateLimitMiddleware.ts` - Added token refresh rate limiting

5. **Routes**
   - `authRoutes.ts` - Applied rate limiting to refresh token endpoint
   - `adminRoutes.ts` - Added token security events endpoint

## Technical Implementation

### Token Family Model

Each refresh token now has the following additional fields:

```typescript
familyId: string;         // Links tokens in the same family
parentJti: string | null; // Points to the previous token
familyCreatedAt: Date;    // When the family was first created
rotationCounter: number;  // Number of rotations in this family
```

### Token Security Events

Security events are recorded in the `TokenEvent` collection:

```typescript
{
  userId: ObjectId,
  familyId: string,
  eventType: string,  // 'suspicious_parallel_usage', etc.
  details: Object,
  ipAddress: string,
  userAgent: string,
  createdAt: Date
}
```

### Token Refresh Flow

1. Client sends refresh token in HTTP-only cookie
2. Server verifies token signature and expiration
3. Server performs enhanced security checks:
   - Checks if token is revoked
   - Verifies token family age
   - Checks for suspicious parallel usage
   - Verifies rotation count
4. If checks pass, server:
   - Revokes current token
   - Generates new access token
   - Creates new refresh token in same family
   - Returns access token in response, refresh token in cookie

### Security Checks

The system performs several security checks during token refresh:

1. **Family Age Check**
   - If a token family is older than 7 days, re-authentication is required
   - This prevents indefinite session duration through token rotation

2. **Suspicious Parallel Usage**
   - If multiple tokens from the same family are used concurrently
   - Indicates potential token theft
   - All tokens in family are immediately revoked

3. **Excessive Rotation**
   - If a token has been rotated more than 100 times
   - Potential sign of abuse
   - Forces re-authentication

### Rate Limiting

Token refresh operations are rate-limited:

- 30 refreshes per 15 minutes per IP address
- Prevents brute force attacks
- Returns 429 status code when limit exceeded

## Test Scripts

A test script is provided to verify the implementation:

- `test-token-family.js` - Tests token rotation, parallel usage detection, and rate limiting

To run the test:

```bash
node test-token-family.js
```

Note: You must update the test credentials before running.

## Future Maintenance

When making changes to the authentication system, consider:

1. Preserving token family relationships during token rotation
2. Maintaining security event logging
3. Updating the admin dashboard if new event types are added
4. Adjusting rate limits based on application needs

## Troubleshooting

Common issues:

1. **Unexpected session termination**
   - Check `TokenEvent` collection for security events
   - May indicate suspicious activity detection

2. **Frequent re-authentication prompts**
   - Verify family age settings
   - Check for excessive token rotations

3. **Rate limiting issues**
   - Adjust rate limit parameters in `rateLimitMiddleware.ts`
   - Monitor usage patterns to tune appropriately

## Security Considerations

- Refresh tokens are stored in HTTP-only cookies
- Token IDs are stored in the database, not the actual tokens
- Token blacklisting is used for immediate invalidation
- All security events are logged for auditing

For detailed security documentation, see `TOKEN_FAMILY_SECURITY.md`. 