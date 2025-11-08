# Google Cloud Deployment Guide
## InkLine Smart Printing System - Cloud Run Deployment

This guide will walk you through deploying your InkLine web application to Google Cloud Platform using Cloud Run.

---

## 📋 Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud SDK**: Install from [cloud.google.com/sdk](https://cloud.google.com/sdk)
3. **Node.js 18+**: Already installed for development
4. **Docker**: Optional, for local testing
5. **Domain Name**: Optional, but recommended (e.g., from GoDaddy)

---

## 🚀 Quick Start (Step-by-Step)

### Step 1: Set Up Google Cloud Project

1. **Create a new project**:
   ```bash
   # Login to Google Cloud
   gcloud auth login
   
   # Create a new project (replace with your project ID)
   gcloud projects create inkline-printing --name="InkLine Printing System"
   
   # Set the project as active
   gcloud config set project inkline-printing
   ```

2. **Enable required APIs**:
   ```bash
   # Enable Cloud Run API
   gcloud services enable run.googleapis.com
   
   # Enable Cloud Build API
   gcloud services enable cloudbuild.googleapis.com
   
   # Enable Container Registry API
   gcloud services enable containerregistry.googleapis.com
   
   # Enable Secret Manager API
   gcloud services enable secretmanager.googleapis.com
   ```

3. **Enable billing** (if not already enabled):
   - Go to [Console](https://console.cloud.google.com/billing)
   - Link a billing account to your project

---

### Step 2: Set Up MongoDB Atlas (Recommended)

Since Cloud Run uses ephemeral storage, use MongoDB Atlas for persistent data:

1. **Create MongoDB Atlas account**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free tier (M0 cluster)

2. **Create a cluster**:
   - Choose "FREE" tier
   - Select a cloud provider (Google Cloud recommended)
   - Choose region closest to your Cloud Run region
   - Create cluster

3. **Configure database access**:
   - Go to "Database Access"
   - Create a database user (save username and password)
   - Set network access to allow all IPs (0.0.0.0/0) for now

4. **Get connection string**:
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority`

---

### Step 3: Set Up Google Cloud Secrets

Store sensitive environment variables in Secret Manager:

1. **Create secrets**:
   ```bash
   # JWT Secret (generate a random string)
   echo -n "your-super-secret-jwt-key-change-this" | gcloud secrets create JWT_SECRET --data-file=-
   
   # MongoDB URI
   echo -n "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority" | gcloud secrets create MONGODB_URI --data-file=-
   
   # Gmail credentials
   echo -n "your-email@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-
   echo -n "your-app-password" | gcloud secrets create EMAIL_PASS --data-file=-
   
   # Client URL (your domain, update after deployment)
   echo -n "https://your-domain.com" | gcloud secrets create CLIENT_URL --data-file=-
   ```

2. **Grant Cloud Run access to secrets**:
   ```bash
   # Get your project number
   PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
   
   # Grant Secret Manager Secret Accessor role
   gcloud secrets add-iam-policy-binding JWT_SECRET \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding MONGODB_URI \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding EMAIL_USER \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding EMAIL_PASS \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding CLIENT_URL \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

---

### Step 4: Build and Deploy

#### Option A: Using Cloud Build (Recommended)

1. **Submit build to Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

   This will:
   - Build your Docker image
   - Push it to Container Registry
   - Deploy to Cloud Run
   - Configure secrets automatically

#### Option B: Manual Deployment

1. **Build Docker image locally** (optional, for testing):
   ```bash
   docker build -t gcr.io/inkline-printing/inkline-app .
   ```

2. **Push to Container Registry**:
   ```bash
   docker push gcr.io/inkline-printing/inkline-app
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy inkline-app \
     --image gcr.io/inkline-printing/inkline-app \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10 \
     --set-env-vars NODE_ENV=production \
     --set-secrets MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest,CLIENT_URL=CLIENT_URL:latest
   ```

---

### Step 5: Get Your Application URL

After deployment, Cloud Run will provide a URL:

```bash
# Get the service URL
gcloud run services describe inkline-app --region us-central1 --format="value(status.url)"
```

Example output: `https://inkline-app-xxxxx-uc.a.run.app`

**Update CLIENT_URL secret** with this URL:
```bash
echo -n "https://inkline-app-xxxxx-uc.a.run.app" | gcloud secrets versions add CLIENT_URL --data-file=-
```

Then redeploy to apply the change.

---

### Step 6: Configure Custom Domain (Optional)

1. **Map custom domain**:
   ```bash
   gcloud run domain-mappings create \
     --service inkline-app \
     --domain your-domain.com \
     --region us-central1
   ```

2. **Update DNS records** (in your domain registrar):
   - Add a CNAME record pointing to the Cloud Run domain mapping
   - Follow the instructions provided by the command output

3. **Update CLIENT_URL secret**:
   ```bash
   echo -n "https://your-domain.com" | gcloud secrets versions add CLIENT_URL --data-file=-
   ```

4. **Redeploy** to apply changes

---

## 🔧 Configuration

### Environment Variables

All sensitive variables are stored in Secret Manager. The following are set automatically:

- `NODE_ENV=production`
- `PORT=8080` (Cloud Run sets this automatically)
- `MONGODB_URI` (from Secret Manager)
- `JWT_SECRET` (from Secret Manager)
- `EMAIL_USER` (from Secret Manager)
- `EMAIL_PASS` (from Secret Manager)
- `CLIENT_URL` (from Secret Manager)

### Update Client Configuration

Update `client/.env.production` (create if doesn't exist):
```env
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

Rebuild and redeploy after updating.

---

## 📁 File Storage (Important)

**Current Setup**: Files are stored in ephemeral storage (will be lost on container restart)

**Recommended**: Migrate to Cloud Storage for persistent file storage

### Quick Fix for Now:
- Files will persist during the container's lifetime
- For production, implement Cloud Storage (see "Future Improvements" below)

---

## 🔄 Updating Your Application

### Automatic Deployment (Using Cloud Build)

1. **Push changes to Git**:
   ```bash
   git add .
   git commit -m "Update application"
   git push
   ```

2. **Trigger Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Manual Update

1. **Rebuild and redeploy**:
   ```bash
   gcloud builds submit --tag gcr.io/inkline-printing/inkline-app
   gcloud run deploy inkline-app --image gcr.io/inkline-printing/inkline-app --region us-central1
   ```

---

## 🧪 Testing

### Test Health Endpoint

```bash
curl https://your-app-url.run.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Test API Endpoint

```bash
curl https://your-app-url.run.app/api/auth/me
```

---

## 📊 Monitoring

### View Logs

```bash
# Stream logs
gcloud run services logs read inkline-app --region us-central1 --follow

# View recent logs
gcloud run services logs read inkline-app --region us-central1 --limit 50
```

### Cloud Console

- **Cloud Run**: [Console](https://console.cloud.google.com/run)
- **Logs**: [Cloud Logging](https://console.cloud.google.com/logs)
- **Metrics**: [Cloud Monitoring](https://console.cloud.google.com/monitoring)

---

## 💰 Cost Estimation

### Free Tier (First 90 Days)
- **Cloud Run**: 2 million requests/month free
- **Cloud Build**: 120 build-minutes/day free
- **Container Registry**: 0.5 GB storage free
- **Secret Manager**: First 6 secrets free

### After Free Tier
- **Cloud Run**: ~$0.40 per million requests
- **Cloud Build**: ~$0.003 per build-minute
- **Container Registry**: ~$0.026 per GB/month
- **Secret Manager**: ~$0.06 per secret/month

**Estimated Monthly Cost**: $5-20 (depending on traffic)

---

## 🚨 Troubleshooting

### Issue: Application won't start

**Check logs**:
```bash
gcloud run services logs read inkline-app --region us-central1
```

**Common issues**:
- Missing environment variables → Check Secret Manager
- MongoDB connection failed → Verify MongoDB URI and network access
- Port binding error → Ensure using PORT env var (8080)

### Issue: CORS errors

**Solution**: Update CLIENT_URL secret with correct domain

### Issue: Socket.IO not working

**Solution**: Cloud Run supports WebSockets, but ensure:
- CORS is properly configured
- Client URL matches exactly
- Socket.IO client connects to the correct URL

### Issue: Files not persisting

**Solution**: Implement Cloud Storage (see "Future Improvements")

---

## 🔮 Future Improvements

### 1. Cloud Storage for File Uploads

Replace local file storage with Cloud Storage:

```javascript
// Install: npm install @google-cloud/storage multer-gcs
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('your-bucket-name');
```

### 2. Cloud CDN

Enable Cloud CDN for static assets:
```bash
gcloud compute backend-services create inkline-backend
gcloud compute url-maps create inkline-url-map --default-service inkline-backend
```

### 3. Custom Domain with SSL

Already supported via Cloud Run domain mappings (automatic SSL)

### 4. Auto-scaling Configuration

Adjust in `cloudbuild.yaml`:
- `--min-instances`: Minimum running instances
- `--max-instances`: Maximum instances
- `--cpu`: CPU allocation
- `--memory`: Memory allocation

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)

---

## ✅ Deployment Checklist

- [ ] Google Cloud account created
- [ ] Project created and billing enabled
- [ ] Required APIs enabled
- [ ] MongoDB Atlas cluster created
- [ ] Secrets created in Secret Manager
- [ ] IAM permissions configured
- [ ] Dockerfile created and tested
- [ ] Application built and deployed
- [ ] Health endpoint tested
- [ ] API endpoints tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

---

## 🆘 Need Help?

If you encounter issues:

1. Check Cloud Run logs
2. Verify Secret Manager secrets
3. Test MongoDB connection
4. Review CORS configuration
5. Check Cloud Run service status

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Application URL**: _______________
**Domain**: _______________

---

**End of Deployment Guide**

