# Authentication Testing Instructions

This document provides instructions for testing the updated authentication middleware in the Trading Journal application.

## Prerequisites
- Node.js installed
- Backend server running (`npm run dev` in the backend directory)
- Frontend application running (`npm run dev` in the frontend directory)

## Test Scripts

We've created two test scripts to verify the authentication middleware:

1. `test-auth.js` - Tests access to admin routes with authentication
2. `test-user-route.js` - Tests user profile access and admin-only endpoints

## Setup

1. Install dependencies:
   ```
   npm install axios
   ```

2. Update credentials in the test files:
   - Open `test-auth.js` and `test-user-route.js`
   - Replace `your_password_here` with your actual password for the email `phyomyatoo.myanmar.1999@gmail.com`

## Running Tests

### Using the Provided Scripts

We've created convenient scripts to run all tests in sequence:

1. For Windows PowerShell:
   ```
   .\run-auth-tests.ps1
   ```

2. For Unix/Linux/Mac:
   ```bash
   chmod +x run-auth-tests.sh
   ./run-auth-tests.sh
   ```

These scripts will:
- Check and install the required dependencies
- Remind you to update your credentials
- Run both test scripts in sequence

### Running Tests Manually

Alternatively, you can run the tests individually:

```bash
# For testing admin routes authentication
node test-auth.js

# For testing user routes authentication
node test-user-route.js
```

You can also use the provided test-package.json:

```bash
# Copy the test package.json
cp test-package.json package.json

# Install dependencies
npm install

# Run tests
npm run test-auth
npm run test-user
```

## Expected Results

### test-auth.js
- If you have admin privileges:
  - You should see "Successfully accessed protected endpoint!" with a list of locked accounts
- If you don't have admin privileges:
  - You should see an error message about unauthorized access

### test-user-route.js
- You should see "Successfully accessed user profile endpoint!" with your user information
- For the admin endpoint test:
  - If you have admin privileges, you should see a list of users
  - If you don't have admin privileges, you should see an error about unauthorized access

## Troubleshooting

- If login fails, verify your credentials are correct
- If endpoints return 401 errors, verify that:
  - Your token is valid
  - The server is running
  - The authentication middleware is properly implemented
- If endpoints return 403 errors, this indicates the authentication is working, but you don't have the required role permissions 