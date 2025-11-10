# ⚡ Quick Start Guide - Keep Render Awake with GitHub Actions

**For the MOST DETAILED instructions, see [DETAILED_SETUP_GUIDE.md](./DETAILED_SETUP_GUIDE.md)**

---

## 🎯 What You Need (30 seconds)

1. Your Render app URL (e.g., `https://inkline-printing-system-abc123.onrender.com`)
2. Access to your GitHub repository
3. 2 minutes of your time

---

## 📝 3 Simple Steps

### Step 1: Get Your Render App Name (30 seconds)

1. Go to https://dashboard.render.com/
2. Click on your web service
3. Copy the URL (e.g., `https://inkline-printing-system-abc123.onrender.com`)
4. Remove `https://` → You get: `inkline-printing-system-abc123.onrender.com`
5. **Write this down!** You'll need it in Step 2

---

### Step 2: Add GitHub Secret (1 minute)

1. Go to: https://github.com/ascrllo-maker/inkline-printing-system
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Fill in:
   - **Name**: `RENDER_URL` (exactly like this, all uppercase)
   - **Value**: `inkline-printing-system-abc123.onrender.com` (your app name from Step 1)
6. Click **Add secret**

✅ **Important**: 
- ✅ Include `.onrender.com`
- ❌ Do NOT include `https://`
- ❌ Do NOT include trailing slash `/`

---

### Step 3: Test It (30 seconds)

1. Go to **Actions** tab in your repository
2. Click on **"Keep Render Service Awake"** workflow
3. Click **Run workflow** button (top right)
4. Wait for it to complete
5. Check the logs - you should see: **"✅ Ping successful! Service is awake."**

---

## ✅ Verify It's Working

1. Wait 15-20 minutes
2. Visit your Render app URL
3. It should load **immediately** (no loading screen!)

---

## 🎉 Done!

Your service will now stay awake 24/7. GitHub Actions will ping it every 10 minutes automatically.

---

## 🆘 Quick Troubleshooting

### Workflow not running?
- Go to **Settings** → **Actions** → **General**
- Make sure **"Allow all actions and reusable workflows"** is selected

### Ping failing?
- Test manually: `https://your-app-name.onrender.com/ping`
- Should return: `{"status":"ok","timestamp":"..."}`
- Check that your `RENDER_URL` secret is correct (no `https://`, includes `.onrender.com`)

### Still seeing loading screen?
- Wait at least 20 minutes after setup
- Check Render logs for `/ping` requests
- Check GitHub Actions logs for errors

---

## 📚 Need More Help?

See [DETAILED_SETUP_GUIDE.md](./DETAILED_SETUP_GUIDE.md) for:
- Detailed step-by-step instructions
- Screenshot descriptions
- Comprehensive troubleshooting
- Monitoring guide
- Common problems and solutions

---

## 🎓 How It Works

1. GitHub Actions runs every 10 minutes (automatic)
2. Sends a GET request to `https://your-app-name.onrender.com/ping`
3. Your Render service responds
4. Service stays awake because it receives requests every 10 minutes
5. Render only sleeps after 15 minutes of inactivity
6. **Result**: Service never sleeps! 🚀

---

**That's it! Simple, free, and reliable.** ✨

