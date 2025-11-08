# How to Get MongoDB Connection String from Render

## Quick Steps

1. **Go to Render Dashboard**:
   - https://dashboard.render.com
   - Sign in

2. **Select Your Service**:
   - Click on `inkline-printing-system`

3. **Go to Environment**:
   - Click "Environment" in left sidebar
   - Or: Settings → Environment

4. **Find MONGODB_URI**:
   - Scroll to find `MONGODB_URI`
   - Click the eye icon 👁️ to reveal the value
   - Copy the entire connection string

5. **Paste it here**:
   - I'll use it to create the admin users

---

## Or Get from MongoDB Atlas

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com
2. **Click "Connect"** on your cluster
3. **Choose "Connect your application"**
4. **Copy connection string**
5. **Replace**:
   - `<password>` with your actual password
   - Add `/inkline` before `?retryWrites`
6. **Paste it here**

---

**Once you provide the connection string, I'll create the admin users for you!**

