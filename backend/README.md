# Trading Journal Backend

Backend API for the Trading Journal application with AI analysis capabilities.

## Features

- User authentication (register/login)
- Trade management
- Journal entries
- AI-powered analysis
- File uploads for trade screenshots

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/trading-journal
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=uploads
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user

### Trades (Protected)
- GET /api/trades - Get all trades
- POST /api/trades - Create a new trade
- GET /api/trades/:id - Get a specific trade
- PUT /api/trades/:id - Update a trade
- DELETE /api/trades/:id - Delete a trade

### Journal (Protected)
- GET /api/journal - Get all journal entries
- POST /api/journal - Create a new journal entry
- GET /api/journal/:id - Get a specific journal entry
- PUT /api/journal/:id - Update a journal entry
- DELETE /api/journal/:id - Delete a journal entry

### Analysis (Protected)
- GET /api/analysis - Get AI analysis of trading patterns
- GET /api/analysis/insights - Get AI-generated insights
- GET /api/analysis/predictions - Get trade predictions

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Testing

### Running Tests

To run all tests:

```bash
npm test
```

To run tests with code coverage:

```bash
npm test -- --coverage
```

To run specific test files:

```bash
npm test -- -t "controllers"  # Run controller tests
npm test -- -t "services"     # Run service tests
```

### Type-Safe Testing

We've implemented a robust type-safe testing approach to eliminate the need for `@ts-nocheck` directives while maintaining proper TypeScript type safety. This approach:

1. Provides type-safe mock implementations for Mongoose models and repositories
2. Supports chainable query methods (like `find().sort().limit().lean()`)
3. Includes interfaces that match the signatures of the actual implementations

To run tests using this approach:

```bash
# Run all tests with type-safe mocking
npm run test:typed

# Run only service tests with type-safe mocking
npm run test:services

# Run only controller tests with type-safe mocking
npm run test:controllers
```

For more details on the type-safe testing approach, see the documentation in [src/__tests__/README.md](src/__tests__/README.md).

### Testing Utilities

The project includes specialized testing utilities to help with TypeScript and Mongoose model mocking:

- **Mock Factories** - Create properly typed mocks for repositories and models
- **Test Setup Helpers** - Simplify setting up test data and mocks
- **Chainable Query Mocks** - Properly emulate Mongoose's fluent API

### Test Coverage

Current test coverage summary (as of last update):

- Controllers: 100% coverage
- Services:
  - StatisticsService: 76.37% coverage
  - AnalysisService: 45.68% coverage
- Overall: 35.99% coverage (up from 17.36%)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC 