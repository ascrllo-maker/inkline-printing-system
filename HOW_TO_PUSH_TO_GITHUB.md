# How to Push Code to GitHub

## 📍 Where to Run the Command

You need to run the `git push -u origin main` command in your **project folder** using a terminal.

---

## 🖥️ Option 1: PowerShell (Recommended for Windows)

### Step 1: Open PowerShell
1. **Press `Windows Key + X`** or right-click the Start button
2. Click **"Windows PowerShell"** or **"Terminal"**
3. Or search for "PowerShell" in the Start menu

### Step 2: Navigate to Your Project
```powershell
cd C:\Users\airlc\Desktop\inkline-printing-system
```

### Step 3: Run the Push Command
```powershell
git push -u origin main
```

---

## 🖥️ Option 2: Command Prompt (CMD)

### Step 1: Open Command Prompt
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. Or search for "Command Prompt" in the Start menu

### Step 2: Navigate to Your Project
```cmd
cd C:\Users\airlc\Desktop\inkline-printing-system
```

### Step 3: Run the Push Command
```cmd
git push -u origin main
```

---

## 🖥️ Option 3: VS Code Terminal (Easiest!)

### Step 1: Open VS Code
1. Open your project in VS Code (if not already open)
2. The project folder should be: `C:\Users\airlc\Desktop\inkline-printing-system`

### Step 2: Open Terminal in VS Code
1. Press **`Ctrl + ~`** (Control + tilde)
2. Or go to **Terminal** → **New Terminal** from the menu
3. The terminal will automatically be in your project directory

### Step 3: Run the Push Command
```bash
git push -u origin main
```

---

## 🖥️ Option 4: Git Bash

### Step 1: Open Git Bash
1. Right-click in your project folder (`C:\Users\airlc\Desktop\inkline-printing-system`)
2. Select **"Git Bash Here"**
3. Git Bash will open in that directory

### Step 2: Run the Push Command
```bash
git push -u origin main
```

---

## ✅ Verify You're in the Right Directory

Before running the command, make sure you're in the correct folder. Run this command to check:

**PowerShell/CMD:**
```powershell
pwd
```
or
```cmd
cd
```

**Git Bash:**
```bash
pwd
```

You should see: `C:\Users\airlc\Desktop\inkline-printing-system`

---

## 🚀 Complete Steps

1. **Open Terminal** (any of the options above)
2. **Navigate to project** (if not already there):
   ```bash
   cd C:\Users\airlc\Desktop\inkline-printing-system
   ```
3. **Verify you're in the right place**:
   ```bash
   pwd
   # or
   dir
   ```
   You should see your project files (package.json, server/, client/, etc.)
4. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

---

## 🔐 Authentication

When you run `git push`, you may be asked for:
- **Username**: `ascrllo-maker`
- **Password**: Use a **Personal Access Token** (not your GitHub password)

### How to Get Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Token name**: `InkLine Deployment`
4. **Expiration**: Choose your preference
5. **Select scopes**: Check `repo`
6. Click **"Generate token"**
7. **Copy the token** (you won't see it again!)
8. When Git asks for password, **paste the token**

---

## ✅ Success!

After pushing, you should see:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/ascrllo-maker/inkline-printing-system.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

Then verify at: https://github.com/ascrllo-maker/inkline-printing-system

---

## 🆘 Troubleshooting

### Error: "Repository not found"
- Make sure you've created the repository on GitHub first
- Go to: https://github.com/new
- Create repository: `inkline-printing-system`

### Error: "Authentication failed"
- Use Personal Access Token instead of password
- Make sure token has `repo` scope

### Error: "Permission denied"
- Verify your GitHub username: `ascrllo-maker`
- Check repository exists on GitHub
- Verify you're using the correct repository URL

---

## 💡 Quick Summary

**Easiest Way:**
1. Open VS Code
2. Press `Ctrl + ~` to open terminal
3. Run: `git push -u origin main`
4. Use Personal Access Token when prompted

**That's it!** 🚀

