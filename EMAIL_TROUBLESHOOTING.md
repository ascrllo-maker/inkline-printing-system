# Email Troubleshooting Guide

## Current Issue: Email Timeout

If you're seeing "Email sending failed: Email sending timeout" errors, here's how to fix it:

## Quick Checklist

1. ✅ **Check Render Environment Variables**
   - Go to Render Dashboard → Your Service → Environment
   - Verify `EMAIL_USER` is set (your Gmail address)
   - Verify `EMAIL_PASS` is set (16-character App Password)
   - Make sure there are no extra spaces or quotes

2. ✅ **Verify Gmail App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Make sure 2-Step Verification is enabled
   - Generate a new App Password if needed
   - Copy the 16-character password (no spaces)

3. ✅ **Check Gmail Security Settings**
   - Make sure "Less secure app access" is NOT enabled (not needed with App Passwords)
   - App Passwords should be used instead
   - 2-Step Verification must be enabled

4. ✅ **Test Email Configuration**
   - The system will retry failed emails automatically
   - Check Render logs for detailed error messages
   - Emails failing won't block the system (they're non-blocking)

## Common Issues and Solutions

### Issue 1: Authentication Failed (EAUTH)

**Error:** `Authentication failed`

**Solutions:**
1. Make sure you're using an **App Password**, not your regular Gmail password
2. Verify 2-Step Verification is enabled on your Gmail account
3. Generate a new App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "InkLine" as the name
   - Copy the 16-character password
4. Update `EMAIL_PASS` in Render environment variables
5. Redeploy the service

### Issue 2: Connection Timeout

**Error:** `Email sending timeout` or `Connection failed or timeout`

**Possible Causes:**
1. **Network/Firewall blocking Gmail SMTP**
   - Render.com might be blocking outbound SMTP connections
   - Some hosting providers block SMTP ports (465, 587)

2. **Gmail blocking the connection**
   - Gmail might be blocking connections from Render.com IPs
   - Too many failed login attempts

3. **Incorrect credentials**
   - Wrong email address
   - Wrong App Password
   - App Password expired or revoked

**Solutions:**
1. **Verify credentials in Render:**
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```
   - No quotes
   - No spaces
   - Exact 16 characters for App Password

2. **Generate a new App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Delete old App Password
   - Create a new one
   - Update Render environment variables

3. **Check Render logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for detailed error messages
   - Check for authentication or connection errors

4. **Wait and retry:**
   - Gmail might temporarily block connections after multiple failures
   - Wait 10-15 minutes and try again
   - The system will automatically retry (2 attempts)

### Issue 3: Render Network Restrictions

**Problem:** Render.com might block outbound SMTP connections on free tier

**Solutions:**
1. **Check Render Service Plan:**
   - Free tier might have network restrictions
   - Consider upgrading to paid plan if needed

2. **Use Alternative Email Service:**
   - Consider using SendGrid, Mailgun, or AWS SES
   - These services are more reliable for production
   - Better deliverability and less likely to be blocked

3. **Contact Render Support:**
   - Ask if SMTP ports (465, 587) are blocked
   - Request to whitelist Gmail SMTP if possible

## Testing Email Configuration

### Method 1: Check Render Logs

1. Go to Render Dashboard → Your Service → Logs
2. Create a test order or trigger an email
3. Look for email-related log messages:
   - `✉️ Email sent successfully` = Working
   - `❌ Email sending failed` = Not working
   - Check error details for specific issues

### Method 2: Test Locally

1. Create a `.env` file in `server` directory:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

2. Run test script:
   ```bash
   node server/scripts/testEmail.js your-test-email@example.com
   ```

3. Check if email is received

## Email Service Status

### Current Behavior:
- ✅ Emails are sent **non-blocking** (won't block requests)
- ✅ System will **retry** failed emails (2 attempts)
- ✅ **Timeout is 20 seconds** per attempt
- ✅ **System continues to work** even if emails fail
- ⚠️ Emails might fail due to network/authentication issues

### What Happens When Email Fails:
1. Email sending is attempted (20 second timeout)
2. If it fails, system retries once (2 second delay)
3. If still fails, error is logged but request continues
4. User still sees success message
5. System continues to work normally

## Alternative Solutions

### Option 1: Use SendGrid (Recommended for Production)

**Advantages:**
- More reliable than Gmail SMTP
- Better deliverability
- Less likely to be blocked
- Free tier: 100 emails/day

**Setup:**
1. Sign up at https://sendgrid.com
2. Create API key
3. Update email configuration to use SendGrid
4. Update Render environment variables

### Option 2: Use Mailgun

**Advantages:**
- Reliable email service
- Good for transactional emails
- Free tier: 5,000 emails/month

### Option 3: Use AWS SES

**Advantages:**
- Very reliable
- Cost-effective
- Good deliverability
- Free tier: 62,000 emails/month (if on EC2)

## Current Configuration

### Email Settings:
- **Service:** Gmail SMTP
- **Host:** smtp.gmail.com
- **Port:** 465 (SSL)
- **Timeout:** 20 seconds
- **Retries:** 2 attempts
- **Non-blocking:** Yes (won't block requests)

### Environment Variables (Render):
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

## Next Steps

1. **Verify Render Environment Variables:**
   - Check `EMAIL_USER` and `EMAIL_PASS` are set correctly
   - Make sure no extra spaces or quotes

2. **Check Gmail Settings:**
   - 2-Step Verification enabled
   - App Password generated and used
   - No "Less secure app access" enabled

3. **Monitor Logs:**
   - Check Render logs for detailed error messages
   - Look for authentication or connection errors

4. **Consider Alternative:**
   - If Gmail continues to fail, consider using SendGrid or Mailgun
   - These services are more reliable for production use

## Important Notes

- ⚠️ **Emails failing won't break the system** - they're sent non-blocking
- ✅ **System will continue to work** even if emails don't send
- 🔄 **Automatic retries** - system will retry failed emails (2 attempts)
- 📝 **Errors are logged** - check Render logs for details
- ⏱️ **Timeout is 20 seconds** - emails that take longer will timeout

## Support

If emails continue to fail after trying these solutions:
1. Check Render logs for specific error messages
2. Verify Gmail App Password is correct
3. Consider using an alternative email service (SendGrid, Mailgun)
4. Contact Render support if network restrictions are suspected

