# Authentication Middleware Migration Testing Plan

This document outlines the testing plan to verify that all routes function correctly after standardizing on the modern `authenticate` middleware from `authMiddleware.ts`.

## Overview of Changes

1. Replaced the legacy `authenticateToken` middleware with the modern `authenticate` middleware in all route files
2. Removed the legacy `auth.ts` file
3. Updated the TypeScript interface for Request to standardize the user object type

## Testing Approach

### Test Scripts
To streamline testing, we've created two Node.js scripts:

1. `test-auth.js` - Tests access to admin routes with authentication
2. `test-user-route.js` - Tests user profile access and admin-only endpoints

See `AUTH_TEST_INSTRUCTIONS.md` for detailed instructions on running these scripts.

### Unit Tests
- Verify that the `authenticate` middleware in `authMiddleware.ts` correctly:
  - Validates JWT tokens
  - Extracts user information from tokens
  - Attaches user object to the request
  - Returns appropriate errors for invalid/missing tokens

### Manual Route Testing
Test the following routes to verify they require proper authentication:

#### Authentication Routes
- POST `/api/auth/login` - Should issue a valid JWT token
- POST `/api/auth/register` - Should create a user and issue a token
- POST `/api/auth/refresh-token` - Should issue a new token when provided with a valid refresh token

#### User Routes
- GET `/api/users/me` - Should return the authenticated user's profile
- PUT `/api/users/me` - Should update the authenticated user's profile
- GET `/api/users/search` - Should only be accessible to admin users

#### Trade Routes
- GET `/api/trades` - Should retrieve only the authenticated user's trades
- POST `/api/trades` - Should create a trade for the authenticated user
- PUT `/api/trades/:id` - Should only update trades owned by the authenticated user
- DELETE `/api/trades/:id` - Should only delete trades owned by the authenticated user

#### Journal Routes
- GET `/api/journals` - Should retrieve only the authenticated user's journals
- POST `/api/journals` - Should create a journal for the authenticated user
- PUT `/api/journals/:id` - Should only update journals owned by the authenticated user
- DELETE `/api/journals/:id` - Should only delete journals owned by the authenticated user

#### Account Routes
- GET `/api/accounts` - Should retrieve only the authenticated user's accounts
- POST `/api/accounts` - Should create an account for the authenticated user
- PUT `/api/accounts/:id` - Should only update accounts owned by the authenticated user
- DELETE `/api/accounts/:id` - Should only delete accounts owned by the authenticated user

#### Analysis Routes
- GET `/api/analysis/performance` - Should analyze only the authenticated user's data
- GET `/api/analysis/trends` - Should analyze only the authenticated user's data

#### Admin Routes
- GET `/api/admin/users` - Should only be accessible to admin users
- GET `/api/admin/locked-accounts` - Should only be accessible to admin users

#### Scheduled Jobs
- All scheduled job endpoints should verify admin privileges

### Security Testing
- Test token expiration handling
- Test invalid token rejection
- Test token refresh flow
- Test protection against common attack vectors (CSRF, XSS, etc.)

### Role-Based Access Control Testing
- Verify regular users cannot access admin-only endpoints
- Verify users cannot access other users' data

## Testing Tools

1. Postman or similar API testing tool
2. Browser developer tools to check authentication cookies
3. JWT.io to decode and inspect tokens

## Issues Log
Document any issues encountered during testing here:

| Issue | Route | Description | Status |
|-------|-------|-------------|--------|
|       |       |             |        | 