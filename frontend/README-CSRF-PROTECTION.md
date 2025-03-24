# CSRF Protection Implementation

This document outlines the implementation of Cross-Site Request Forgery (CSRF) protection in the application.

## Overview

CSRF is an attack that forces authenticated users to submit a request to a web application against which they are currently authenticated. Our implementation uses a token-based approach to protect against CSRF attacks, specifically the synchronizer token pattern.

## Components

The CSRF protection system consists of several components:

1. **CSRFManager**: A singleton class that manages CSRF tokens
2. **API Interceptors**: Automatically adds CSRF tokens to requests
3. **Backend Middleware**: Validates CSRF tokens on the server
4. **React Hook**: Provides CSRF functionality to React components

## CSRFManager

The `CSRFManager` class is responsible for managing CSRF tokens:

- **Singleton Pattern**: Ensures only one instance exists across the application
- **Token Lifecycle**: Handles token fetching, storage, and expiration
- **Multi-Tab Synchronization**: Keeps token state consistent across browser tabs
- **Error Handling**: Provides graceful handling of token fetch failures

### Key Features

- **Automatic Token Refresh**: Refreshes tokens before they expire
- **Token Caching**: Minimizes unnecessary API calls
- **Cross-Tab Communication**: Uses localStorage events for tab synchronization
- **Graceful Degradation**: Falls back to request-specific tokens if needed

## Integration with API

The API utility has been enhanced to automatically include CSRF tokens in requests:

- **Request Interceptor**: Adds CSRF tokens to all qualifying requests
- **Protected Endpoints**: Configuration to specify which endpoints need protection
- **Error Handling**: Handles CSRF validation failures with automatic retry
- **Debug Logging**: Provides visibility into token operations during development

## React Hook Integration

The `useCsrf` hook provides easy access to CSRF functionality:

```typescript
const { csrfToken, isLoading, error, fetchToken, clearToken } = useCsrf();
```

This allows components to:

- Access the current CSRF token
- Trigger token refreshes when needed
- Handle loading and error states
- Clear tokens when necessary

## Protected Endpoints

The following endpoints have CSRF protection:

- `/api/auth/reset-password`
- `/api/users/profile`
- `/api/users/password`
- `/api/users/delete-account`
- `/api/users/2fa/verify`
- `/api/users/2fa/setup`
- `/api/users/2fa/disable`
- `/api/users/preferences`
- `/api/sessions/revoke`
- `/api/dashboard/settings`

Additionally, all POST, PUT, PATCH, and DELETE requests are protected unless specifically exempted.

## Testing

The CSRF implementation includes comprehensive tests:

- **Unit Tests**: Verify CSRFManager functionality
- **Multi-Tab Tests**: Ensure synchronization works correctly
- **Error Handling Tests**: Validate graceful handling of failures
- **Integration Tests**: Test the full CSRF flow

## Security Considerations

To maximize security:

1. **Token Rotation**: Tokens are rotated on a regular schedule
2. **Secure Cookies**: HttpOnly and Secure flags are set on cookies
3. **Double Submit Pattern**: Tokens are validated both in cookies and headers
4. **SameSite Policy**: Cookies use SameSite=Strict to prevent cross-origin requests

## Usage Example

Here is an example of a component that uses CSRF protection:

```typescript
import React, { useEffect } from 'react';
import { useCsrf } from '../hooks/useCsrf';

function ProtectedForm() {
  const { csrfToken, isLoading, error, fetchToken } = useCsrf();
  
  useEffect(() => {
    // Fetch CSRF token when component mounts
    fetchToken();
  }, [fetchToken]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return (
    <form method="post" action="/api/users/profile">
      <input type="hidden" name="_csrf" value={csrfToken || ''} />
      {/* Form fields */}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Future Improvements

Potential enhancements to consider:

1. **Per-Form Tokens**: Implement unique tokens for each form
2. **Response Analysis**: Add intelligent analysis of CSRF failures
3. **Automatic Recovery**: Enhance automatic recovery from CSRF failures
4. **Performance Optimization**: Further optimize token refresh strategies
5. **Enhanced Monitoring**: Add telemetry specifically for CSRF operations 