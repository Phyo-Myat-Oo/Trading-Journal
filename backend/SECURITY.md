# Security Measures

This document outlines the security measures implemented in the Trading Journal application:

## Authentication and Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting for login attempts
- Account lockout after multiple failed login attempts
- Progressive lockout system:
  - First lockout: 15 minutes
  - Second lockout: 30 minutes
  - Third+ lockout: 60 minutes with potential admin intervention
- Security notifications for account lockout
- Session management

## Data Validation and Sanitization
- Input validation using Zod schemas
- MongoDB query sanitization with express-mongo-sanitize
- XSS protection with @avanzu/sanitize-xss
- HTTP Parameter Pollution prevention

## HTTP Security
- Helmet for secure HTTP headers
- Comprehensive Content Security Policy (CSP) with environment-specific rules
- Strict Transport Security (HSTS) with preload support
- Cross-Origin Resource Policy (CORP) to prevent resource theft
- Cross-Origin Opener Policy (COOP) to protect against tab-nabbing attacks
- Cross-Origin Embedder Policy (COEP) to enhance site isolation
- Permissions-Policy to restrict browser feature usage
- CORS configuration with strict rules
- Request timeout protection
- X-Content-Type-Options to prevent MIME-type sniffing
- Referrer-Policy to control information in referrer header

## Rate Limiting
- Multiple layers of rate limiting protection:
  - Global IP-based rate limiting regardless of endpoint
  - Route-based rate limiting with IP + user agent tracking
  - Stricter rate limiting for authentication endpoints
  - Rate limiting for API-specific endpoints
  - Token refresh rate limiting
- Custom rate limit violation response with Retry-After headers
- Logging of rate limit violations for security monitoring

## Error Handling
- Global error handling middleware
- Sanitized error messages in production
- Logging of security events
- Custom error classes for different types of errors

## Best Practices
- Environment variables for sensitive data
- Secure password reset flow
- User account protection with automatic lockout
- Regular dependency updates
- Code linting and security checks

## Security Monitoring

- Error logging for suspicious activities
- Request logging for audit trails
- Rate limit breach notifications
- Account lockout notifications
- Administrative activity logging
- Comprehensive admin dashboard for security monitoring

## Administrative Security Controls

The Trading Journal includes powerful administrative security controls:

- **User Management**: Administrators can view, modify, and manage user accounts.
- **Account Lockout Controls**: Admins can unlock accounts and reset lockout history for users who have been locked out.
- **Progressive Lockout Management**: View accounts with multiple lockouts that may require special attention.
- **Role-Based Access Control**: Assign and revoke admin privileges to ensure proper access control.
- **Audit Logs**: All admin actions are logged with details of the action, admin user, timestamp, and IP address.
- **System Statistics**: Admins can monitor system usage, locked accounts, and active users to identify potential issues.

## Regular Security Tasks

- Dependency updates to patch vulnerabilities
- Code reviews with security focus
- Security testing

## Security Reporting

If you discover a security issue, please report it by sending an email to [security@example.com](mailto:security@example.com). Please do not disclose security bugs publicly until they have been handled by the security team.

## License

This security documentation is part of the Trading Journal application and is covered by its license terms. 