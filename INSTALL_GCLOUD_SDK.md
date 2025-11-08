# Installing Google Cloud SDK on Windows

## Step 1: Download Google Cloud SDK

### Option A: Using the Installer (Recommended)

1. **Download the installer**:
   - Go to: https://cloud.google.com/sdk/docs/install-sdk#windows
   - Click "Download Google Cloud CLI installer for Windows"
   - Or direct link: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe

2. **Run the installer**:
   - Double-click `GoogleCloudSDKInstaller.exe`
   - Follow the installation wizard
   - **Important**: Check "Run gcloud init" at the end

3. **Restart your terminal**:
   - Close and reopen PowerShell/Command Prompt
   - The installer adds gcloud to your PATH

### Option B: Using Package Manager (Chocolatey)

If you have Chocolatey installed:

```powershell
choco install gcloudsdk
```

### Option C: Manual Installation

1. **Download the ZIP file**:
   - Go to: https://cloud.google.com/sdk/docs/install-sdk#windows
   - Download "Google Cloud SDK for Windows (zip)"

2. **Extract and install**:
   - Extract the ZIP file
   - Run `install.bat` from the extracted folder
   - Follow the prompts

---

## Step 2: Verify Installation

After installation, verify it works:

```powershell
# Check version
gcloud --version

# You should see output like:
# Google Cloud SDK 450.0.0
# ...
```

---

## Step 3: Initialize Google Cloud SDK

After installation, you need to initialize:

```powershell
# Login to Google Cloud
gcloud auth login

# This will open your browser to authenticate
# Select your Google account and grant permissions

# Initialize gcloud (if not done automatically)
gcloud init
```

---

## Troubleshooting

### If `gcloud` command is not recognized:

1. **Restart your terminal** (close and reopen PowerShell)
2. **Check PATH**: The installer should add gcloud to PATH automatically
3. **Manual PATH addition** (if needed):
   - Add to PATH: `C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin`
   - Or: `C:\Users\YourUsername\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`

### To check if gcloud is in PATH:

```powershell
# Check if gcloud is found
where.exe gcloud

# If it shows a path, it's installed correctly
# If not, you need to add it to PATH manually
```

---

## Next Steps

After installing and verifying:

1. ✅ Run: `gcloud --version` (should work)
2. ✅ Run: `gcloud auth login` (authenticate)
3. ✅ Proceed to Step 2: Set Up Google Cloud Project

---

## Quick Installation Commands

```powershell
# After installation, verify:
gcloud --version

# Login:
gcloud auth login

# Check if authenticated:
gcloud auth list
```

---

**Once installed, come back and we'll proceed to Step 2!** 🚀


