# GitHub Actions Keep-Alive Setup (Easiest Method - No Verification!)

This is the **easiest and most reliable** way to keep your Render service awake - **no email verification needed** since you're already using GitHub!

## Quick Setup (2 Minutes)

### Step 1: Get Your Render App Name

1. Go to your Render dashboard: https://dashboard.render.com/
2. Find your web service
3. Your app URL looks like: `https://your-app-name.onrender.com`
4. Note down: `your-app-name.onrender.com` (without `https://`)

### Step 2: Add GitHub Secret

1. Go to your GitHub repository: `https://github.com/ascrllo-maker/inkline-printing-system`
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Fill in:
   - **Name**: `RENDER_URL`
   - **Value**: `your-app-name.onrender.com` (replace with your actual app name)
6. Click **Add secret**

### Step 3: Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. The workflow file is already there: `.github/workflows/keep-alive.yml`
3. GitHub Actions will automatically run it every 10 minutes
4. You should see "Keep Render Service Awake" workflow in the list

### Step 4: Test It

1. Go to **Actions** tab
2. Click on "Keep Render Service Awake" workflow
3. Click **Run workflow** button (top right) to test it manually
4. Wait for it to complete and check the logs
5. You should see: "✅ Ping successful! Service is awake."

### Step 5: Verify It's Working

1. Wait 15-20 minutes after setup
2. Visit your Render app URL
3. It should load immediately without the loading screen
4. Check **Actions** tab to see automatic runs every 10 minutes

## That's It! 🎉

Your Render service will now stay awake 24/7. GitHub Actions will ping it every 10 minutes automatically.

## Troubleshooting

### Workflow Not Running?

1. **Check if Actions are enabled**:
   - Go to **Settings** → **Actions** → **General**
   - Make sure "Allow all actions and reusable workflows" is selected
   - Click **Save**

2. **Check if secret is set**:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Make sure `RENDER_URL` secret exists
   - Value should be: `your-app-name.onrender.com` (no `https://`)

3. **Check workflow file**:
   - Go to **Actions** tab
   - Click "Keep Render Service Awake"
   - Check if it shows any errors
   - Check the logs for the ping step

### Ping Failing?

1. **Check your Render URL**:
   - Make sure it's correct: `your-app-name.onrender.com`
   - Test it manually: `https://your-app-name.onrender.com/ping`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Render logs**:
   - Go to Render dashboard
   - Check your service logs
   - You should see GET requests to `/ping` every 10 minutes

3. **Verify endpoint exists**:
   - The `/ping` endpoint should be available after deployment
   - Check Render deployment logs to confirm server started

## Manual Test

You can manually test the ping:

```bash
# Replace with your actual Render app name
curl https://your-app-name.onrender.com/ping
```

Should return:
```json
{"status":"ok","timestamp":"2024-..."}
```

## Schedule

The workflow runs every 10 minutes automatically:
- Cron: `*/10 * * * *`
- This keeps your service awake (Render sleeps after 15 minutes of inactivity)

## Cost

- **Free for public repositories** ✅
- **Free for private repositories**: 2,000 minutes/month (plenty for this use case)
- Each ping takes ~1 second
- 6 pings/hour × 24 hours = 144 pings/day = ~2.4 minutes/day
- Well within free tier limits!

## Alternative: Hardcode URL (Not Recommended)

If you don't want to use secrets, you can edit `.github/workflows/keep-alive.yml`:

```yaml
env:
  RENDER_URL: 'your-app-name.onrender.com'  # Replace with your actual app name
```

But using secrets is more secure and recommended!

## Need Help?

1. Check the workflow logs in **Actions** tab
2. Check your Render service logs
3. Test the `/ping` endpoint manually
4. Verify the secret is set correctly

## Success Indicators

✅ Workflow runs every 10 minutes in Actions tab  
✅ Workflow logs show "Ping successful!"  
✅ Render logs show GET requests to `/ping`  
✅ Your app loads immediately without loading screen  
✅ No more "APPLICATION LOADING" page!

