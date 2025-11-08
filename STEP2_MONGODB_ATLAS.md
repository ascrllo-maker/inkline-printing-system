# Step 2: Set Up MongoDB Atlas

## 🎯 Goal
Create a free MongoDB database cluster to store your application data.

---

## 📋 Instructions

### 2.1 Create MongoDB Atlas Account

1. **Go to MongoDB Atlas**: Open [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) in your browser
2. **Sign Up**: Click **"Try Free"** button
3. **Sign Up Options**:
   - Sign up with **Google** (easiest)
   - Or sign up with **Email** (enter email and password)
4. **Fill in Details**:
   - First name
   - Last name
   - Company (optional - can use "Personal" or "School")
   - Click **"Get started free"**

### 2.2 Create Free Cluster

1. **Choose Plan**: 
   - Select **"M0 FREE"** (Free Shared Cluster)
   - Click **"Create"**
2. **Cloud Provider**:
   - Choose **AWS**, **Google Cloud**, or **Azure** (doesn't matter much)
   - Choose the one closest to you
3. **Region**:
   - Select the region closest to your location
   - For example: `US East (N. Virginia)` or `Asia Pacific (Singapore)`
4. **Cluster Name**:
   - Default: `Cluster0` (you can keep this)
   - Or change to: `InkLine-Cluster`
5. **Click "Create Deployment"**
6. **Wait**: It takes 3-5 minutes to create the cluster

### 2.3 Create Database User

While the cluster is being created, you'll see a form to create a database user:

1. **Authentication Method**: Password (already selected)
2. **Username**: `inkline-admin` (or any username you like)
3. **Password**: 
   - Click **"Autogenerate Secure Password"** (recommended)
   - **⚠️ IMPORTANT**: Copy and save this password! You'll need it later.
   - Or create your own password (make it strong!)
4. **Click "Create Database User"**

**⚠️ SAVE THE PASSWORD!** Write it down or save it in a secure place.

### 2.4 Configure Network Access

1. You'll see **"Where would you like to connect from?"** screen
2. **For Development** (optional):
   - Click **"Add My Current IP Address"**
   - This allows you to connect from your current location
3. **For Render.com** (REQUIRED):
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` to allowed IPs
   - **This is needed for Render.com to connect to your database**
4. **Click "Finish and Close"**

### 2.5 Get Connection String

1. **Wait for cluster to be ready** (you'll see a green checkmark)
2. **Click "Connect"** button on your cluster
3. **Choose "Connect your application"**
4. **Driver**: Node.js (should be selected)
5. **Version**: 5.5 or later (should be selected)
6. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2.6 Modify Connection String

You need to modify the connection string:

1. **Replace `<username>`** with your database username (e.g., `inkline-admin`)
2. **Replace `<password>`** with your database password
3. **Add database name**: Change `?retryWrites=true` to `/inkline?retryWrites=true`

**Final connection string should look like:**
```
mongodb+srv://inkline-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/inkline?retryWrites=true&w=majority
```

**⚠️ SAVE THIS CONNECTION STRING!** You'll need it for Render.com.

---

## ✅ Checklist

- [ ] MongoDB Atlas account created
- [ ] Free M0 cluster created
- [ ] Database user created (username: `inkline-admin`)
- [ ] Database password saved
- [ ] Network access configured (0.0.0.0/0 added)
- [ ] Connection string copied
- [ ] Connection string modified (username, password, database name added)
- [ ] Final connection string saved

---

## 🎯 Example Connection String

```
mongodb+srv://inkline-admin:MySecurePassword123@cluster0.abc123.mongodb.net/inkline?retryWrites=true&w=majority
```

Breakdown:
- `inkline-admin` = username
- `MySecurePassword123` = password
- `cluster0.abc123.mongodb.net` = cluster address
- `inkline` = database name
- `?retryWrites=true&w=majority` = connection options

---

## 🆘 Troubleshooting

**Can't create account?**
- Try signing up with Google instead
- Make sure you're using a valid email

**Cluster creation taking too long?**
- Normal - takes 3-5 minutes
- Be patient and wait for the green checkmark

**Forgot password?**
- Go to Database Access → Edit user → Reset password

**Connection string not working?**
- Verify username and password are correct
- Check that network access allows 0.0.0.0/0
- Make sure database name `/inkline` is included

---

## 🚀 Next

After completing these steps, tell me:
1. ✅ "MongoDB Atlas setup complete"
2. Your connection string (or confirm you have it saved)

Then we'll proceed to Step 3: Gmail App Password setup!

---

**Ready? Go set up MongoDB Atlas now!** 🚀

