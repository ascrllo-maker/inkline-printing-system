# Setup and Create Admin Users Script
Write-Host "`n🔧 Admin User Setup Script`n" -ForegroundColor Cyan

# Check if .env exists
if (Test-Path .env) {
    Write-Host "✅ .env file found" -ForegroundColor Green
    $useExisting = Read-Host "Use existing .env file? (y/n)"
    if ($useExisting -eq "y" -or $useExisting -eq "Y") {
        Write-Host "`n🚀 Running seed script with existing .env...`n" -ForegroundColor Yellow
        node server/scripts/seedUsers.js
        exit
    }
}

# Get MongoDB connection string
Write-Host "`n📝 MongoDB Connection String Setup`n" -ForegroundColor Yellow
Write-Host "You need your MongoDB connection string from Render.com or MongoDB Atlas.`n" -ForegroundColor White

Write-Host "To get your MongoDB connection string:" -ForegroundColor Cyan
Write-Host "  1. Go to Render.com Dashboard" -ForegroundColor White
Write-Host "  2. Go to your service -> Environment" -ForegroundColor White
Write-Host "  3. Copy the MONGODB_URI value`n" -ForegroundColor White

Write-Host "Or from MongoDB Atlas:" -ForegroundColor Cyan
Write-Host "  1. Go to MongoDB Atlas -> Connect" -ForegroundColor White
Write-Host "  2. Connect your application" -ForegroundColor White
Write-Host "  3. Copy the connection string`n" -ForegroundColor White

$mongoURI = Read-Host "Enter your MongoDB Connection String"

if ([string]::IsNullOrWhiteSpace($mongoURI)) {
    Write-Host "`n❌ MongoDB connection string is required!`n" -ForegroundColor Red
    exit 1
}

# Ensure database name is included
if ($mongoURI -notlike "*/inkline*") {
    if ($mongoURI -like "*?*") {
        $mongoURI = $mongoURI -replace "\?", "/inkline?"
    } else {
        $mongoURI = $mongoURI + "/inkline"
    }
}

# Create .env file
Write-Host "`n📄 Creating .env file...`n" -ForegroundColor Yellow
$envContent = "MONGODB_URI=$mongoURI"
$envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline
Write-Host "✅ .env file created`n" -ForegroundColor Green

# Run seed script
Write-Host "🚀 Running seed script to create admin users...`n" -ForegroundColor Yellow
node server/scripts/seedUsers.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Admin users created successfully!`n" -ForegroundColor Green
    Write-Host "📋 Admin Credentials:" -ForegroundColor Cyan
    Write-Host "  IT Admin: itadmin@test.com / password123" -ForegroundColor White
    Write-Host "  SSC Admin: sscadmin@test.com / password123`n" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Failed to create admin users. Check the error above." -ForegroundColor Red
    Write-Host ""
}

