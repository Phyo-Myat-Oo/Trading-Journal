# Trading Journal Backend Developer Guide

This guide provides a detailed overview of the Trading Journal backend architecture, code structure, and development workflows for contributors and maintainers.

## Architecture Overview

The Trading Journal backend follows a layered architecture pattern:

```
Client Request → Routes → Controllers → Services → Repositories → Database
```

### Key Components

1. **Routes**: Define API endpoints and validation rules
2. **Controllers**: Handle HTTP requests/responses and invoke services
3. **Services**: Implement business logic and orchestrate data operations
4. **Repositories**: Encapsulate database operations
5. **Models**: Define data schemas and document structure
6. **Middleware**: Provide cross-cutting concerns (auth, logging, etc.)
7. **Utilities**: Shared helper functions and tools

## Project Structure

```
backend/
├── src/
│   ├── config/           # Application configuration
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Custom middleware
│   ├── models/           # Mongoose schemas/models
│   ├── repositories/     # Data access layer
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── utils/            # Helper utilities
│   ├── validators/       # Input validation schemas
│   ├── jobs/             # Background job processors
│   ├── types/            # TypeScript type definitions
│   ├── __tests__/        # Tests
│   ├── app.ts            # Express application setup
│   └── server.ts         # Server entry point
├── scripts/              # Utility scripts
├── uploads/              # File upload directory
└── ...                   # Config files
```

## Core Technologies

- **Node.js**: Runtime environment
- **Express**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM library
- **TypeScript**: Programming language
- **Jest**: Testing framework
- **Bull**: Job queue for background processing

## Data Models

### User

The core user model that handles authentication and profile information.

```typescript
interface IUser {
  username: string;
  email: string;
  password: string;
  isActive: boolean;
  preferences: {
    defaultAccount?: Types.ObjectId;
    currency: string;
    timeZone: string;
    analysisPeriod: string;
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}
```

### Trade

Represents a trading transaction with entry and exit details.

```typescript
interface ITrade {
  userId: Types.ObjectId;
  symbol: string;
  entryDate: Date;
  exitDate?: Date;
  entryPrice: number;
  exitPrice?: number;
  size: number;
  fees?: number;
  profitLoss?: number;
  notes?: string;
  screenshots?: string[];
  tags?: string[];
  accountId?: Types.ObjectId;
}
```

### JournalEntry

Tracks user reflections and observations about their trading.

```typescript
interface IJournalEntry {
  userId: Types.ObjectId;
  date: Date;
  content: string;
  mood: string;
  tags?: string[];
  tradeId?: Types.ObjectId;
}
```

### Account

Manages different trading accounts a user might have.

```typescript
interface IAccount {
  userId: Types.ObjectId;
  name: string;
  broker?: string;
  initialBalance: number;
  currentBalance: number;
  currency?: string;
  isActive: boolean;
}
```

### Analysis

Stores results of trading analysis operations.

```typescript
interface IAnalysis {
  userId: Types.ObjectId;
  tradeId: Types.ObjectId;
  type: AnalysisType;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    riskRewardRatio: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
  };
  data?: any;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}
```

### ScheduledJob

Manages recurring operations like automated analysis.

```typescript
interface IScheduledJob {
  userId: Types.ObjectId;
  name: string;
  type: string;
  schedule: string;
  params?: any;
  status: 'ACTIVE' | 'INACTIVE';
  lastRun?: Date;
  nextRun?: Date;
}
```

## Service Layer

The service layer contains the core business logic of the application.

### StatisticsService

Provides methods for calculating trading performance statistics:

- `calculateTradeStats`: Basic trade performance metrics
- `analyzeSymbolPerformance`: Statistics grouped by trading symbol
- `analyzeTimeOfDay`: Performance metrics by hour of day
- `analyzeDayOfWeek`: Performance metrics by day of week
- `calculateRiskMetrics`: Advanced risk assessment
- `analyzeJournalCorrelation`: Correlates journal entries with trade performance

### AnalysisService

Handles complex analysis of trading patterns:

- `generatePerformanceAnalysis`: Creates comprehensive performance reports
- `analyzePatterns`: Identifies recurring patterns in trading behavior
- `generateInsights`: Produces actionable insights based on trading data
- `purgeOldAnalyses`: Cleans up outdated analysis data

### QueueService

Manages background processing of analysis tasks:

- `addAnalysisJob`: Queues a new analysis task
- `processAnalysisQueue`: Worker function for processing analysis
- `monitorQueueHealth`: Monitors queue performance and errors

## Repository Layer

The repository layer abstracts database operations and provides a clean interface for the service layer.

### BaseRepository

Generic repository with common CRUD operations:

- `findById`: Retrieve by ID
- `findOne`: Find a single document
- `findAll`: Get multiple documents
- `create`: Create new document
- `update`: Update existing document
- `delete`: Remove document

### AnalysisRepository

Specialized repository for analysis operations:

- `findByUser`: Get analyses for a specific user
- `findByPeriod`: Get analyses for a time period
- `initializePending`: Create pending analysis
- `markCompleted`: Update analysis as completed
- `markFailed`: Mark analysis as failed
- `deleteOlderThan`: Remove analyses older than specified date

## Authentication

JWT-based authentication is implemented with the following workflow:

1. User registers or logs in
2. Server validates credentials and issues a JWT token
3. Client includes token in Authorization header
4. Server validates token in auth middleware
5. User information is attached to request object

### Authentication Middleware

```typescript
const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
};
```

## Error Handling

The application uses a centralized error handling middleware:

```typescript
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  // Handle different error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: err.errors,
        code: 'VALIDATION_ERROR',
        status: 400
      }
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    }
  });
};
```

## File Uploads

The application supports file uploads for trade screenshots:

1. Multer middleware handles multipart/form-data
2. Files are saved to the /uploads directory
3. File paths are stored in the trade document
4. Static file serving provides access to uploaded files

## Testing

The application uses Jest for testing with a focus on:

1. Unit tests for service methods
2. Integration tests for API endpoints
3. Repository mocks for database operations

See the [Testing Documentation](src/__tests__/README.md) for details on the type-safe testing approach.

## Development Workflow

1. **Setup**: Clone repository and install dependencies
   ```
   npm install
   ```

2. **Environment**: Set up environment variables in .env file

3. **Development Server**: Run with hot reloading
   ```
   npm run dev
   ```

4. **Testing**: Run tests
   ```
   npm test
   ```

5. **Linting**: Check code quality
   ```
   npm run lint
   ```

6. **Building**: Create production build
   ```
   npm run build
   ```

## Contributing Guidelines

1. **Branch Naming**: Use `feature/`, `bugfix/`, or `refactor/` prefixes
2. **Commit Messages**: Follow conventional commits format
3. **Pull Requests**: Include tests and documentation updates
4. **Code Style**: Maintain consistent style with ESLint rules

## Performance Considerations

- Use MongoDB indexes for frequently queried fields
- Implement pagination for list endpoints
- Use lean() for read-only MongoDB queries
- Cache expensive calculations
- Use background processing for analysis tasks 