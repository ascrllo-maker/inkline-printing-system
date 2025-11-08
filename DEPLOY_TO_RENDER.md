# 🚀 Deploy InkLine Printing System to Render.com

## Complete Step-by-Step Deployment Guide

This guide will walk you through deploying your application to Render.com using GitHub and MongoDB Atlas.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] GitHub account (free at github.com)
- [ ] Gmail account (for email notifications)
- [ ] Render.com account (we'll create this)
- [ ] MongoDB Atlas account (we'll create this)

---

## 🗂️ Step 1: Prepare Your Code for GitHub

### 1.1 Initialize Git Repository

Open your terminal in the project folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: InkLine Printing System"
```

### 1.2 Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository settings:
   - **Name**: `inkline-printing-system`
   - **Description**: `InkLine Smart Printing Queue System for DVC`
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** check "Initialize with README" (we already have files)
4. Click **"Create repository"**

### 1.3 Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/inkline-printing-system.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note**: You may be asked to authenticate. Use a Personal Access Token if prompted.

---

## 🍃 Step 2: Set Up MongoDB Atlas

### 2.1 Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"** or **"Sign Up"**
3. Sign up with:
   - Email address
   - Password
   - Or use Google/GitHub to sign in

### 2.2 Create a Free Cluster

1. After signing in, you'll see the **"Deploy a cloud database"** screen
2. Choose **"M0 FREE"** (Free Shared Cluster)
3. **Cloud Provider**: Choose closest to you (AWS, Google Cloud, or Azure)
4. **Region**: Choose closest to your location
5. **Cluster Name**: `InkLine-Cluster` (or any name you like)
6. Click **"Create Deployment"**
7. Wait 3-5 minutes for cluster to be created

### 2.3 Create Database User

1. You'll see **"Create Database User"** screen
2. **Authentication Method**: Password
3. **Username**: `inkline-admin` (or any username)
4. **Password**: Click **"Autogenerate Secure Password"** or create your own
   - **⚠️ IMPORTANT**: Save this password! You'll need it later.
5. Click **"Create Database User"**

### 2.4 Configure Network Access

1. You'll see **"Where would you like to connect from?"** screen
2. Click **"Add My Current IP Address"** (for testing)
3. **IMPORTANT**: Also click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is needed for Render.com to connect
4. Click **"Finish and Close"**

### 2.5 Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 5.5 or later
5. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace**:
   - `<username>` with your database username (e.g., `inkline-admin`)
   - `<password>` with your database password
   - Add database name: Change `?retryWrites=true` to `/inkline?retryWrites=true`
   
   **Final connection string should look like:**
   ```
   mongodb+srv://inkline-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority
   ```
7. **Save this connection string** - you'll need it for Render!

---

## 🎨 Step 3: Set Up Render.com

### 3.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (easiest option - recommended)
   - Click **"Sign up with GitHub"**
   - Authorize Render to access your GitHub account
4. Or sign up with email if you prefer

### 3.2 Create New Web Service

1. After signing in, click **"New +"** button (top right)
2. Click **"Web Service"**
3. You'll see **"Connect a repository"** screen
4. Find and click on **"inkline-printing-system"** repository
5. Click **"Connect"**

### 3.3 Configure Service Settings

Fill in the following settings:

#### Basic Settings:
- **Name**: `inkline-printing` (or any name you like)
- **Environment**: `Node`
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main` (should be selected by default)
- **Root Directory**: (leave empty)
- **Runtime**: `Node`
- **Build Command**: 
  ```
  npm install && cd client && npm install && npm run build
  ```
- **Start Command**: 
  ```
  npm start
  ```

#### Advanced Settings (Click "Advanced"):
- **Plan**: `Free` (should be selected by default)
- **Auto-Deploy**: `Yes` (deploys automatically when you push to GitHub)

### 3.4 Set Environment Variables

Scroll down to **"Environment Variables"** section and click **"Add Environment Variable"** for each:

#### Required Variables:

1. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

2. **MONGODB_URI**
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://inkline-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority`
   - ⚠️ Replace with your actual MongoDB connection string from Step 2.5

3. **JWT_SECRET**
   - Key: `JWT_SECRET`
   - Value: `your-super-secret-jwt-key-change-this-to-random-string-12345`
   - ⚠️ Change this to a random string (at least 32 characters)

4. **EMAIL_USER**
   - Key: `EMAIL_USER`
   - Value: `your-email@gmail.com`
   - ⚠️ Replace with your Gmail address

5. **EMAIL_PASS**
   - Key: `EMAIL_PASS`
   - Value: `your-gmail-app-password`
   - ⚠️ Replace with your Gmail App Password (see Gmail setup below)

6. **CLIENT_URL**
   - Key: `CLIENT_URL`
   - Value: `https://inkline-printing.onrender.com`
   - ⚠️ **IMPORTANT**: We'll update this after deployment with your actual Render URL

### 3.5 Create Service

1. Scroll down and click **"Create Web Service"**
2. Render will start building your application
3. This will take **5-10 minutes** the first time
4. You can watch the build logs in real-time

### 3.6 Get Your Render URL

1. After deployment completes, you'll see a green checkmark
2. Your service URL will be shown at the top (e.g., `https://inkline-printing.onrender.com`)
3. **Copy this URL** - you'll need it in the next step

### 3.7 Update CLIENT_URL

1. Go to your service dashboard
2. Click **"Environment"** tab
3. Find `CLIENT_URL` variable
4. Click the **pencil icon** to edit
5. Update the value to your actual Render URL (from Step 3.6)
6. Click **"Save Changes"**
7. Render will automatically redeploy (takes 2-3 minutes)

---

## 📧 Step 4: Set Up Gmail for Email Notifications

### 4.1 Enable 2-Step Verification

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Under **"Signing in to Google"**, find **"2-Step Verification"**
3. Click **"2-Step Verification"** and enable it
4. Follow the setup process

### 4.2 Generate App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. If prompted, sign in again
3. **Select app**: Choose **"Mail"**
4. **Select device**: Choose **"Other (Custom name)"**
5. Enter name: `InkLine Printing System`
6. Click **"Generate"**
7. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
8. **⚠️ IMPORTANT**: Save this password - you'll need it for Render!

### 4.3 Update EMAIL_PASS in Render

1. Go back to Render dashboard
2. Click on your service
3. Go to **"Environment"** tab
4. Find `EMAIL_PASS` variable
5. Click **pencil icon** to edit
6. Paste the 16-character App Password (remove spaces if any)
7. Click **"Save Changes"**
8. Render will automatically redeploy

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Health Endpoint

1. Open your browser
2. Go to: `https://your-app-name.onrender.com/health`
3. You should see:
   ```json
   {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
   ```

### 5.2 Test Application

1. Go to: `https://your-app-name.onrender.com`
2. You should see the login page
3. Try creating a new account
4. Test logging in
5. Test creating an order
6. Test real-time updates

### 5.3 Check Logs

1. Go to Render dashboard
2. Click on your service
3. Click **"Logs"** tab
4. Check for any errors
5. Look for: `✅ Connected to MongoDB`
6. Look for: `🚀 Server running on 0.0.0.0:10000`

---

## 🔧 Troubleshooting

### Issue: Build Fails

**Symptoms**: Build fails in Render logs

**Solutions**:
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify build command is correct: `npm install && cd client && npm install && npm run build`
- Check that `package.json` has a `start` script

### Issue: Application Won't Start

**Symptoms**: Service shows "Unhealthy" or crashes

**Solutions**:
- Check logs in Render dashboard
- Verify all environment variables are set correctly
- Check MongoDB connection string format
- Verify JWT_SECRET is set
- Check that PORT is not hardcoded (should use `process.env.PORT`)

### Issue: MongoDB Connection Error

**Symptoms**: Logs show "MongoDB connection error"

**Solutions**:
- Verify MongoDB Atlas network access allows `0.0.0.0/0`
- Check connection string format (should include `/inkline` database name)
- Verify username and password are correct
- Check that database user has proper permissions

### Issue: Socket.IO Not Working

**Symptoms**: Real-time updates don't work

**Solutions**:
- Verify `CLIENT_URL` matches your Render URL exactly
- Check CORS settings in server code
- Ensure WebSocket is enabled (it is by default on Render)

### Issue: Email Not Sending

**Symptoms**: No emails received

**Solutions**:
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check that 2-Step Verification is enabled
- Verify `EMAIL_USER` is your full Gmail address
- Check Render logs for email errors

### Issue: Service Spins Down

**Symptoms**: First request after inactivity takes 30-60 seconds

**Solutions**:
- This is normal for Render free tier
- Service sleeps after 15 minutes of inactivity
- First request wakes it up (takes 30-60 seconds)
- Consider using a service like UptimeRobot to ping your site every 10 minutes

---

## 🔄 Updating Your Application

### Automatic Deployment

Render automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update application"
git push origin main

# Render will automatically detect the push and deploy
```

### Manual Deployment

1. Go to Render dashboard
2. Click on your service
3. Click **"Manual Deploy"** button
4. Select branch: `main`
5. Click **"Deploy latest commit"**

---

## 📊 Monitoring

### View Logs

1. Go to Render dashboard
2. Click on your service
3. Click **"Logs"** tab
4. View real-time logs

### View Metrics

1. Go to Render dashboard
2. Click on your service
3. Click **"Metrics"** tab
4. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain

1. Go to Render dashboard
2. Click on your service
3. Click **"Settings"** tab
4. Scroll to **"Custom Domains"**
5. Click **"Add Custom Domain"**
6. Enter your domain (e.g., `inkline.yourdomain.com`)
7. Follow DNS configuration instructions

### Update DNS

1. Go to your domain registrar
2. Add a CNAME record:
   - **Name**: `inkline` (or `@` for root domain)
   - **Value**: `inkline-printing.onrender.com`
   - **TTL**: 3600

### Update CLIENT_URL

1. Update `CLIENT_URL` environment variable to your custom domain
2. Save changes
3. Render will automatically redeploy

---

## 💰 Cost

### Free Tier:
- **Cost**: $0/month
- **Limitations**: 
  - Spins down after 15 minutes of inactivity
  - 512MB RAM, 0.1 CPU
  - Limited bandwidth

### Paid Tier (Optional):
- **Cost**: $7/month (Starter plan)
- **Benefits**: 
  - No spin-down
  - More resources
  - Better performance

---

## ✅ Deployment Checklist

- [ ] Git repository initialized
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas account created
- [ ] MongoDB cluster created
- [ ] Database user created
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string saved
- [ ] Render account created
- [ ] Web service created
- [ ] Environment variables set:
  - [ ] NODE_ENV
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET
  - [ ] EMAIL_USER
  - [ ] EMAIL_PASS
  - [ ] CLIENT_URL
- [ ] Gmail App Password generated
- [ ] Service deployed successfully
- [ ] Health endpoint tested
- [ ] Application tested
- [ ] Logs checked for errors

---

## 🎉 Success!

Your application is now live on the internet! 🚀

**Your application URL**: `https://your-app-name.onrender.com`

**Next Steps**:
1. Test all features thoroughly
2. Share the URL with your users
3. Monitor logs for any issues
4. Consider setting up a custom domain
5. Set up monitoring (UptimeRobot) to keep service awake
6. Consider upgrading to paid plan if needed

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **GitHub Docs**: https://docs.github.com

---

**Congratulations! Your InkLine Printing System is now deployed and accessible worldwide!** 🌍✨

