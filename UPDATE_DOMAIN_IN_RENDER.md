# Update Render Environment Variables for Authenticated Domain

## Domain Authenticated! ✅

You've successfully authenticated your domain in SendGrid: `inkline.shop`

## Next Steps: Update Render Environment Variables

### Step 1: Determine Your Sender Email Address

Based on your authenticated domain (`inkline.shop`), you should use an email address like:
- `noreply@inkline.shop` (Recommended for automated emails)
- `hello@inkline.shop`
- `support@inkline.shop`
- `notifications@inkline.shop`

**Recommendation:** Use `noreply@inkline.shop` for automated transactional emails.

### Step 2: Update Render Environment Variables

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com/
   - Click on your service: **inkline-printing-system**
   - Click on **"Environment"** tab

2. **Update `EMAIL_USER`**
   - Find the `EMAIL_USER` variable
   - **Current value:** `airlscrllo@gmail.com` (or your Gmail)
   - **New value:** `noreply@inkline.shop` (or your chosen email)
   - Click **"Save Changes"**

3. **Optional: Add `SENDGRID_FROM_EMAIL`**
   - Click **"Add Environment Variable"**
   - **Key:** `SENDGRID_FROM_EMAIL`
   - **Value:** `noreply@inkline.shop` (same as EMAIL_USER)
   - Click **"Save Changes"**

4. **Optional: Add `SENDGRID_FROM_NAME`**
   - Click **"Add Environment Variable"**
   - **Key:** `SENDGRID_FROM_NAME`
   - **Value:** `InkLine DVC` (or your preferred name)
   - Click **"Save Changes"**

### Step 3: Verify Environment Variables

Make sure these are set:
```
EMAIL_USER=noreply@inkline.shop
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@inkline.shop (optional)
SENDGRID_FROM_NAME=InkLine DVC (optional)
```

### Step 4: Wait for Redeploy

- Render will automatically detect the changes
- It will redeploy your service (takes 5-10 minutes)
- You'll see "Deploying..." status

### Step 5: Verify Domain in SendGrid

1. **Go to SendGrid Dashboard**
   - Navigate to: Settings → Sender Authentication
   - Check that your domain shows "Verified" status
   - Make sure DNS records are properly configured

2. **Verify DNS Records**
   - SPF record should be set
   - DKIM records should be set
   - DMARC record (optional but recommended)

### Step 6: Test Email Sending

After redeploy completes, test using:
```
https://inkline-printing-system.onrender.com/api/test/email?to=your-email@example.com
```

Or create a test order to trigger an email.

### Step 7: Check Email Delivery

1. **Check Inbox** (not spam folder)
2. **Check Email Headers**
   - Look for "from" address: should be `noreply@inkline.shop`
   - Look for SPF/DKIM authentication
   - Should show "Pass" for authentication

## Important Notes

### Email Address Format

When using an authenticated domain, the email address format is:
```
username@your-authenticated-domain.com
```

Examples:
- `noreply@inkline.shop` ✅
- `hello@inkline.shop` ✅
- `support@inkline.shop` ✅
- `noreply@gmail.com` ❌ (Not on authenticated domain)

### Domain Verification

Make sure your domain is fully verified in SendGrid:
- ✅ Domain shows "Verified" status
- ✅ DNS records are properly configured
- ✅ No warnings or errors

### Testing

After updating environment variables:
1. Wait for Render to redeploy (5-10 minutes)
2. Send a test email
3. Check inbox (should go to inbox, not spam)
4. Verify email headers show proper authentication

## Troubleshooting

### Email Still Goes to Spam

1. **Check Domain Authentication**
   - Verify domain is fully authenticated in SendGrid
   - Check DNS records are correct
   - Wait 24-48 hours for DNS propagation

2. **Check Email Address**
   - Make sure email address uses authenticated domain
   - Format: `username@inkline.shop`

3. **Check SendGrid Analytics**
   - Monitor delivery rates
   - Check for bounce/spam reports
   - Verify authentication is working

### "From address does not match authenticated domain"

**Error:** The from address doesn't match your authenticated domain.

**Solution:**
1. Make sure `EMAIL_USER` uses your authenticated domain
2. Format: `username@inkline.shop`
3. Not: `username@gmail.com`

### DNS Records Not Verified

**Problem:** SendGrid shows DNS records as not verified.

**Solution:**
1. Check DNS records in your domain registrar
2. Wait 24-48 hours for DNS propagation
3. Verify records match SendGrid's requirements
4. Check for typos in DNS records

## Expected Results

After updating environment variables:

### ✅ Improved Deliverability
- Emails should go to inbox (not spam)
- Better sender reputation
- Higher delivery rates

### ✅ Professional Appearance
- Emails from `noreply@inkline.shop`
- Proper authentication (SPF/DKIM/DMARC)
- Better trust from email providers

### ✅ Better Analytics
- SendGrid analytics will show proper domain
- Better tracking and monitoring
- Improved sender reputation over time

## Quick Checklist

- [ ] Domain authenticated in SendGrid
- [ ] Updated `EMAIL_USER` in Render to use authenticated domain
- [ ] Added `SENDGRID_FROM_EMAIL` (optional)
- [ ] Added `SENDGRID_FROM_NAME` (optional)
- [ ] Saved changes in Render
- [ ] Waited for redeploy (5-10 minutes)
- [ ] Tested email sending
- [ ] Verified email goes to inbox (not spam)
- [ ] Checked email headers for authentication

## Next Steps After Setup

1. **Monitor SendGrid Analytics**
   - Check delivery rates
   - Monitor bounce rates
   - Watch for spam reports

2. **Build Sender Reputation**
   - Send emails regularly
   - Maintain low bounce rates
   - Avoid spam complaints

3. **Improve Email Engagement**
   - Send relevant, timely emails
   - Personalize when possible
   - Make emails actionable

## Summary

**What You've Done:**
- ✅ Authenticated domain in SendGrid

**What to Do Next:**
1. Update `EMAIL_USER` in Render to `noreply@inkline.shop`
2. Wait for redeploy (5-10 minutes)
3. Test email sending
4. Verify emails go to inbox (not spam)

**Expected Result:**
- ✅ Emails from authenticated domain
- ✅ Better deliverability
- ✅ Less spam issues
- ✅ Professional appearance

