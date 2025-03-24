# Trading Journal Frontend

This is the frontend application for the Trading Journal platform, providing users with tools to track and analyze their trading activity.

## Features

- **User Authentication**: Secure login/registration with JWT, including two-factor authentication and email verification
- **Account Management**: Create and manage trading accounts with detailed transaction tracking
- **Trading Journal**: Log and analyze trades with detailed entry/exit information
- **Performance Analytics**: Visualize trading performance with charts and statistics
- **Dynamic Token Management**: Intelligent session handling with adaptive token expiration
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Framework**: React with TypeScript
- **Build System**: Vite
- **State Management**: React Context API
- **UI Components**: Mantine v7
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts

## Setup & Development

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/trading-journal.git

# Navigate to the frontend directory
cd trading-journal/frontend

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Documentation

The application includes several additional documentation files:

- [Email Verification System](./README-EMAIL-VERIFICATION.md) - Details about the email verification implementation
- [Token Expiration Handling](./README-TOKEN-EXPIRATION.md) - Information about dynamic token expiration and session management

## Environment Configuration

Create a `.env` file with the following variables:

```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Trading Journal
```

## Contributing

1. Follow the coding style and conventions used throughout the project
2. Write tests for new features
3. Make sure all tests pass before submitting a pull request
4. Update documentation as needed

## License

[MIT](LICENSE)
