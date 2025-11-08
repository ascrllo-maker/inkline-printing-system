# Email Timeout Issue - Alternative Solutions

## Problem
Gmail SMTP is timing out on Render.com. This is likely because:
1. **Render.com free tier blocks outbound SMTP connections** (ports 465, 587)
2. **Network/firewall restrictions** preventing Gmail SMTP access
3. **Gmail blocking connections** from Render.com IP addresses

## Solution: Use SendGrid (Recommended)

SendGrid is a reliable email service that works well with Render.com and doesn't have SMTP port restrictions.

### Why SendGrid?
- ✅ **Works with Render.com** - No port blocking issues
- ✅ **Free tier: 100 emails/day** - Perfect for testing and small apps
- ✅ **Better deliverability** - Less likely to go to spam
- ✅ **Reliable API** - More stable than SMTP
- ✅ **Easy setup** - Simple API key configuration

### Step 1: Sign Up for SendGrid

1. Go to https://signup.sendgrid.com/
2. Sign up for a free account
3. Verify your email address
4. Complete the account setup

### Step 2: Create API Key

1. Go to SendGrid Dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Name it: `InkLine Production`
5. Select **"Full Access"** or **"Restricted Access"** (with Mail Send permissions)
6. Click **"Create & View"**
7. **Copy the API key** (you'll only see it once!)

### Step 3: Update Render Environment Variables

1. Go to Render Dashboard → Your Service → Environment
2. **Add new variable:**
   - Key: `SENDGRID_API_KEY`
   - Value: `your-sendgrid-api-key-here`
3. **Keep existing variables:**
   - `EMAIL_USER` (your Gmail address - for "from" address)
   - `EMAIL_PASS` (can be removed or kept - won't be used)

### Step 4: Update Code to Use SendGrid

I'll update the email configuration to use SendGrid instead of Gmail SMTP.

### Step 5: Test Email

After updating, test using:
```
https://inkline-printing-system.onrender.com/api/test/email?to=your-email@example.com
```

## Alternative: Use Mailgun

Mailgun is another good option:
- ✅ Free tier: 5,000 emails/month
- ✅ Works with Render.com
- ✅ Good deliverability

### Setup Mailgun:
1. Sign up at https://www.mailgun.com/
2. Verify your domain (or use sandbox domain for testing)
3. Get API key from dashboard
4. Update code to use Mailgun API

## Quick Fix: Try Port 587 First

I've updated the code to use port 587 (TLS) instead of 465 (SSL), which sometimes works better. 

**Wait for Render to redeploy and test again.**

If it still fails, we should switch to SendGrid.

## Current Status

✅ **Code updated to use port 587 (TLS)**
✅ **Timeout increased to 30 seconds**
✅ **Better TLS configuration**

**Next steps:**
1. Wait for Render to redeploy (5-10 minutes)
2. Test email again
3. If still fails → Switch to SendGrid (recommended)

## Recommendation

**For production use, I recommend SendGrid** because:
- More reliable than Gmail SMTP
- Better deliverability
- No port blocking issues
- Free tier is sufficient for most use cases
- Easy to set up and maintain

Would you like me to:
1. **Update the code to use SendGrid** (recommended)
2. **Try Mailgun instead**
3. **Keep trying Gmail SMTP** (may continue to fail)

Let me know which option you prefer!

