# JWT Token Expiration Handling

This document describes the enhanced token expiration handling implemented in the Trading Journal application.

## Overview

JWT tokens have a limited lifetime for security reasons. The application implements intelligent token expiration handling that balances security and user experience. Key features include:

1. **Dynamic expiration times** based on device type, user activity, and "Remember Me" preference
2. **Proactive token refreshing** before expiration to prevent disruption
3. **User-friendly session expiration notifications** with one-click extension
4. **Activity monitoring** to adjust token lifetimes based on user engagement
5. **Cross-tab synchronization** for consistent authentication state

## Dynamic Token Expiration

The system adjusts token lifetimes based on several factors to balance security and convenience:

### Device-Based Expiration

Tokens expire at different rates depending on the device type:

| Device Type | Standard Session | Remember Me |
|-------------|------------------|------------|
| Desktop     | 30 minutes       | 7 days     |
| Tablet      | 20 minutes       | 5 days     |
| Mobile      | 15 minutes       | 3 days     |
| Unknown     | 15 minutes       | 1 day      |

### User Activity Monitoring

The system monitors user activity through various browser events:

- Mouse movements, clicks, scrolling
- Keyboard input
- Touch interactions

When a user is inactive for an extended period (default: 30 minutes), the system:
- May expire tokens sooner
- Validates tokens more frequently
- Uses a more aggressive refresh threshold (60% vs 75% of token lifetime)

## Session Expiration Dialog

When a token is about to expire, a user-friendly dialog is displayed:

- Shows a countdown timer with the remaining time
- Provides clear options to extend the session or log out
- Includes a visual progress indicator
- Handles extension requests seamlessly in the background

The dialog appears when:
- The token has less than 2 minutes remaining
- The user is actively using the application
- The session hasn't already been extended recently

## Implementation Components

### 1. TokenManager Enhancements

The `TokenManager` singleton manages token lifecycle with these key features:

```typescript
// Set user's "Remember Me" preference
tokenManager.setRememberMe(true);

// Get device-specific expiration time
const expiration = tokenManager.getTokenExpiration();

// Check if user is inactive
if (tokenManager.isUserInactive()) {
  // Handle inactive user case
}

// Update activity timestamp (called internally on user events)
tokenManager.updateUserActivity();
```

### 2. SessionExpirationDialog Component

A React component that:
- Displays a countdown timer
- Shows a progress bar indicating time remaining
- Provides options to extend session or log out
- Handles session extension seamlessly
- Implemented using Mantine UI components

### 3. AuthContext Integration

The `AuthContext` listens for token events and:
- Shows the dialog when appropriate
- Handles session extension requests
- Manages user authentication state
- Refreshes tokens proactively

### 4. Device Type Detection

The system detects device types based on user agent strings:
- Desktop: Standard computers
- Mobile: Smartphones
- Tablet: iPads and other tablet devices
- Unknown: Fallback for unusual devices

## Security Considerations

1. **Shorter lifetimes for higher-risk scenarios**
   - Mobile devices have shorter lifetimes than desktops
   - Unknown devices have the shortest standard lifetimes
   - Inactive users have accelerated token expiration

2. **Activity monitoring**
   - Inactive users may have tokens refreshed more aggressively
   - Extended inactivity may trigger additional validation

3. **Explicit user consent**
   - "Remember Me" must be explicitly selected
   - Users are notified when sessions are about to expire
   - Session extension requires explicit user action

## Implementation Details

### User Activity Tracking

```typescript
// User activity is tracked via browser events
const activityEvents = [
  'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart',
  'click', 'keydown', 'DOMMouseScroll', 'mousewheel'
];

// Activity state is synced across tabs
localStorage.setItem(USER_ACTIVITY_KEY, timestamp);
```

### Token Refresh Logic

```typescript
// Refresh threshold is adjusted based on user activity
let refreshThreshold = this.config.refreshThreshold; // Default: 75%
if (this.isUserInactive()) {
  refreshThreshold = 0.6; // More aggressive: 60%
}

const refreshTime = tokenLifetime * refreshThreshold;
```

### Backend Integration

The token refresh API now receives additional context to help adjust token lifetimes:

```typescript
// Data sent with refresh requests
const requestBody = {
  deviceType: this.deviceType,
  rememberMe: this.rememberMe,
  inactiveTime: this.getTimeSinceLastActivity() / 1000
};
```

## Configuration

Token expiration settings can be configured by modifying the TokenExpirationConfig:

```typescript
const customExpirationConfig: TokenExpirationConfig = {
  desktop: {
    standard: '1h',     // 1 hour
    rememberMe: '14d'   // 14 days
  },
  // ...other device types
};

// Initialize TokenManager with custom config
const tokenManager = TokenManager.getInstance(undefined, customExpirationConfig);
``` 