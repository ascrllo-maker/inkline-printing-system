@echo off
REM Google Cloud Deployment Script for InkLine Printing System (Windows)
REM This script automates the deployment process to Cloud Run

echo 🚀 Starting InkLine Deployment to Google Cloud Run...

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: gcloud CLI is not installed.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Get project ID
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i

if "%PROJECT_ID%"=="" (
    echo ❌ Error: No Google Cloud project set.
    echo Please run: gcloud config set project YOUR_PROJECT_ID
    exit /b 1
)

echo 📦 Project ID: %PROJECT_ID%

REM Build and deploy
echo 🔨 Building and deploying application...

REM Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml

if %ERRORLEVEL% EQU 0 (
    echo ✅ Deployment complete!
    echo.
    echo 📋 Next steps:
    echo 1. Get your service URL:
    echo    gcloud run services describe inkline-app --region us-central1 --format="value(status.url)"
    echo.
    echo 2. Update CLIENT_URL secret with your service URL
    echo 3. Test your application at the URL above
    echo.
    echo 📚 For more information, see GOOGLE_CLOUD_DEPLOYMENT_GUIDE.md
) else (
    echo ❌ Deployment failed. Please check the errors above.
    exit /b 1
)

