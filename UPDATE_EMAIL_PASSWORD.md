# Update Email Password in Render

## Step-by-Step Instructions

### Step 1: Go to Render Dashboard
1. Go to https://dashboard.render.com
2. Log in to your account
3. Click on your service: **inkline-printing-system**

### Step 2: Open Environment Variables
1. Click on **"Environment"** in the left sidebar
2. Or click on **"Environment"** tab at the top

### Step 3: Update EMAIL_PASS
1. Find the `EMAIL_PASS` variable in the list
2. Click on it to edit
3. **Delete the old value**
4. **Enter the new App Password:** `rjijirttcmqwovfv`
5. **Important:** 
   - No quotes
   - No spaces
   - Exact value: `rjijirttcmqwovfv`
6. Click **"Save Changes"**

### Step 4: Verify EMAIL_USER
Make sure `EMAIL_USER` is also set:
- Should be your Gmail address (e.g., `your-email@gmail.com`)
- No quotes
- No spaces

### Step 5: Wait for Redeploy
- Render will automatically detect the change
- It will redeploy your service (takes 5-10 minutes)
- You'll see "Deploying..." status

### Step 6: Test Email
After redeploy completes:
1. Create a test order in the system
2. Check Render logs for email status
3. Look for: `✉️ Email sent successfully`
4. Check your email inbox (and spam folder)

## Quick Checklist

- [ ] Logged into Render Dashboard
- [ ] Navigated to your service
- [ ] Opened Environment tab
- [ ] Updated `EMAIL_PASS` to: `rjijirttcmqwovfv`
- [ ] Verified `EMAIL_USER` is set (your Gmail address)
- [ ] Saved changes
- [ ] Waited for redeploy (5-10 minutes)
- [ ] Tested email sending

## Important Notes

### ✅ Do's:
- ✅ Use the App Password exactly as generated: `rjijirttcmqwovfv`
- ✅ Make sure `EMAIL_USER` is your Gmail address
- ✅ Wait for Render to redeploy after updating
- ✅ Check Render logs after testing

### ❌ Don'ts:
- ❌ Don't add quotes around the password
- ❌ Don't add spaces
- ❌ Don't use your regular Gmail password
- ❌ Don't forget to save changes

## Environment Variables Should Look Like:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=rjijirttcmqwovfv
```

**No quotes, no spaces, exact values.**

## Troubleshooting

### If email still doesn't work:

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for email-related errors
   - Check for authentication errors

2. **Verify Gmail Settings:**
   - 2-Step Verification is enabled
   - App Password is generated correctly
   - Check: https://myaccount.google.com/apppasswords

3. **Wait a few minutes:**
   - Sometimes it takes time for changes to take effect
   - Gmail might need a moment to recognize the new App Password

4. **Check Render Status:**
   - Make sure service is deployed and running
   - Check if there are any deployment errors

## After Updating

Once you've updated the password in Render:

1. **Wait for redeploy** (5-10 minutes)
2. **Test email sending** (create a test order)
3. **Check Render logs** for email status
4. **Check your email** (inbox and spam folder)

## Success Indicators

You'll know it's working when you see:
- ✅ `✉️ Email sent successfully` in Render logs
- ✅ Email received in your inbox
- ✅ No timeout errors in logs
- ✅ No authentication errors

## Need Help?

If emails still don't work after updating:
1. Check `EMAIL_TROUBLESHOOTING.md` for detailed solutions
2. Verify Gmail App Password is correct
3. Check Render logs for specific error messages
4. Consider using SendGrid or Mailgun as alternative

