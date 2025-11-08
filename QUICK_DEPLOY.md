# Quick Deployment Guide - Google Cloud Run

## 🚀 Fastest Way to Deploy (5 Steps)

### Step 1: Install Google Cloud SDK
```bash
# Download from: https://cloud.google.com/sdk/docs/install
# Or use package manager:
# Windows: choco install gcloudsdk
# Mac: brew install google-cloud-sdk
# Linux: Follow installation guide
```

### Step 2: Set Up Google Cloud
```bash
# Login
gcloud auth login

# Create project
gcloud projects create inkline-printing --name="InkLine Printing"

# Set project
gcloud config set project inkline-printing

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com
```

### Step 3: Set Up MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create M0 (free) cluster
4. Get connection string (replace password)
5. Allow all IPs (0.0.0.0/0) in network access

### Step 4: Create Secrets
```bash
# JWT Secret (use a random string)
echo -n "your-super-secret-jwt-key-12345" | gcloud secrets create JWT_SECRET --data-file=-

# MongoDB URI (replace with your connection string)
echo -n "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority" | gcloud secrets create MONGODB_URI --data-file=-

# Email (your Gmail)
echo -n "your-email@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-

# App Password (Gmail app password)
echo -n "your-app-password" | gcloud secrets create EMAIL_PASS --data-file=-

# Client URL (will update after deployment)
echo -n "https://placeholder.com" | gcloud secrets create CLIENT_URL --data-file=-

# Grant permissions
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
for SECRET in JWT_SECRET MONGODB_URI EMAIL_USER EMAIL_PASS CLIENT_URL; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Step 5: Deploy
```bash
# Windows
deploy.bat

# Mac/Linux
chmod +x deploy.sh
./deploy.sh

# Or manually:
gcloud builds submit --config cloudbuild.yaml
```

### Step 6: Get Your URL and Update
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe inkline-app --region us-central1 --format="value(status.url)")

# Update CLIENT_URL secret
echo -n "$SERVICE_URL" | gcloud secrets versions add CLIENT_URL --data-file=-

# Redeploy to apply changes
gcloud builds submit --config cloudbuild.yaml
```

### Step 7: Test
Open your browser and go to: `https://your-service-url.run.app`

---

## ✅ That's It!

Your application is now live on the internet!

### What You Get:
- ✅ HTTPS URL (automatically)
- ✅ Auto-scaling
- ✅ Free tier available
- ✅ Production-ready

### Next Steps:
1. Test your application
2. Set up custom domain (optional)
3. Monitor usage in Cloud Console
4. Set up Cloud Storage for file persistence (recommended)

---

## 🆘 Troubleshooting

### Can't connect to MongoDB?
- Check MongoDB Atlas network access (allow all IPs)
- Verify connection string format
- Check username/password

### CORS errors?
- Update CLIENT_URL secret with correct URL
- Redeploy after updating

### Application won't start?
- Check logs: `gcloud run services logs read inkline-app --region us-central1`
- Verify all secrets are created
- Check MongoDB connection

---

## 📚 Full Guide

For detailed instructions, see: `GOOGLE_CLOUD_DEPLOYMENT_GUIDE.md`

