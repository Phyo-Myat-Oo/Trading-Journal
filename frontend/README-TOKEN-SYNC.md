# Token Synchronization Across Browser Tabs

This document outlines the implementation of token synchronization across multiple browser tabs in our application.

## Overview

Our enhanced `TokenManager` now includes basic multi-tab synchronization capabilities to ensure a consistent token state across all open tabs of the application. This improves user experience by preventing scenarios where a user is logged out in one tab but still logged in in another.

## Implementation Details

### 1. Cross-Tab Communication

We use the browser's `localStorage` events to communicate between tabs:

- When a token is refreshed, the new token state is stored in `localStorage`
- Other tabs listen for these storage events
- When detected, tabs update their token state accordingly

### 2. Key Synchronized Actions

The following token-related actions are synchronized across tabs:

- **Token Refresh**: When a token is successfully refreshed in one tab, all tabs are updated
- **Token Revocation**: When a user logs out in one tab, all tabs are logged out
- **Token Errors**: Significant token errors are communicated across tabs

### 3. Debouncing Refresh Requests

To prevent excessive refreshes when multiple tabs detect expiring tokens:

- Token refresh requests are debounced
- Tabs coordinate to prevent duplicate refresh calls
- The first tab to initiate a refresh will usually complete it for all tabs

## Performance Improvements

In addition to multi-tab synchronization, we've added some basic performance improvements:

1. **Refresh Debouncing**: Multiple requests to refresh tokens are combined into a single API call
2. **Simple Metrics**: Basic timing metrics are collected for token operations
3. **Optimized Queue Processing**: Token refresh requests are processed more efficiently

## Usage Example

The TokenManager synchronization works automatically without any additional configuration. However, developers should be aware of how it works:

```typescript
// Example of token synchronization behavior
const tokenManager = TokenManager.getInstance();

// If a user logs out in another tab
// This tab will automatically react to the logout action
tokenManager.on(TokenEventType.TOKEN_REVOKED, () => {
  // Handle logout, e.g., redirect to login page
  navigate('/login');
});
```

## Testing

The token synchronization functionality can be tested using the provided test cases in `TokenRefresh.test.ts`. These tests verify:

- Basic token refresh functionality
- Multi-tab synchronization
- Performance tracking

## Limitations

This is a minimal implementation with some limitations:

1. It relies on `localStorage` events, which don't work across different browser windows or private browsing contexts
2. Complex race conditions are not fully handled
3. Very rapid token changes might not all be detected

## Future Improvements

Potential future enhancements could include:

1. More sophisticated leader election for refresh operations
2. Service worker integration for cross-window synchronization
3. More comprehensive telemetry and monitoring 