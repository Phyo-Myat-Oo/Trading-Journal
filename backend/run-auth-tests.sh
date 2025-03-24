#!/bin/bash

# Bash script to run authentication tests
echo -e "\e[32mRunning authentication tests...\e[0m"

# Check if axios is installed
if [ ! -d "node_modules/axios" ]; then
    echo -e "\e[33mInstalling axios...\e[0m"
    npm install axios
fi

# Reminder to update credentials
echo -e "\e[33mIMPORTANT: Make sure you've updated the credentials in test-auth.js and test-user-route.js\e[0m"
echo -e "\e[33mPress any key to continue or Ctrl+C to cancel...\e[0m"
read -n 1 -s

# Run the auth test
echo -e "\n\e[36mRunning admin route authentication test...\e[0m"
node test-auth.js

# Add a separator
echo -e "\n----------------------------------------\n"

# Run the user route test
echo -e "\e[36mRunning user route authentication test...\e[0m"
node test-user-route.js

echo -e "\n\e[32mTests completed! Check the output above for results.\e[0m"
echo -e "\e[33mIf you encountered any errors, please refer to AUTH_TEST_INSTRUCTIONS.md for troubleshooting.\e[0m" 