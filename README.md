# Trading Journal Application

A full-stack application for tracking and analyzing trading performance, built with Node.js, Express, React, and TypeScript.

## Features

- 📊 Track trades and analyze performance
- 🔒 Secure authentication and authorization
- 📈 Advanced analytics and reporting
- 📱 Responsive web interface
- 📝 Journal entries for trade documentation
- 🔍 Search and filter capabilities
- 📊 Performance metrics and statistics

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- MongoDB with Mongoose
- JWT Authentication
- Zod for validation
- Jest for testing
- Swagger for API documentation

### Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- React Query
- React Hook Form
- React Router

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trading-journal.git
cd trading-journal
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:

Create a `.env` file in the backend directory:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/trading-journal
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:3000/api
```

4. Start the development servers:

```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend server (from frontend directory)
npm run dev
```

The backend API will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

## API Documentation

API documentation is available at `http://localhost:3000/api-docs` when running the development server.

## Database Schema

### User
- `_id`: ObjectId
- `email`: String (unique)
- `password`: String (hashed)
- `firstName`: String
- `lastName`: String
- `role`: String (enum: ['user', 'admin'])
- `isActive`: Boolean
- `lastLogin`: Date
- `createdAt`: Date
- `updatedAt`: Date

### Trade
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `symbol`: String
- `type`: String (enum: ['buy', 'sell'])
- `entry`: Number
- `exit`: Number
- `quantity`: Number
- `date`: Date
- `profit`: Number
- `notes`: String (optional)
- `tags`: [String] (optional)
- `createdAt`: Date
- `updatedAt`: Date

### Analysis
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `tradeId`: ObjectId (ref: Trade)
- `metrics`: Object
  - `riskRewardRatio`: Number
  - `winRate`: Number
  - `profitFactor`: Number
  - `averageWin`: Number
  - `averageLoss`: Number
- `period`: Object
  - `start`: Date
  - `end`: Date
- `createdAt`: Date
- `updatedAt`: Date

### Account
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `balance`: Number
- `currency`: String
- `broker`: String
- `isActive`: Boolean
- `createdAt`: Date
- `updatedAt`: Date

### JournalEntry
- `_id`: ObjectId
- `userId`: ObjectId (ref: User)
- `tradeId`: ObjectId (ref: Trade, optional)
- `title`: String
- `content`: String
- `mood`: String (enum: ['positive', 'neutral', 'negative'])
- `tags`: [String]
- `createdAt`: Date
- `updatedAt`: Date

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- XSS prevention
- HTTP security headers
- Request validation
- Input sanitization
- Error handling middleware

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.