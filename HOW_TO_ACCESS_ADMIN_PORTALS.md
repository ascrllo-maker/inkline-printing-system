# How to Access IT and SSC Admin Portals

## 📋 Overview

The IT and SSC Admin Portals are accessed through the login page. You need admin credentials to access them.

---

## 🚀 Step 1: Create Admin Users

**IMPORTANT**: Admin users must be created in your database first!

### Option A: Run Seed Script (Recommended)

1. **Open your project locally** (or use Render Shell if available)

2. **Create/Update `.env` file** with your MongoDB connection string:
   ```
   MONGODB_URI=your-mongodb-connection-string-from-render
   ```

3. **Run the seed script**:
   ```bash
   npm run seed-users
   ```
   Or:
   ```bash
   node server/scripts/seedUsers.js
   ```

4. **Verify users were created**:
   - You should see:
     ```
     ✅ Created user: itadmin@test.com (Role: it_admin)
     ✅ Created user: sscadmin@test.com (Role: ssc_admin)
     ```

### Option B: Manual Creation (Alternative)

If you can't run the seed script, you can create admin users manually through the application by modifying the signup process, or directly in MongoDB (not recommended).

---

## 🔑 Step 2: Admin Credentials

After running the seed script, use these credentials:

### IT Admin Portal
- **Email**: `itadmin@test.com`
- **Password**: `password123`
- **URL**: `https://inkline-printing-system.onrender.com/admin/it`

### SSC Admin Portal
- **Email**: `sscadmin@test.com`
- **Password**: `password123`
- **URL**: `https://inkline-printing-system.onrender.com/admin/ssc`

---

## 🌐 Step 3: Access the Portals

### Method 1: Through Login Page (Recommended)

1. **Go to your application**:
   - URL: `https://inkline-printing-system.onrender.com`
   - Or: `https://inkline-printing-system.onrender.com/login`

2. **Log in with admin credentials**:
   - Enter email: `itadmin@test.com` or `sscadmin@test.com`
   - Enter password: `password123`
   - Click "Log In"

3. **Automatic Redirect**:
   - IT Admin → Automatically redirected to `/admin/it`
   - SSC Admin → Automatically redirected to `/admin/ssc`

### Method 2: Direct URL Access

1. **IT Admin Portal**:
   - URL: `https://inkline-printing-system.onrender.com/admin/it`
   - You'll be redirected to login if not authenticated
   - Log in with IT Admin credentials

2. **SSC Admin Portal**:
   - URL: `https://inkline-printing-system.onrender.com/admin/ssc`
   - You'll be redirected to login if not authenticated
   - Log in with SSC Admin credentials

---

## 🔐 Step 4: Login Process

1. **Visit the login page**:
   - `https://inkline-printing-system.onrender.com/login`

2. **Enter credentials**:
   - **IT Admin**: 
     - Email: `itadmin@test.com`
     - Password: `password123`
   - **SSC Admin**: 
     - Email: `sscadmin@test.com`
     - Password: `password123`

3. **Click "Log In"**

4. **Automatic Redirect**:
   - Based on your role, you'll be automatically redirected:
     - `it_admin` → `/admin/it` (IT Admin Portal)
     - `ssc_admin` → `/admin/ssc` (SSC Admin Portal)
     - `student` → `/student` (Student Portal)

---

## 📍 Portal URLs

### IT Admin Portal
```
https://inkline-printing-system.onrender.com/admin/it
```

### SSC Admin Portal
```
https://inkline-printing-system.onrender.com/admin/ssc
```

### Login Page
```
https://inkline-printing-system.onrender.com/login
```

---

## ✅ Quick Access Summary

1. **Create admin users** (run seed script)
2. **Go to login page**: `https://inkline-printing-system.onrender.com/login`
3. **Log in with admin credentials**:
   - IT Admin: `itadmin@test.com` / `password123`
   - SSC Admin: `sscadmin@test.com` / `password123`
4. **Automatic redirect** to the appropriate admin portal

---

## 🛡️ Security Notes

### Change Default Passwords

**IMPORTANT**: The default passwords (`password123`) are for testing only. For production:

1. **Change passwords after first login** (if this feature is implemented)
2. **Or create new admin users** with stronger passwords
3. **Use strong passwords** (at least 12 characters, mix of letters, numbers, symbols)

### Create Custom Admin Users

You can create additional admin users by:
1. Running the seed script with custom credentials
2. Or manually creating users in MongoDB with the appropriate role

---

## 🆘 Troubleshooting

### Issue: "Invalid email or password"
- **Solution**: Make sure you ran the seed script to create the admin users
- **Check**: Verify users exist in MongoDB

### Issue: Redirected to login after entering credentials
- **Solution**: Check that the user has the correct role (`it_admin` or `ssc_admin`)
- **Check**: Verify `accountStatus` is `approved`

### Issue: "Access denied" error
- **Solution**: Make sure you're using the correct admin credentials
- **Check**: Verify the user role matches the portal you're trying to access

### Issue: Can't run seed script
- **Solution**: 
  1. Make sure you have the MongoDB connection string
  2. Create `.env` file with `MONGODB_URI`
  3. Install dependencies: `npm install`
  4. Run: `npm run seed-users`

---

## 📝 Next Steps

After accessing the admin portals:

1. **IT Admin Portal**:
   - Approve pending BSIT student accounts
   - Manage IT Printing Shop orders
   - Manage printers
   - Manage users and violations

2. **SSC Admin Portal**:
   - Manage SSC Printing Shop orders
   - Manage printers
   - Manage users and violations

---

## 🎯 Summary

**To access IT/SSC Admin Portals:**

1. ✅ Run seed script to create admin users
2. ✅ Go to login page
3. ✅ Log in with admin credentials
4. ✅ Automatically redirected to admin portal

**IT Admin**: `itadmin@test.com` / `password123` → `/admin/it`  
**SSC Admin**: `sscadmin@test.com` / `password123` → `/admin/ssc`

---

**Ready to access? Run the seed script first, then log in!** 🚀

