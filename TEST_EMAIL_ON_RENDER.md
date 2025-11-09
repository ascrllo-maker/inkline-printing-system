# Test Email on Render - Instructions

## Quick Test

After Render redeploys (5-10 minutes), you can test email by visiting this URL in your browser:

```
https://inkline-printing-system.onrender.com/api/test/email?to=your-email@example.com
```

**Replace `your-email@example.com` with your actual email address.**

## Steps

### 1. Wait for Render to Redeploy
- After pushing changes, Render will automatically redeploy
- Wait 5-10 minutes for deployment to complete
- Check Render dashboard for deployment status

### 2. Test Email Endpoint
Open your browser and visit:
```
https://inkline-printing-system.onrender.com/api/test/email?to=YOUR-EMAIL@gmail.com
```

**Example:**
```
https://inkline-printing-system.onrender.com/api/test/email?to=test@gmail.com
```

### 3. Check Response
You should see a JSON response:

**If successful:**
```json
{
  "success": true,
  "message": "Test email sent successfully to test@gmail.com",
  "details": {
    "from": "your-email@gmail.com",
    "to": "test@gmail.com",
    "messageId": "...",
    "timestamp": "2024-11-09T..."
  }
}
```

**If failed:**
```json
{
  "success": false,
  "message": "Failed to send test email",
  "error": "Error message here",
  "details": {
    "from": "your-email@gmail.com",
    "to": "test@gmail.com"
  }
}
```

### 4. Check Your Email
- Check your email inbox
- Also check spam/junk folder
- Email subject: "InkLine - Email Integration Test"

### 5. Check Render Logs
- Go to Render Dashboard → Your Service → Logs
- Look for email-related messages:
  - `✅ Test email sent successfully` = Working
  - `❌ Test email failed` = Check error details

## Alternative: Test by Creating an Order

You can also test email by creating an order in the system:

1. **Log in to the student portal**
2. **Select a printing shop**
3. **Create a test order**
4. **Check your email** for "Order Created" notification
5. **Check Render logs** for email status

## Troubleshooting

### If email test fails:

1. **Check Render Environment Variables:**
   - `EMAIL_USER` is set (your Gmail address)
   - `EMAIL_PASS` is set (16-character App Password: `rjijirttcmqwovfv`)
   - No quotes, no spaces

2. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for specific error messages
   - Check for authentication or connection errors

3. **Verify Gmail Settings:**
   - 2-Step Verification is enabled
   - App Password is generated correctly
   - Check: https://myaccount.google.com/apppasswords

4. **Wait a few minutes:**
   - Sometimes it takes time for changes to take effect
   - Gmail might need a moment to recognize the new App Password

## Expected Results

### ✅ Success:
- JSON response shows `"success": true`
- Email received in inbox
- Render logs show: `✅ Test email sent successfully`
- No error messages in logs

### ❌ Failure:
- JSON response shows `"success": false`
- Error message in response
- Render logs show error details
- Check `EMAIL_TROUBLESHOOTING.md` for solutions

## Test URL Format

```
https://inkline-printing-system.onrender.com/api/test/email?to=EMAIL_ADDRESS
```

**Replace `EMAIL_ADDRESS` with your email.**

## Quick Test Command (Using curl)

If you have curl installed, you can test from command line:

```bash
curl "https://inkline-printing-system.onrender.com/api/test/email?to=your-email@example.com"
```

## Next Steps

After testing:
1. ✅ If successful: Email is working! System will send notifications automatically
2. ❌ If failed: Check `EMAIL_TROUBLESHOOTING.md` for detailed solutions
3. 📧 Check your email inbox and spam folder
4. 📝 Check Render logs for detailed error messages

## Important Notes

- ⚠️ **Wait for Render to redeploy** before testing (5-10 minutes)
- ✅ **Test endpoint is public** (no authentication required for testing)
- 📧 **Email may take a few seconds** to arrive
- 📬 **Check spam folder** if not in inbox
- 🔍 **Check Render logs** for detailed status

