# Update .env and Create Admin Users
param(
    [string]$MongoURI = ""
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update .env and Create Admin Users" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrWhiteSpace($MongoURI)) {
    Write-Host "Please provide MongoDB connection string from Render.com" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get it:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Click your service: inkline-printing-system" -ForegroundColor White
    Write-Host "3. Go to Environment tab" -ForegroundColor White
    Write-Host "4. Find MONGODB_URI and copy it" -ForegroundColor White
    Write-Host ""
    $MongoURI = Read-Host "Paste MongoDB Connection String here"
}

if ([string]::IsNullOrWhiteSpace($MongoURI)) {
    Write-Host "MongoDB connection string is required!" -ForegroundColor Red
    exit 1
}

# Ensure database name is included
if ($MongoURI -notlike "*/inkline*") {
    if ($MongoURI -like "*?*") {
        $MongoURI = $MongoURI -replace "\?", "/inkline?"
    } else {
        $MongoURI = $MongoURI + "/inkline"
    }
}

# Update .env file
Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Yellow
$envContent = "MONGODB_URI=$MongoURI"
$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline
Write-Host "✅ .env file updated" -ForegroundColor Green

# Run seed script
Write-Host ""
Write-Host "Running seed script to create admin users..." -ForegroundColor Yellow
Write-Host ""
node run-seed.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Admin users created successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to create admin users. Check the error above." -ForegroundColor Red
}

