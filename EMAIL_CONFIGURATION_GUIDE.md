# Email Configuration Guide - InkLine Printing System

This guide will help you configure Gmail credentials for email notifications.

---

## Overview

The system uses **Gmail** to send email notifications to students. You need:
1. A Gmail account
2. A Gmail App Password (16-character password)
3. Add credentials to `.env` file

---

## Step 1: Get Gmail App Password

### Why App Password?

Gmail requires an "App Password" (not your regular password) for third-party applications like this system.

### How to Get App Password:

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com
   - Sign in with your Gmail account

2. **Enable 2-Step Verification** (Required)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the steps to enable it
   - **Note:** You MUST enable 2-Step Verification first!

3. **Create App Password**
   - Go directly to: https://myaccount.google.com/apppasswords
   - OR: Google Account → Security → 2-Step Verification → App passwords
   
4. **Generate App Password**
   - Select app: **"Mail"**
   - Select device: **"Other (Custom name)"**
   - Enter name: **"InkLine Printing System"**
   - Click **"Generate"**

5. **Copy the 16-Character Password**
   - Google will show a 16-character password
   - Example: `abcd efgh ijkl mnop`
   - **Copy this immediately!** (You won't see it again)
   - **Remove all spaces** when using it: `abcdefghijklmnop`

---

## Step 2: Configure .env File

### Location

The `.env` file should be in the `server` directory:
```
inkline-printing-system/
  └── server/
      └── .env
```

### Create/Edit .env File

1. **Navigate to server directory:**
   ```cmd
   cd C:\Users\airlc\Desktop\inkline-printing-system\server
   ```

2. **Create or edit `.env` file:**
   - If file doesn't exist, create it
   - If file exists, open it in a text editor

3. **Add email credentials:**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### Example:

```env
# Email Configuration
EMAIL_USER=inklinefordvc@gmail.com
EMAIL_PASS=nxqexjkjtegasole
```

**Important:**
- ✅ Use your Gmail address for `EMAIL_USER`
- ✅ Use the 16-character App Password (no spaces) for `EMAIL_PASS`
- ✅ Do NOT use your regular Gmail password
- ✅ Do NOT include quotes around the values

---

## Step 3: Verify Configuration

### Check if .env File Exists

```cmd
cd C:\Users\airlc\Desktop\inkline-printing-system\server
dir .env
```

### View .env File (Optional - Be Careful!)

```cmd
type .env
```

**Note:** Be careful not to share your `.env` file - it contains sensitive information!

---

## Step 4: Test Email Configuration

### Test Email Script

The system includes a test script to verify email works:

```cmd
cd C:\Users\airlc\Desktop\inkline-printing-system
node server/scripts/testEmail.js your-email@example.com
```

**Replace `your-email@example.com` with your actual email address.**

### Expected Output:

```
🧪 Testing Gmail Integration...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Email credentials found
   From: inklinefordvc@gmail.com
   To: your-email@example.com

📧 Sending test email...

✉️ Email sent successfully to: your-email@example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS! Test email sent successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📬 Please check the inbox for: your-email@example.com
   (Also check spam/junk folder if not in inbox)

💡 Your Gmail integration is working correctly!
```

### If Test Fails:

**Error: "Email credentials not configured"**
- Check if `.env` file exists in `server` directory
- Check if `EMAIL_USER` and `EMAIL_PASS` are set
- Make sure there are no spaces or quotes

**Error: "Authentication failed"**
- Verify App Password is correct (16 characters, no spaces)
- Make sure 2-Step Verification is enabled
- Try generating a new App Password

**Error: "Connection failed"**
- Check your internet connection
- Check if Gmail is accessible

---

## Step 5: Restart Server

After configuring email credentials, **restart your server** for changes to take effect:

### If using `npm run dev`:
1. Stop server: Press `Ctrl + C`
2. Start server: `npm run dev`

### If using PM2:
```cmd
pm2 restart inkline-server
```

---

## Complete .env File Example

Here's what a complete `.env` file should look like:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/inkline

# JWT Secret
JWT_SECRET=your-strong-random-secret-here

# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Email Configuration
EMAIL_USER=inklinefordvc@gmail.com
EMAIL_PASS=nxqexjkjtegasole
```

---

## Troubleshooting

### "App passwords" option not showing

**Problem:** Can't find "App passwords" in Google settings

**Solution:**
1. Make sure 2-Step Verification is enabled first
2. Go directly to: https://myaccount.google.com/apppasswords
3. If still not showing, your Google account might not support App Passwords
   - Some work/school accounts don't support it
   - Try using a personal Gmail account

### "Invalid login" error

**Problem:** Email authentication fails

**Solutions:**
1. Double-check App Password (16 characters, no spaces)
2. Make sure you're using App Password, not regular password
3. Verify 2-Step Verification is enabled
4. Try generating a new App Password

### "Email not configured" warning

**Problem:** Server shows email is not configured

**Solutions:**
1. Check if `.env` file exists in `server` directory
2. Check if `EMAIL_USER` and `EMAIL_PASS` are in `.env`
3. Make sure there are no typos
4. Restart server after adding credentials

### Emails going to spam

**Problem:** Emails are received but in spam folder

**Solutions:**
1. This is normal for new email senders
2. Ask recipients to mark as "Not Spam"
3. Over time, Gmail will learn these are legitimate emails
4. Consider using a custom domain email (advanced)

---

## Security Notes

### ⚠️ Important Security Tips:

1. **Never commit `.env` to Git**
   - `.env` file should be in `.gitignore`
   - Contains sensitive credentials

2. **Don't share your App Password**
   - Keep it secret
   - If compromised, generate a new one

3. **Use strong App Password**
   - 16 characters (automatically generated)
   - Don't modify it

4. **Regularly rotate passwords**
   - Change App Password every few months
   - Update `.env` file when changed

---

## What Emails Are Sent?

Once configured, the system automatically sends:

1. **Welcome Email** - When student creates account
2. **Account Approval Email** - When BSIT student is approved
3. **Order Created Email** - When student creates printing order
4. **Order Printing Email** - When order starts printing
5. **Order Ready Email** - When order is ready for pickup
6. **Violation Warning Email** - When admin sends violation
7. **Violation Settled Email** - When violation is settled

---

## Quick Reference

### File Location:
```
server/.env
```

### Required Variables:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Test Command:
```cmd
node server/scripts/testEmail.js your-email@example.com
```

### Get App Password:
https://myaccount.google.com/apppasswords

---

## Step-by-Step Checklist

- [ ] Enable 2-Step Verification on Gmail
- [ ] Generate Gmail App Password
- [ ] Copy 16-character App Password (remove spaces)
- [ ] Create/edit `server/.env` file
- [ ] Add `EMAIL_USER=your-email@gmail.com`
- [ ] Add `EMAIL_PASS=your-app-password`
- [ ] Save `.env` file
- [ ] Test email: `node server/scripts/testEmail.js your-email@example.com`
- [ ] Check email inbox (and spam folder)
- [ ] Restart server
- [ ] Verify emails are working

---

## Need Help?

If you encounter issues:

1. **Check server logs** for error messages
2. **Verify App Password** is correct
3. **Test email** using the test script
4. **Check spam folder** for test emails
5. **Restart server** after configuration changes

---

**Your email configuration is complete!** 🎉

Once configured, all students will automatically receive email notifications when they:
- Create accounts
- Get account approved
- Create orders
- Have order status updates
- Receive violations

