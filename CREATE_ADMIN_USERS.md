# Create Admin Users - Step by Step Guide

## Quick Steps

### Step 1: Get MongoDB Connection String from Render

1. **Go to Render Dashboard**:
   - Visit: https://dashboard.render.com
   - Sign in to your account

2. **Navigate to Your Service**:
   - Click on your service: `inkline-printing-system`

3. **Go to Environment Tab**:
   - Click "Environment" in the left sidebar
   - Or go to "Settings" → "Environment"

4. **Copy MONGODB_URI**:
   - Find `MONGODB_URI` in the environment variables
   - Click the eye icon to reveal the value
   - Copy the entire connection string
   - It should look like: `mongodb+srv://inkline-admin:PASSWORD@inkline-cluster.x7ooujj.mongodb.net/inkline?retryWrites=true&w=majority`

### Step 2: Create .env File

1. **In your project folder**, create a file named `.env`

2. **Add the MongoDB connection string**:
   ```
   MONGODB_URI=mongodb+srv://inkline-admin:YOUR_PASSWORD@inkline-cluster.x7ooujj.mongodb.net/inkline?retryWrites=true&w=majority
   ```
   - Replace `YOUR_PASSWORD` with your actual MongoDB password
   - Make sure `/inkline` is included before the `?`

### Step 3: Run the Seed Script

1. **Open terminal** in your project folder

2. **Run the seed script**:
   ```bash
   node run-seed.js
   ```
   Or:
   ```bash
   npm run seed-users
   ```

3. **Wait for completion**:
   - You should see: `✅ Created user: itadmin@test.com (Role: it_admin)`
   - You should see: `✅ Created user: sscadmin@test.com (Role: ssc_admin)`

### Step 4: Verify Admin Users Created

The script will display:
```
🎉 Admin users created successfully!

📋 Admin Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IT Admin Portal:
  Email: itadmin@test.com
  Password: password123

SSC Admin Portal:
  Email: sscadmin@test.com
  Password: password123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Alternative: Get Connection String from MongoDB Atlas

If you prefer to get it from MongoDB Atlas:

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy the connection string**
5. **Modify it**:
   - Replace `<password>` with your actual password
   - Add `/inkline` before `?retryWrites`
   - Example: `mongodb+srv://inkline-admin:PASSWORD@inkline-cluster.x7ooujj.mongodb.net/inkline?retryWrites=true&w=majority`

## Troubleshooting

### Error: "MONGODB_URI not found"
- **Solution**: Create a `.env` file in your project root with `MONGODB_URI=your-connection-string`

### Error: "authentication failed"
- **Solution**: Check your MongoDB username and password
- Make sure password is URL-encoded if it has special characters
- Verify the connection string format is correct

### Error: "network" or "ENOTFOUND"
- **Solution**: Check MongoDB Atlas Network Access
- Go to MongoDB Atlas → Network Access
- Make sure `0.0.0.0/0` is allowed

### Error: "User already exists"
- **Solution**: This is okay! The script will skip existing users
- Or manually delete them from MongoDB if needed

## After Creating Admin Users

1. **Go to your application**: https://inkline-printing-system.onrender.com/login
2. **Log in with admin credentials**:
   - IT Admin: `itadmin@test.com` / `password123`
   - SSC Admin: `sscadmin@test.com` / `password123`
3. **You'll be automatically redirected** to the admin portal

## Security Note

⚠️ **Change the default passwords** (`password123`) after first login for security!

---

**Ready to create admin users? Follow the steps above!** 🚀

