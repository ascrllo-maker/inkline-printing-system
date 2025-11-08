#!/bin/bash

# Google Cloud Deployment Script for InkLine Printing System
# This script automates the deployment process to Cloud Run

set -e

echo "🚀 Starting InkLine Deployment to Google Cloud Run..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project set."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📦 Project ID: $PROJECT_ID"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with Google Cloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Build and deploy
echo "🔨 Building and deploying application..."

# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your service URL:"
echo "   gcloud run services describe inkline-app --region us-central1 --format=\"value(status.url)\""
echo ""
echo "2. Update CLIENT_URL secret with your service URL"
echo "3. Test your application at the URL above"
echo ""
echo "📚 For more information, see GOOGLE_CLOUD_DEPLOYMENT_GUIDE.md"

