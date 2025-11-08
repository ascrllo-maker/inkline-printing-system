# Deploy to Render.com - Free Forever Hosting

## 🎯 Why Render.com?

- ✅ **Free Forever**: No credit card required (for free tier)
- ✅ **Node.js Support**: Full Express.js support
- ✅ **Easy Setup**: Deploy from GitHub in minutes
- ✅ **SSL/HTTPS**: Automatic, free
- ✅ **Custom Domain**: Supported
- ⚠️ **Limitation**: Spins down after 15 minutes of inactivity

---

## 📋 Prerequisites

1. **GitHub Account**: Free account at github.com
2. **MongoDB Atlas**: Free account at mongodb.com/cloud/atlas
3. **Gmail Account**: For email notifications
4. **Render Account**: Free account at render.com

---

## 🚀 Step 1: Prepare Your Code

### 1.1 Update Server for Render

Render uses a specific PORT environment variable. Our server already supports this, but let's verify:

**server/index.js** already has:
```javascript
const PORT = process.env.PORT || 5000;
```

✅ This is already correct!

### 1.2 Create render.yaml (Optional but Recommended)

Create `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: inkline-printing
    env: node
    plan: free
    buildCommand: npm install && cd client && npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false
      - key: CLIENT_URL
        sync: false
```

### 1.3 Update package.json

Ensure you have a `start` script (already done):
```json
{
  "scripts": {
    "start": "node server/index.js"
  }
}
```

✅ This is already in your package.json!

---

## 🚀 Step 2: Push to GitHub

### 2.1 Initialize Git (if not already)

```bash
# Check if git is initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Create GitHub Repository

1. Go to github.com
2. Click "New repository"
3. Name it: `inkline-printing-system`
4. Don't initialize with README (you already have files)
5. Click "Create repository"

### 2.3 Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/inkline-printing-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🚀 Step 3: Set Up MongoDB Atlas

### 3.1 Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a free M0 cluster

### 3.2 Configure Database Access

1. Go to "Database Access"
2. Click "Add New Database User"
3. Create username and password (save these!)
4. Set privileges to "Atlas admin"

### 3.3 Configure Network Access

1. Go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 3.4 Get Connection String

1. Go to "Database" → "Connect"
2. Click "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `inkline`

Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority`

---

## 🚀 Step 4: Deploy to Render

### 4.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub (easiest)

### 4.2 Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select `inkline-printing-system` repository

### 4.3 Configure Service

**Basic Settings:**
- **Name**: `inkline-printing`
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: (leave empty)
- **Runtime**: `Node`
- **Build Command**: `npm install && cd client && npm install && npm run build`
- **Start Command**: `npm start`

**Advanced Settings:**
- **Plan**: `Free` (selected by default)
- **Auto-Deploy**: `Yes` (deploys on git push)

### 4.4 Set Environment Variables

Click "Advanced" → "Add Environment Variable"

Add these variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
CLIENT_URL=https://inkline-printing.onrender.com
```

**Important Notes:**
- Replace `MONGODB_URI` with your actual connection string
- Replace `JWT_SECRET` with a random string
- Replace `EMAIL_USER` and `EMAIL_PASS` with your Gmail credentials
- Replace `CLIENT_URL` with your Render URL (you'll get this after deployment)

### 4.5 Deploy

1. Click "Create Web Service"
2. Render will start building your application
3. Wait for deployment to complete (5-10 minutes)
4. Copy your service URL (e.g., `https://inkline-printing.onrender.com`)

### 4.6 Update CLIENT_URL

1. Go to your service settings
2. Click "Environment"
3. Update `CLIENT_URL` to your actual Render URL
4. Save changes
5. Render will automatically redeploy

---

## 🚀 Step 5: Configure Custom Domain (Optional)

### 5.1 Add Custom Domain

1. Go to your service settings
2. Click "Custom Domains"
3. Enter your domain (e.g., `inkline.yourdomain.com`)
4. Follow the DNS configuration instructions

### 5.2 Update DNS

1. Go to your domain registrar
2. Add a CNAME record:
   - **Name**: `inkline` (or `@` for root domain)
   - **Value**: `inkline-printing.onrender.com`
   - **TTL**: 3600

### 5.3 Update CLIENT_URL

1. Update `CLIENT_URL` environment variable to your custom domain
2. Save changes
3. Render will automatically redeploy

---

## ✅ Step 6: Verify Deployment

### 6.1 Test Health Endpoint

```bash
curl https://inkline-printing.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 6.2 Test API

```bash
curl https://inkline-printing.onrender.com/api/auth/me
```

### 6.3 Test Application

1. Open your Render URL in browser
2. Test login/signup
3. Test creating orders
4. Test real-time updates (Socket.IO)

---

## ⚠️ Important Notes

### Render Free Tier Limitations:

1. **Spins Down**: Service sleeps after 15 minutes of inactivity
2. **Cold Start**: First request after sleep takes 30-60 seconds
3. **Limited Resources**: 512MB RAM, 0.1 CPU
4. **No Persistent Storage**: Files uploaded will be lost on restart
5. **Bandwidth**: Limited bandwidth on free tier

### Solutions:

1. **Keep Alive**: Use a service like UptimeRobot to ping your site every 10 minutes
2. **File Storage**: Use Cloud Storage (Google Cloud Storage) for file uploads
3. **Database**: Use MongoDB Atlas (free tier) - already recommended
4. **Monitoring**: Use Render's built-in logs and metrics

---

## 🔧 Troubleshooting

### Issue: Build Fails

**Solution:**
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify build command is correct

### Issue: Application Won't Start

**Solution:**
- Check logs in Render dashboard
- Verify environment variables are set
- Check MongoDB connection string
- Verify PORT is set correctly

### Issue: Socket.IO Not Working

**Solution:**
- Verify CORS settings in server
- Check CLIENT_URL matches your Render URL
- Ensure WebSocket is enabled in Render (it is by default)

### Issue: Cold Starts Too Slow

**Solution:**
- Use UptimeRobot to keep service awake
- Or upgrade to paid plan ($7/month, no spin-down)

---

## 📊 Monitoring

### View Logs

1. Go to your Render dashboard
2. Click on your service
3. Click "Logs" tab
4. View real-time logs

### View Metrics

1. Go to your Render dashboard
2. Click on your service
3. Click "Metrics" tab
4. View CPU, memory, and request metrics

---

## 🔄 Updating Your Application

### Automatic Deployment

Render automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update application"
git push origin main

# Render will automatically deploy
```

### Manual Deployment

1. Go to Render dashboard
2. Click on your service
3. Click "Manual Deploy"
4. Select branch and deploy

---

## 💰 Cost

### Free Tier:
- **Cost**: $0/month
- **Limitations**: Spins down after inactivity
- **Resources**: 512MB RAM, 0.1 CPU

### Paid Tier (Optional):
- **Cost**: $7/month
- **Benefits**: No spin-down, more resources
- **When to Upgrade**: If cold starts are unacceptable

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Network access configured
- [ ] Render account created
- [ ] Web service created
- [ ] Environment variables set
- [ ] Service deployed successfully
- [ ] Health endpoint tested
- [ ] Application tested
- [ ] Custom domain configured (optional)

---

## 🎉 Success!

Your application is now live on Render.com!

**Next Steps:**
1. Test all features
2. Set up monitoring
3. Configure custom domain (optional)
4. Set up file storage (Cloud Storage) for persistent files
5. Consider upgrading to paid plan if needed

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **Render Community**: https://community.render.com

---

**Your application is now deployed and accessible on the internet!** 🚀


