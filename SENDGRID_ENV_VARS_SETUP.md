# SendGrid Environment Variables Setup in Render

## Current Issue

The test endpoint is showing: "Email credentials not configured"

This is because you need to add the `SENDGRID_API_KEY` to Render environment variables.

## Step-by-Step: Add SendGrid API Key to Render

### Step 1: Get Your SendGrid API Key

1. Go to SendGrid Dashboard: https://app.sendgrid.com/
2. Navigate to **Settings** → **API Keys**
3. If you haven't created one yet:
   - Click **"Create API Key"**
   - Name it: `InkLine Production`
   - Select **"Full Access"** (or **"Restricted Access"** with Mail Send permissions)
   - Click **"Create & View"**
   - **Copy the API key** (you'll only see it once!)
4. If you already created one:
   - Find it in the list
   - Click the eye icon to view it
   - Copy it

**API Key Format:** `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Add to Render Environment Variables

1. Go to Render Dashboard: https://dashboard.render.com/
2. Click on your service: **inkline-printing-system**
3. Click on **"Environment"** tab (left sidebar or top)
4. Click **"Add Environment Variable"** or find existing variables
5. **Add new variable:**
   - **Key:** `SENDGRID_API_KEY`
   - **Value:** `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (paste your API key)
   - **Important:** No quotes, no spaces, exact value
6. Click **"Save Changes"**

### Step 3: Verify EMAIL_USER is Set

Make sure `EMAIL_USER` is also set:
- **Key:** `EMAIL_USER`
- **Value:** Your Gmail address (e.g., `airlscrllo@gmail.com`)
- This is used as the "from" email address

### Step 4: Wait for Redeploy

- Render will automatically detect the change
- It will redeploy your service (takes 5-10 minutes)
- You'll see "Deploying..." status

### Step 5: Test Again

After redeploy completes, test using:
```
https://inkline-printing-system.onrender.com/api/test/email?to=airlscrllo@gmail.com
```

## Required Environment Variables

### For SendGrid (Recommended):
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_USER=airlscrllo@gmail.com
```

### Optional:
```
SENDGRID_FROM_EMAIL=airlscrllo@gmail.com
SENDGRID_FROM_NAME=InkLine DVC
```

## Important Notes

### ✅ Do's:
- ✅ Use `SENDGRID_API_KEY` (not `EMAIL_PASS`)
- ✅ Keep `EMAIL_USER` set (your Gmail address)
- ✅ No quotes around values
- ✅ No spaces
- ✅ Exact API key value

### ❌ Don'ts:
- ❌ Don't use `EMAIL_PASS` (not needed with SendGrid)
- ❌ Don't add quotes around the API key
- ❌ Don't add spaces
- ❌ Don't share your API key

## Verify Sender Email is Verified in SendGrid

Before testing, make sure your sender email is verified:

1. Go to SendGrid Dashboard
2. Navigate to **Settings** → **Sender Authentication**
3. Check if your email (`airlscrllo@gmail.com`) is verified
4. If not verified:
   - Click **"Verify a Single Sender"**
   - Enter your Gmail address
   - Fill in the form
   - Check your email for verification link
   - Click the verification link

## Troubleshooting

### Still showing "Email credentials not configured"

1. **Check Render Environment Variables:**
   - Make sure `SENDGRID_API_KEY` is set
   - Make sure `EMAIL_USER` is set
   - No typos, no quotes, no spaces

2. **Wait for Redeploy:**
   - Changes take 5-10 minutes to deploy
   - Check Render dashboard for deployment status

3. **Check API Key:**
   - Make sure API key is correct
   - Make sure it has "Mail Send" permissions
   - Try regenerating if needed

### "The from address does not match a verified Sender Identity"

**Solution:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify your sender email address (`airlscrllo@gmail.com`)
3. Check your Gmail inbox for verification email
4. Click the verification link

### "API key is invalid"

**Solution:**
1. Check that `SENDGRID_API_KEY` is set correctly in Render
2. Make sure there are no extra spaces or quotes
3. Verify the API key in SendGrid Dashboard
4. Regenerate API key if needed

## Quick Checklist

- [ ] Created SendGrid API key
- [ ] Copied API key (starts with `SG.`)
- [ ] Added `SENDGRID_API_KEY` to Render environment variables
- [ ] Verified `EMAIL_USER` is set (your Gmail address)
- [ ] Saved changes in Render
- [ ] Waited for redeploy (5-10 minutes)
- [ ] Verified sender email in SendGrid
- [ ] Tested email sending

## After Setup

Once you've added the `SENDGRID_API_KEY`:
1. ✅ Render will redeploy automatically
2. ✅ Test endpoint will work
3. ✅ Emails will send via SendGrid
4. ✅ No more port blocking issues
5. ✅ Better deliverability

## Next Steps

1. **Add `SENDGRID_API_KEY` to Render** (see steps above)
2. **Wait for redeploy** (5-10 minutes)
3. **Verify sender email in SendGrid** (if not done yet)
4. **Test email** using the test endpoint
5. **Check your inbox** for the test email

