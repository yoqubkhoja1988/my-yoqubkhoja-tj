# Yoqubkhoja Hub — якклик deploy
# Иҷро: powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Yoqubkhoja Hub Deploy ===" -ForegroundColor Cyan

# 1. Build
Write-Host "`n[1/3] Build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# 2. GitHub
Write-Host "`n[2/3] GitHub push..." -ForegroundColor Yellow
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
    Write-Host "GitHub CLI (gh) ёфт нашуд. Насб кунед: winget install GitHub.cli" -ForegroundColor Red
    Write-Host "Ё дастӣ: https://github.com/new -> my-yoqubkhoja-tj" -ForegroundColor Yellow
} else {
    gh auth status 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Воридшавӣ лозим: gh auth login" -ForegroundColor Yellow
        gh auth login
    }
    $repoExists = gh repo view yoqubkhoja1988/my-yoqubkhoja-tj 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Репозитория эҷод мешавад..." -ForegroundColor Green
        gh repo create my-yoqubkhoja-tj --public --source=. --remote=origin --push
    } else {
        git push origin main
    }
}

# 3. Netlify
Write-Host "`n[3/3] Netlify..." -ForegroundColor Yellow
$npx = Get-Command npx -ErrorAction SilentlyContinue
if ($npx) {
    npx --yes netlify-cli deploy --build --prod
} else {
    Write-Host "Netlify: https://app.netlify.com -> Import from GitHub" -ForegroundColor Yellow
}

Write-Host "`n=== Тайёр! ===" -ForegroundColor Green
Write-Host "Сайт: /tj/login" -ForegroundColor Cyan
