# How to Keep Render Service Awake (Avoid Loading Screen)

Render's free tier services go to sleep after 15 minutes of inactivity. When a user visits a sleeping service, they see the "APPLICATION LOADING" page while Render wakes it up (can take 30-60 seconds).

## ✅ BEST OPTION: GitHub Actions (No Verification Needed!)

Since you're already using GitHub, this is the easiest and most reliable solution - **no email verification required**!

### Setup GitHub Actions (Recommended)

1. **Get your Render URL**:
   - Your app URL: `https://your-app-name.onrender.com`
   - Ping endpoint: `https://your-app-name.onrender.com/ping`

2. **Add GitHub Secret**:
   - Go to your GitHub repository
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `RENDER_URL`
   - Value: `your-app-name.onrender.com` (without https://)
   - Click **Add secret**

3. **Enable GitHub Actions** (if not already enabled):
   - Go to **Actions** tab in your repository
   - The workflow file `.github/workflows/keep-alive.yml` is already included
   - GitHub Actions will automatically run it every 10 minutes

4. **Verify it's working**:
   - Go to **Actions** tab
   - You should see "Keep Render Service Awake" workflow running
   - Check the logs to see successful pings
   - Wait 15-20 minutes and test your app

**That's it!** GitHub Actions will ping your app every 10 minutes, keeping it awake 24/7. No verification, no signup needed!

---

## Alternative Options (If GitHub Actions doesn't work)

### Option 1: cron-job.org (Simple Setup)

1. **Sign up for cron-job.org**:
   - Go to https://cron-job.org/
   - Create a free account (simple email signup, no complex verification)
   - Free tier: Unlimited cron jobs, 1-minute intervals

2. **Create a Cron Job**:
   - Click "Create cronjob"
   - Title: `InkLine Keep-Alive`
   - Address: `https://your-app-name.onrender.com/ping`
   - Schedule: Select "Every 10 minutes" (or use cron: `*/10 * * * *`)
   - Click "Create cronjob"

3. **Verify**: Check your Render logs to see ping requests coming in

### Option 2: StatusCake (Free - 5 Minute Intervals)

1. **Sign up for StatusCake**:
   - Go to https://www.statuscake.com/
   - Create a free account
   - Free tier: 10 monitors, 5-minute intervals

2. **Add a Monitor**:
   - Click "Add Test"
   - Test Type: `HTTP(s)`
   - Website Name: `InkLine Keep-Alive`
   - Website URL: `https://your-app-name.onrender.com/ping`
   - Check Rate: `300` seconds (5 minutes)
   - Click "Create Test"

### Option 3: EasyCron (Free Tier)

1. **Sign up for EasyCron**:
   - Go to https://www.easycron.com/
   - Create a free account
   - Free tier: 1 cron job, 1-hour minimum interval (not ideal, but works)

2. **Create a Cron Job**:
   - Click "Add Cron Job"
   - Cron Job Name: `InkLine Keep-Alive`
   - URL: `https://your-app-name.onrender.com/ping`
   - Schedule: `0 * * * *` (every hour - minimum for free tier)
   - Click "Save"

**Note**: 1-hour interval might not be enough, but it's better than nothing.

### Option 4: Uptinio (Alternative)

1. **Sign up for Uptinio**:
   - Go to https://uptinio.com/
   - Create a free account
   - Free tier: 50 monitors, 1-minute intervals

2. **Add a Monitor**:
   - Click "Add Monitor"
   - Monitor Type: `HTTP(s)`
   - Name: `InkLine Keep-Alive`
   - URL: `https://your-app-name.onrender.com/ping`
   - Interval: `10 minutes`
   - Click "Save"

### Option 5: Run Locally (If you have a computer that's always on)

If you have a computer that's always running, you can create a simple script:

**Windows (PowerShell)**:
```powershell
# Create keep-alive.ps1
while ($true) {
    Invoke-WebRequest -Uri "https://your-app-name.onrender.com/ping" -UseBasicParsing
    Start-Sleep -Seconds 600  # Wait 10 minutes
}
```

**Run it**:
```powershell
# Run in background
Start-Process powershell -ArgumentList "-File keep-alive.ps1" -WindowStyle Hidden
```

**Linux/Mac (Bash)**:
```bash
# Create keep-alive.sh
#!/bin/bash
while true; do
    curl -f https://your-app-name.onrender.com/ping
    sleep 600  # Wait 10 minutes
done
```

**Run it**:
```bash
chmod +x keep-alive.sh
nohup ./keep-alive.sh &
```

---

## Option 6: Migrate to Better Hosting (Long-term Solution)

If you want to avoid the sleeping issue entirely:

### Koyeb (Recommended)
- **Free tier doesn't sleep**
- Better performance than Render free tier
- Easy migration from Render
- Visit: https://www.koyeb.com/

### Railway
- Free tier with $5 credit monthly
- Services don't sleep on paid plans
- Visit: https://railway.app/

### Fly.io
- Generous free tier
- Better performance
- Visit: https://fly.io/

---

## What Endpoints Are Available?

Your application has two endpoints that can be used for keep-alive:

1. **`/ping`** - Fastest endpoint (recommended for keep-alive)
   - URL: `https://your-app-name.onrender.com/ping`
   - Responds immediately with minimal overhead
   - Returns: `{"status":"ok","timestamp":"..."}`

2. **`/health`** - Health check endpoint
   - URL: `https://your-app-name.onrender.com/health`
   - Includes uptime information
   - Returns: `{"status":"ok","timestamp":"...","uptime":...}`

---

## Quick Setup Guide (GitHub Actions - Recommended)

1. **Get your Render URL**: `https://your-app-name.onrender.com`

2. **Add GitHub Secret**:
   - Repository → Settings → Secrets and variables → Actions
   - New repository secret: `RENDER_URL` = `your-app-name.onrender.com`

3. **Check Actions Tab**:
   - Go to Actions tab in your repository
   - Workflow should already be there (`.github/workflows/keep-alive.yml`)
   - It will run automatically every 10 minutes

4. **Verify**:
   - Wait 15-20 minutes
   - Visit your app - it should load immediately
   - Check Actions tab to see workflow runs

---

## Important Notes

- **Free tier limitations**: Render free tier services sleep after 15 minutes of inactivity
- **Ping frequency**: Ping every 10-15 minutes to keep the service awake
- **Cost**: All solutions above are free (except migration options)
- **Performance**: Using `/ping` endpoint has minimal impact on your service
- **GitHub Actions**: Free for public repositories, 2000 minutes/month for private repos

---

## Verify It's Working

After setting up the ping service:

1. **Wait 15-20 minutes** after setup
2. **Visit your application URL** - it should load immediately without the loading screen
3. **Check your Render logs** to see ping requests coming in
4. **Monitor the service**:
   - GitHub Actions: Check Actions tab for workflow runs
   - cron-job.org: Check dashboard for execution history
   - StatusCake: Check dashboard for test results

---

## Troubleshooting

If your service still sleeps:

1. **Verify the ping service is working**:
   - Check service dashboard for successful pings
   - Check Render logs for incoming requests
   - Manually test: `curl https://your-app-name.onrender.com/ping`

2. **Check the URL**:
   - Make sure URL includes `https://`
   - Make sure URL includes `/ping` endpoint
   - Test the URL in a browser first

3. **Check ping frequency**:
   - Make sure ping interval is less than 15 minutes (10 minutes recommended)
   - Render services sleep after 15 minutes of inactivity

4. **Check GitHub Actions** (if using):
   - Go to Actions tab
   - Check if workflow is enabled
   - Check if secret `RENDER_URL` is set correctly
   - Check workflow logs for errors

5. **Alternative**: Try a different service from the list above

---

## Recommended Solution

**🎯 Best Option: GitHub Actions**
- No email verification needed
- Already using GitHub
- Free for public repositories
- Reliable and automatic
- Easy to set up (just add one secret)

**Setup time**: 2 minutes
**Cost**: Free
**Reliability**: High
