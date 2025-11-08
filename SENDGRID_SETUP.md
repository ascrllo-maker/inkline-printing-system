# SendGrid Setup Guide

## Step 1: Sign Up for SendGrid

1. Go to https://signup.sendgrid.com/
2. Sign up for a free account
3. Verify your email address
4. Complete the account setup

## Step 2: Create API Key

1. Go to SendGrid Dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Name it: `InkLine Production`
5. Select **"Full Access"** (or **"Restricted Access"** with Mail Send permissions)
6. Click **"Create & View"**
7. **Copy the API key** (you'll only see it once!)
   - It should look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Verify Sender Identity (Important!)

SendGrid requires you to verify your sender email address:

1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in your information:
   - **From Email Address:** Your Gmail address (e.g., `your-email@gmail.com`)
   - **From Name:** `InkLine DVC`
   - **Reply To:** Your Gmail address
   - **Company Address:** Your address
4. Click **"Create"**
5. **Check your email** for verification link
6. **Click the verification link** in the email

**Important:** You must verify your sender email before sending emails!

## Step 4: Update Render Environment Variables

1. Go to Render Dashboard → Your Service → Environment
2. **Add new variable:**
   - Key: `SENDGRID_API_KEY`
   - Value: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your API key)
3. **Keep existing variable:**
   - `EMAIL_USER` (your Gmail address - used as "from" address)
   - You can remove `EMAIL_PASS` (not needed with SendGrid)

## Step 5: Wait for Redeploy

- Render will automatically redeploy (5-10 minutes)
- Wait for deployment to complete

## Step 6: Test Email

After deployment, test using:
```
https://inkline-printing-system.onrender.com/api/test/email?to=your-email@example.com
```

## Environment Variables

### Required:
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_USER=your-email@gmail.com
```

### Optional (if you want to use a different from address):
```
SENDGRID_FROM_EMAIL=noreply@inkline-dvc.com
SENDGRID_FROM_NAME=InkLine DVC
```

## Troubleshooting

### Error: "The from address does not match a verified Sender Identity"

**Solution:**
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify your sender email address
3. Check your email for verification link
4. Click the verification link

### Error: "API key is invalid"

**Solution:**
1. Check that `SENDGRID_API_KEY` is set correctly in Render
2. Make sure there are no extra spaces or quotes
3. Verify the API key in SendGrid Dashboard → API Keys

### Error: "Forbidden" or "Unauthorized"

**Solution:**
1. Check that your API key has "Mail Send" permissions
2. Regenerate API key if needed
3. Make sure sender email is verified

## SendGrid Free Tier Limits

- **100 emails/day** - Perfect for testing and small apps
- **Unlimited contacts**
- **Email API access**
- **Email validation**
- **Email activity dashboard**

## Benefits of SendGrid

- ✅ **Works with Render.com** - No port blocking issues
- ✅ **Better deliverability** - Less likely to go to spam
- ✅ **Reliable API** - More stable than SMTP
- ✅ **Easy setup** - Simple API key configuration
- ✅ **Free tier** - 100 emails/day is sufficient for most use cases
- ✅ **Email analytics** - Track email delivery and opens

## Next Steps

1. ✅ Sign up for SendGrid
2. ✅ Create API key
3. ✅ Verify sender email
4. ✅ Update Render environment variables
5. ✅ Wait for redeploy
6. ✅ Test email sending

## Support

If you encounter issues:
1. Check SendGrid Dashboard for error messages
2. Verify sender email is verified
3. Check API key permissions
4. Review SendGrid documentation: https://docs.sendgrid.com/

