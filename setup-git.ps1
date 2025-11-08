# Git Setup Script for Deployment
# Run this script to configure Git before pushing to GitHub

Write-Host "`n🔧 Git Configuration Setup`n" -ForegroundColor Cyan

# Get user email
$email = Read-Host "Enter your email address (for Git commits)"
if ([string]::IsNullOrWhiteSpace($email)) {
    Write-Host "❌ Email is required!" -ForegroundColor Red
    exit 1
}

# Get user name
$name = Read-Host "Enter your name (for Git commits)"
if ([string]::IsNullOrWhiteSpace($name)) {
    Write-Host "❌ Name is required!" -ForegroundColor Red
    exit 1
}

# Configure Git
Write-Host "`n⚙️  Configuring Git..." -ForegroundColor Yellow
git config --global user.email $email
git config --global user.name $name

Write-Host "✅ Git configured successfully!`n" -ForegroundColor Green
Write-Host "📝 Configuration:" -ForegroundColor Cyan
Write-Host "   Name:  $name" -ForegroundColor White
Write-Host "   Email: $email`n" -ForegroundColor White

Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create repository on GitHub.com" -ForegroundColor White
Write-Host "   2. Run: git remote add origin https://github.com/YOUR_USERNAME/inkline-printing-system.git" -ForegroundColor Gray
Write-Host "   3. Run: git commit -m 'Initial commit'" -ForegroundColor Gray
Write-Host "   4. Run: git push -u origin main`n" -ForegroundColor Gray

Write-Host "📖 See NEXT_STEPS.md for complete deployment guide`n" -ForegroundColor Cyan

