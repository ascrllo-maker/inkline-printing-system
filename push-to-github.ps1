# Push to GitHub Script
# This script helps you push your code to GitHub

Write-Host "`n🚀 Push to GitHub`n" -ForegroundColor Cyan

# Get GitHub username
$username = Read-Host "Enter your GitHub username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username is required!" -ForegroundColor Red
    exit 1
}

# Repository name
$repoName = "inkline-printing-system"
$repoUrl = "https://github.com/$username/$repoName.git"

Write-Host "`n📋 Repository URL: $repoUrl" -ForegroundColor Yellow
Write-Host "`n⚠️  Make sure you've created the repository on GitHub.com first!`n" -ForegroundColor Yellow

$confirm = Read-Host "Have you created the repository on GitHub? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "`n📖 Please create the repository first:" -ForegroundColor Cyan
    Write-Host "   1. Go to https://github.com/new" -ForegroundColor White
    Write-Host "   2. Repository name: $repoName" -ForegroundColor White
    Write-Host "   3. DO NOT check 'Initialize with README'" -ForegroundColor White
    Write-Host "   4. Click 'Create repository'`n" -ForegroundColor White
    Write-Host "Then run this script again.`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n⚙️  Setting up Git remote..." -ForegroundColor Yellow

# Remove existing remote if any
git remote remove origin 2>$null

# Add remote
git remote add origin $repoUrl
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add remote. It might already exist." -ForegroundColor Red
    Write-Host "   Trying to update existing remote..." -ForegroundColor Yellow
    git remote set-url origin $repoUrl
}

# Ensure we're on main branch
git branch -M main

Write-Host "✅ Remote configured!" -ForegroundColor Green
Write-Host "`n📤 Pushing to GitHub..." -ForegroundColor Yellow

# Push to GitHub
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully pushed to GitHub!`n" -ForegroundColor Green
    Write-Host "🔗 Repository URL: https://github.com/$username/$repoName" -ForegroundColor Cyan
    Write-Host "`n🚀 Next step: Set up MongoDB Atlas (see STEP2_MONGODB_ATLAS.md)`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Push failed!" -ForegroundColor Red
    Write-Host "`nPossible issues:" -ForegroundColor Yellow
    Write-Host "   1. Repository doesn't exist on GitHub" -ForegroundColor White
    Write-Host "   2. Authentication failed (need Personal Access Token)" -ForegroundColor White
    Write-Host "   3. Network issue`n" -ForegroundColor White
    Write-Host "💡 If authentication fails:" -ForegroundColor Cyan
    Write-Host "   - Create a Personal Access Token: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "   - Use the token as password when prompted`n" -ForegroundColor White
}

