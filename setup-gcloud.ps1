# Google Cloud Setup Script for InkLine Printing System
# This script automates Step 1: Google Cloud Project Setup

$ErrorActionPreference = "Stop"

# Find gcloud installation
$gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloudPath)) {
    $gcloudPath = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (-not (Test-Path $gcloudPath)) {
        Write-Host "❌ Error: Google Cloud SDK not found. Please install it first." -ForegroundColor Red
        Write-Host "Installation guide: INSTALL_GCLOUD_SDK.md" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Found Google Cloud SDK at: $gcloudPath" -ForegroundColor Green
Write-Host ""

# Check if user is authenticated
Write-Host "📋 Checking authentication..." -ForegroundColor Cyan
$authCheck = & $gcloudPath auth list --filter="status:ACTIVE" --format="value(account)" 2>&1

if ($authCheck -match "ERROR" -or -not $authCheck) {
    Write-Host "⚠️  Not authenticated. Please login..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This will open your browser for authentication." -ForegroundColor White
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    & $gcloudPath auth login
    Write-Host ""
}

# Get or create project
Write-Host ""
Write-Host "📦 Setting up Google Cloud Project..." -ForegroundColor Cyan
Write-Host ""

# Check if project already exists
$currentProject = & $gcloudPath config get-value project 2>&1

if ($currentProject -match "ERROR" -or -not $currentProject -or $currentProject -eq "(unset)") {
    Write-Host "Creating new project: inkline-printing" -ForegroundColor Yellow
    & $gcloudPath projects create inkline-printing --name="InkLine Printing System" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Project created successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Project might already exist or there was an error." -ForegroundColor Yellow
        Write-Host "Continuing with existing project..." -ForegroundColor Gray
    }
    
    # Set the project
    & $gcloudPath config set project inkline-printing
    Write-Host "✅ Project set to: inkline-printing" -ForegroundColor Green
} else {
    Write-Host "Current project: $currentProject" -ForegroundColor Green
    Write-Host ""
    $response = Read-Host "Do you want to create a new project 'inkline-printing'? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        & $gcloudPath projects create inkline-printing --name="InkLine Printing System" 2>&1 | Out-Null
        & $gcloudPath config set project inkline-printing
        Write-Host "✅ Project set to: inkline-printing" -ForegroundColor Green
    } else {
        Write-Host "Using existing project: $currentProject" -ForegroundColor Green
    }
}

# Get current project
$projectId = & $gcloudPath config get-value project

Write-Host ""
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Cyan
Write-Host ""

$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com",
    "secretmanager.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..." -ForegroundColor Gray
    & $gcloudPath services enable $api --project=$projectId 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $api enabled" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $api might already be enabled" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Step 1 Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Project ID: $projectId" -ForegroundColor White
Write-Host "  APIs Enabled: ✅" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Set up MongoDB Atlas (Step 2)" -ForegroundColor White
Write-Host "  2. Create secrets (Step 3)" -ForegroundColor White
Write-Host "  3. Deploy application (Step 4)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: You can now use 'gcloud' command directly in a new terminal!" -ForegroundColor Cyan
