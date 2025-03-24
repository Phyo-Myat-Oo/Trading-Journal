# PowerShell script to run authentication tests
Write-Host "Running authentication tests..." -ForegroundColor Green

# Check if axios is installed
if (-not (Test-Path "node_modules/axios")) {
    Write-Host "Installing axios..." -ForegroundColor Yellow
    npm install axios
}

# Reminder to update credentials
Write-Host "IMPORTANT: Make sure you've updated the credentials in test-auth.js and test-user-route.js" -ForegroundColor Yellow
Write-Host "Press any key to continue or Ctrl+C to cancel..." -ForegroundColor Yellow
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Run the auth test
Write-Host "`nRunning admin route authentication test..." -ForegroundColor Cyan
node test-auth.js

# Add a separator
Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

# Run the user route test
Write-Host "Running user route authentication test..." -ForegroundColor Cyan
node test-user-route.js

Write-Host "`nTests completed! Check the output above for results." -ForegroundColor Green
Write-Host "If you encountered any errors, please refer to AUTH_TEST_INSTRUCTIONS.md for troubleshooting." -ForegroundColor Yellow 