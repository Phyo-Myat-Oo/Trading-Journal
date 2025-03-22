# Trading Journal Backend API Documentation

The Trading Journal Backend provides a powerful REST API for managing trading activities, journal entries, account management, and AI-powered analysis. This document provides a comprehensive overview of all available endpoints, request parameters, and response structures.

## Table of Contents

1. [Authentication](#authentication)
2. [Trades](#trades)
3. [Journal Entries](#journal-entries)
4. [Accounts](#accounts)
5. [Analysis](#analysis)
6. [Statistics](#statistics)
7. [User Management](#user-management)
8. [Scheduled Jobs](#scheduled-jobs)

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3000/api/
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After logging in, you'll receive a token that must be included in subsequent requests in the Authorization header:

```
Authorization: Bearer <your_token>
```

### Endpoints

#### Register a new user

```
POST /auth/register
```

**Request Body:**
```json
{
  "username": "trader123",
  "email": "trader@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "username": "trader123",
    "email": "trader@example.com"
  }
}
```

#### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "trader@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "username": "trader123",
    "email": "trader@example.com"
  }
}
```

## Trades

Manage trading activities through these endpoints.

### Endpoints

#### Get all trades

```
GET /trades
```

**Query Parameters:**
- `page` (optional) - Page number for pagination
- `limit` (optional) - Number of items per page
- `sortBy` (optional) - Field to sort by (default: entryDate)
- `sortOrder` (optional) - Sort order (asc or desc)
- `symbol` (optional) - Filter by symbol
- `startDate` (optional) - Filter by entry date range start
- `endDate` (optional) - Filter by entry date range end
- `accountId` (optional) - Filter by account

**Response:**
```json
{
  "success": true,
  "count": 50,
  "trades": [
    {
      "_id": "60d5f8b8c9e4c62b3fc7c9e8",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "symbol": "AAPL",
      "entryDate": "2023-01-15T09:30:00Z",
      "exitDate": "2023-01-15T15:45:00Z",
      "entryPrice": 145.75,
      "exitPrice": 147.23,
      "size": 100,
      "profitLoss": 148,
      "fees": 10,
      "notes": "Breakout trade on earnings",
      "screenshots": ["https://example.com/screenshot1.jpg"]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Create a new trade

```
POST /trades
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "entryDate": "2023-01-15T09:30:00Z",
  "exitDate": "2023-01-15T15:45:00Z",
  "entryPrice": 145.75,
  "exitPrice": 147.23,
  "size": 100,
  "fees": 10,
  "notes": "Breakout trade on earnings",
  "accountId": "60d5f8b8c9e4c62b3fc7c9e8"
}
```

**Response:**
```json
{
  "success": true,
  "trade": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "symbol": "AAPL",
    "entryDate": "2023-01-15T09:30:00Z",
    "exitDate": "2023-01-15T15:45:00Z",
    "entryPrice": 145.75,
    "exitPrice": 147.23,
    "size": 100,
    "profitLoss": 148,
    "fees": 10,
    "notes": "Breakout trade on earnings"
  }
}
```

#### Get a specific trade

```
GET /trades/:id
```

**Response:**
```json
{
  "success": true,
  "trade": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "symbol": "AAPL",
    "entryDate": "2023-01-15T09:30:00Z",
    "exitDate": "2023-01-15T15:45:00Z",
    "entryPrice": 145.75,
    "exitPrice": 147.23,
    "size": 100,
    "profitLoss": 148,
    "fees": 10,
    "notes": "Breakout trade on earnings",
    "screenshots": ["https://example.com/screenshot1.jpg"]
  }
}
```

#### Update a trade

```
PUT /trades/:id
```

**Request Body:**
```json
{
  "exitPrice": 148.50,
  "exitDate": "2023-01-15T16:00:00Z",
  "notes": "Updated with final exit details"
}
```

**Response:**
```json
{
  "success": true,
  "trade": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "symbol": "AAPL",
    "entryDate": "2023-01-15T09:30:00Z",
    "exitDate": "2023-01-15T16:00:00Z",
    "entryPrice": 145.75,
    "exitPrice": 148.50,
    "size": 100,
    "profitLoss": 275,
    "fees": 10,
    "notes": "Updated with final exit details"
  }
}
```

#### Delete a trade

```
DELETE /trades/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Trade deleted successfully"
}
```

#### Upload trade screenshot

```
POST /trades/:id/screenshots
```

**Request Body:**
- Form data with file field named "screenshot"

**Response:**
```json
{
  "success": true,
  "trade": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "screenshots": ["https://example.com/screenshots/60d5f8b8c9e4c62b3fc7c9e8.jpg"]
  }
}
```

## Journal Entries

Track your trading journal entries with these endpoints.

### Endpoints

#### Get all journal entries

```
GET /journal
```

**Query Parameters:**
- `page` (optional) - Page number for pagination
- `limit` (optional) - Number of items per page
- `startDate` (optional) - Filter by date range start
- `endDate` (optional) - Filter by date range end
- `mood` (optional) - Filter by mood

**Response:**
```json
{
  "success": true,
  "count": 25,
  "entries": [
    {
      "_id": "60d5f8b8c9e4c62b3fc7c9e8",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "date": "2023-01-15T20:00:00Z",
      "content": "Today I followed my trading plan perfectly. Waited for confirmation before entering AAPL trade.",
      "mood": "Positive",
      "tags": ["discipline", "patience"]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Create a new journal entry

```
POST /journal
```

**Request Body:**
```json
{
  "date": "2023-01-15T20:00:00Z",
  "content": "Today I followed my trading plan perfectly. Waited for confirmation before entering AAPL trade.",
  "mood": "Positive",
  "tags": ["discipline", "patience"],
  "tradeId": "60d5f8b8c9e4c62b3fc7c9e8"
}
```

**Response:**
```json
{
  "success": true,
  "entry": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "date": "2023-01-15T20:00:00Z",
    "content": "Today I followed my trading plan perfectly. Waited for confirmation before entering AAPL trade.",
    "mood": "Positive",
    "tags": ["discipline", "patience"],
    "tradeId": "60d5f8b8c9e4c62b3fc7c9e8"
  }
}
```

#### Get, update, and delete endpoints

Similar patterns apply for retrieving, updating and deleting journal entries.

## Accounts

Manage trading accounts through these endpoints.

### Endpoints

#### Get all accounts

```
GET /accounts
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "_id": "60d5f8b8c9e4c62b3fc7c9e8",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "name": "Main Trading Account",
      "broker": "Interactive Brokers",
      "initialBalance": 10000,
      "currentBalance": 12500
    }
  ]
}
```

#### Create an account

```
POST /accounts
```

**Request Body:**
```json
{
  "name": "Main Trading Account",
  "broker": "Interactive Brokers",
  "initialBalance": 10000,
  "currentBalance": 10000
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "name": "Main Trading Account",
    "broker": "Interactive Brokers",
    "initialBalance": 10000,
    "currentBalance": 10000
  }
}
```

#### Update account balance

```
PUT /accounts/:id/balance
```

**Request Body:**
```json
{
  "currentBalance": 12500
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "currentBalance": 12500
  }
}
```

## Analysis

Get AI-powered analysis of your trading patterns and performance.

### Endpoints

#### Get performance analysis

```
GET /analysis/performance
```

**Query Parameters:**
- `startDate` (optional) - Analysis period start date
- `endDate` (optional) - Analysis period end date
- `accountId` (optional) - Filter by specific account

**Response:**
```json
{
  "success": true,
  "analysis": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "type": "PERFORMANCE",
    "period": {
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-01-31T23:59:59Z"
    },
    "data": {
      "totalTrades": 45,
      "winRate": 0.67,
      "profitFactor": 2.3,
      "averageWin": 250,
      "averageLoss": -125,
      "largestWin": 1250,
      "largestLoss": -750,
      "profitability": 5600
    }
  }
}
```

#### Get symbol analysis

```
GET /analysis/symbols
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "topPerformingSymbols": [
      {
        "symbol": "AAPL",
        "totalTrades": 12,
        "winRate": 0.75,
        "netProfit": 2400
      },
      {
        "symbol": "MSFT",
        "totalTrades": 8,
        "winRate": 0.62,
        "netProfit": 1100
      }
    ],
    "worstPerformingSymbols": [
      {
        "symbol": "META",
        "totalTrades": 5,
        "winRate": 0.2,
        "netProfit": -850
      }
    ]
  }
}
```

#### Get time-based analysis

```
GET /analysis/time
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "timeOfDay": [
      {
        "hour": 9,
        "totalTrades": 15,
        "winRate": 0.73,
        "netProfit": 1700
      },
      {
        "hour": 10,
        "totalTrades": 12,
        "winRate": 0.58,
        "netProfit": 950
      }
    ],
    "dayOfWeek": [
      {
        "day": "Monday",
        "totalTrades": 10,
        "winRate": 0.6,
        "netProfit": 850
      },
      {
        "day": "Tuesday",
        "totalTrades": 12,
        "winRate": 0.75,
        "netProfit": 1650
      }
    ]
  }
}
```

#### Generate trading insights

```
GET /analysis/insights
```

**Response:**
```json
{
  "success": true,
  "insights": [
    {
      "category": "PATTERN",
      "title": "Morning Breakout Success",
      "description": "You have a 75% win rate on morning breakout trades (9:30-10:30 AM). Consider focusing more on this strategy.",
      "strength": "HIGH",
      "relatedSymbols": ["AAPL", "AMZN", "TSLA"]
    },
    {
      "category": "WEAKNESS",
      "title": "Holding Overnight Risk",
      "description": "Trades held overnight have a 35% lower win rate than day trades. Consider reducing overnight exposure.",
      "strength": "MEDIUM"
    }
  ]
}
```

## Statistics

Get detailed statistics on trading performance.

### Endpoints

#### Get trade statistics

```
GET /statistics/trades
```

**Query Parameters:**
- `startDate` (optional) - Analysis period start date
- `endDate` (optional) - Analysis period end date
- `accountId` (optional) - Filter by specific account

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalTrades": 45,
    "winningTrades": 30,
    "losingTrades": 15,
    "winRate": 0.67,
    "profitFactor": 2.3,
    "averageReturn": 125,
    "averageWin": 250,
    "averageLoss": -125,
    "largestWin": 1250,
    "largestLoss": -750,
    "totalNetProfit": 5600,
    "totalGrossProfit": 7500,
    "totalGrossLoss": -1900,
    "expectancy": 125,
    "standardDeviation": 350,
    "sharpeRatio": 1.5,
    "sortinoRatio": 2.1,
    "maxDrawdown": -2000,
    "maxDrawdownPercentage": 0.15
  }
}
```

#### Get risk metrics

```
GET /statistics/risk
```

**Response:**
```json
{
  "success": true,
  "riskMetrics": {
    "dailyVaR": 450,
    "expectedShortfall": 650,
    "riskOfRuin": 0.05,
    "riskPerTrade": 0.025,
    "betaToMarket": 0.85,
    "kellyPercentage": 0.18
  }
}
```

## User Management

Manage user profiles and settings.

### Endpoints

#### Get user profile

```
GET /users/profile
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "username": "trader123",
    "email": "trader@example.com",
    "createdAt": "2023-01-01T00:00:00Z",
    "preferences": {
      "defaultAccount": "60d5f8b8c9e4c62b3fc7c9e8",
      "currency": "USD",
      "timeZone": "America/New_York",
      "analysisPeriod": "MONTHLY"
    }
  }
}
```

#### Update user profile

```
PUT /users/profile
```

**Request Body:**
```json
{
  "username": "toptrader123",
  "preferences": {
    "timeZone": "America/Los_Angeles"
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "username": "toptrader123",
    "preferences": {
      "defaultAccount": "60d5f8b8c9e4c62b3fc7c9e8",
      "currency": "USD",
      "timeZone": "America/Los_Angeles",
      "analysisPeriod": "MONTHLY"
    }
  }
}
```

## Admin Features

The Trading Journal includes advanced administration capabilities for system management, user administration, and security monitoring.

### Admin Dashboard Statistics

```
GET /api/admin/stats
```

**Response:**
```json
{
  "totalUsers": 125,
  "activeUsers": 87,
  "lockedAccounts": 3,
  "totalTrades": 5431,
  "tradesThisMonth": 342,
  "systemUptime": "15d 7h 23m"
}
```

### User Management

#### Get Locked User Accounts

```
GET /api/admin/locked-accounts
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "_id": "60d5f8b8c9e4c62b3fc7c9e8",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "failedLoginAttempts": 5,
      "accountLocked": true,
      "accountLockedUntil": "2023-09-15T14:30:00Z",
      "previousLockouts": 2,
      "lastLogin": "2023-09-14T10:15:00Z"
    }
  ]
}
```

#### Update User Role

```
PUT /api/users/:userId/role
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "User role updated successfully",
  "user": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  }
}
```

#### Unlock User Account

```
POST /api/auth/unlock-account
```

**Request Body:**
```json
{
  "userId": "60d5f8b8c9e4c62b3fc7c9e8",
  "resetLockoutHistory": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

### Admin Activity Logs

```
GET /api/admin/activity-logs
```

**Query Parameters:**
- `page` (optional) - Page number for pagination
- `limit` (optional) - Number of items per page

**Response:**
```json
{
  "logs": [
    {
      "id": "60d5f8b8c9e4c62b3fc7c9e8",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "userName": "Admin User",
      "action": "USER_UNLOCK",
      "details": "Unlocked account for user john@example.com (60d5f8b8c9e4c62b3fc7c9e8)",
      "timestamp": "2023-09-15T10:30:00Z",
      "ipAddress": "192.168.1.1"
    },
    {
      "id": "60d5f8b8c9e4c62b3fc7c9e9",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "userName": "Admin User",
      "action": "ROLE_UPDATE",
      "details": "Changed user jane@example.com (60d5f8b8c9e4c62b3fc7c9e7) role from user to admin",
      "timestamp": "2023-09-14T15:45:00Z",
      "ipAddress": "192.168.1.1"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

### Admin Actions

The system logs the following admin actions:

- `USER_UNLOCK` - When an admin unlocks a user account
- `USER_LOCK_RESET` - When an admin resets a user's lockout history
- `ROLE_UPDATE` - When an admin changes a user's role
- `USER_DELETE` - When an admin deletes a user account
- `USER_CREATE` - When an admin creates a new user account
- `USER_UPDATE` - When an admin updates a user's information
- `SYSTEM_SETTING_UPDATE` - When an admin changes system settings

## Scheduled Jobs

Configure and manage scheduled jobs for data processing.

### Endpoints

#### Get all scheduled jobs

```
GET /jobs
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "_id": "60d5f8b8c9e4c62b3fc7c9e8",
      "userId": "60d5f8b8c9e4c62b3fc7c9e8",
      "name": "Weekly Performance Analysis",
      "type": "ANALYSIS",
      "schedule": "0 0 * * 0",
      "status": "ACTIVE",
      "lastRun": "2023-01-15T00:00:00Z",
      "nextRun": "2023-01-22T00:00:00Z"
    }
  ]
}
```

#### Create a scheduled job

```
POST /jobs
```

**Request Body:**
```json
{
  "name": "Weekly Performance Analysis",
  "type": "ANALYSIS",
  "schedule": "0 0 * * 0",
  "params": {
    "analysisType": "PERFORMANCE",
    "emailResults": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "_id": "60d5f8b8c9e4c62b3fc7c9e8",
    "userId": "60d5f8b8c9e4c62b3fc7c9e8",
    "name": "Weekly Performance Analysis",
    "type": "ANALYSIS",
    "schedule": "0 0 * * 0",
    "status": "ACTIVE",
    "nextRun": "2023-01-22T00:00:00Z"
  }
}
```

## Error Responses

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "RESOURCE_NOT_FOUND",
    "status": 404
  }
}
```

Common error codes:
- `INVALID_CREDENTIALS` - Incorrect login credentials
- `VALIDATION_ERROR` - Invalid request data
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server-side error

## Rate Limiting

The API has rate limiting to prevent abuse:
- 100 requests per 15-minute window for most endpoints
- 10 requests per minute for authentication endpoints

When rate limit is exceeded, you'll receive:

```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED",
    "status": 429,
    "retryAfter": 350 // seconds until next request is allowed
  }
}
```

## Account Lockout

For enhanced security, the API implements account lockout after multiple failed login attempts:

- Accounts are locked after 5 consecutive failed login attempts
- Progressive lockout durations:
  - First lockout: 15 minutes
  - Second lockout: 30 minutes
  - Third and subsequent lockouts: 60 minutes
- After the third lockout, accounts may require administrator intervention to unlock
- Account owners are notified via email when their account is locked
- The lockout history is maintained between successful logins

When attempting to log into a locked account, you'll receive:

```json
{
  "success": false,
  "message": "Account is locked. Please try again in 15 minutes.",
  "isLocked": true
}
```

For accounts requiring administrator intervention:

```json
{
  "success": false,
  "message": "Account locked due to excessive failed login attempts. Please contact an administrator.",
  "isLocked": true,
  "requiresAdminUnlock": true
}
``` 