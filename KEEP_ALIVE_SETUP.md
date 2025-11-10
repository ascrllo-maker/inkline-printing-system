# How to Keep Render Service Awake (Avoid Loading Screen)

Render's free tier services go to sleep after 15 minutes of inactivity. When a user visits a sleeping service, they see the "APPLICATION LOADING" page while Render wakes it up (can take 30-60 seconds).

## Solution: Use a Free Ping Service

The best solution is to use a free monitoring service that pings your application every 10-15 minutes to keep it awake.

### Option 1: UptimeRobot (Recommended - Free)

1. **Sign up for UptimeRobot** (free):
   - Go to https://uptimerobot.com/
   - Create a free account (50 monitors free)

2. **Add a Monitor**:
   - Click "Add New Monitor"
   - Monitor Type: Select "HTTP(s)"
   - Friendly Name: `InkLine Keep-Alive`
   - URL: `https://your-app-name.onrender.com/ping`
   - Monitoring Interval: Select "5 minutes" (minimum free tier)
   - Click "Create Monitor"

3. **That's it!** UptimeRobot will ping your app every 5 minutes, keeping it awake 24/7.

### Option 2: cron-job.org (Free)

1. **Sign up for cron-job.org**:
   - Go to https://cron-job.org/
   - Create a free account

2. **Create a Cron Job**:
   - Click "Create cronjob"
   - Title: `InkLine Keep-Alive`
   - Address: `https://your-app-name.onrender.com/ping`
   - Schedule: Select "Every 10 minutes" or "Every 15 minutes"
   - Click "Create cronjob"

### Option 3: EasyCron (Free)

1. **Sign up for EasyCron**:
   - Go to https://www.easycron.com/
   - Create a free account

2. **Create a Cron Job**:
   - Click "Add Cron Job"
   - Cron Job Name: `InkLine Keep-Alive`
   - URL: `https://your-app-name.onrender.com/ping`
   - Schedule: `*/10 * * * *` (every 10 minutes)
   - Click "Save"

### Option 4: Koyeb (Alternative Hosting - Better Free Tier)

If you want to avoid the sleeping issue entirely, consider migrating to Koyeb:
- Free tier doesn't sleep
- Better performance
- Easy migration from Render

Visit: https://www.koyeb.com/

## What Endpoints Are Available?

Your application has two endpoints that can be used for keep-alive:

1. **`/ping`** - Fastest endpoint (recommended for keep-alive)
   - URL: `https://your-app-name.onrender.com/ping`
   - Responds immediately with minimal overhead

2. **`/health`** - Health check endpoint
   - URL: `https://your-app-name.onrender.com/health`
   - Includes uptime information

## Important Notes

- **Free tier limitations**: Render free tier services sleep after 15 minutes of inactivity
- **Ping frequency**: Ping every 10-15 minutes to keep the service awake
- **Cost**: All monitoring services mentioned above have free tiers
- **Performance**: Using `/ping` endpoint has minimal impact on your service

## Verify It's Working

After setting up the ping service:
1. Wait 15-20 minutes
2. Visit your application URL
3. It should load immediately without showing the loading screen
4. Check your Render logs to see the ping requests coming in

## Troubleshooting

If your service still sleeps:
- Verify the ping service is actually making requests (check service dashboard)
- Check that the URL is correct (include `https://` and `/ping`)
- Make sure the ping interval is less than 15 minutes
- Check Render logs to confirm ping requests are being received

