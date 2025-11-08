# Step 3: Get Gmail App Password

## 🎯 Goal
Generate a Gmail App Password so your application can send email notifications.

---

## 📋 Instructions

### 3.1 Enable 2-Step Verification

1. **Go to Google Account Security**: 
   - Open [myaccount.google.com/security](https://myaccount.google.com/security) in your browser
   - Sign in with your Gmail account
2. **Find "2-Step Verification"**:
   - Scroll down to **"Signing in to Google"** section
   - Find **"2-Step Verification"**
3. **Enable 2-Step Verification**:
   - Click **"2-Step Verification"**
   - Click **"Get Started"** (if not already enabled)
   - Follow the setup process:
     - Enter your password
     - Add a phone number
     - Verify with text message or phone call
     - Turn on 2-Step Verification
4. **Confirm**: You should see "2-Step Verification" is **ON**

**⚠️ Note**: If 2-Step Verification is already enabled, you can skip to step 3.2.

### 3.2 Generate App Password

1. **Go to App Passwords**:
   - Open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) in your browser
   - Or go to Security → 2-Step Verification → App passwords
2. **Sign in again** (if prompted)
3. **Create App Password**:
   - **Select app**: Choose **"Mail"**
   - **Select device**: Choose **"Other (Custom name)"**
   - **Enter name**: Type `InkLine Printing System`
   - Click **"Generate"**
4. **Copy the App Password**:
   - You'll see a 16-character password (e.g., `abcd efgh ijkl mnop`)
   - **⚠️ IMPORTANT**: Copy this password immediately!
   - It will be shown only once
   - Click **"Done"**

### 3.3 Save App Password

**⚠️ SAVE THIS PASSWORD!**

The App Password is a 16-character code like:
```
abcd efgh ijkl mnop
```

**Remove spaces** when using it:
```
abcdefghijklmnop
```

**Save it in a secure place** - you'll need it for Render.com!

---

## ✅ Checklist

- [ ] 2-Step Verification enabled on Google account
- [ ] App Password generated
- [ ] App Password copied (16 characters)
- [ ] App Password saved securely
- [ ] Gmail address noted (e.g., `your-email@gmail.com`)

---

## 🎯 What You'll Need for Render.com

You'll need these for Render.com environment variables:

1. **EMAIL_USER**: Your Gmail address
   - Example: `your-email@gmail.com`

2. **EMAIL_PASS**: Your 16-character App Password (no spaces)
   - Example: `abcdefghijklmnop`

---

## 🆘 Troubleshooting

**Can't find App Passwords?**
- Make sure 2-Step Verification is enabled first
- Try this direct link: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

**"App passwords" option not showing?**
- Make sure 2-Step Verification is enabled
- Some Google Workspace accounts don't support App Passwords
- Try using a personal Gmail account instead

**Forgot App Password?**
- Generate a new one (old one will stop working)
- Go to App Passwords → Generate new password

**Password not working?**
- Make sure there are no spaces in the password
- Verify you're using the App Password, not your Gmail password
- Check that 2-Step Verification is still enabled

---

## 🔒 Security Notes

- **App Passwords are secure**: They're separate from your main Gmail password
- **You can revoke them**: Go to App Passwords and delete any you don't need
- **One password per app**: Each app/service should have its own App Password
- **Don't share**: Keep App Passwords private

---

## 🚀 Next

After completing these steps, tell me:
1. ✅ "Gmail App Password setup complete"
2. Your Gmail address (or confirm you have it)

Then we'll proceed to Step 4: Deploy to Render.com!

---

## 📝 Quick Reference

**What you need:**
- Gmail address: `your-email@gmail.com`
- App Password: `abcdefghijklmnop` (16 characters, no spaces)

**Where to use it:**
- Render.com environment variables:
  - `EMAIL_USER` = your Gmail address
  - `EMAIL_PASS` = your App Password

---

**Ready? Go set up Gmail App Password now!** 🚀

