# Telegram webhook setup for live chat
# 1. Add to .env.local (and Vercel Production env):
#    TELEGRAM_BOT_TOKEN=123456:ABC...
#    TELEGRAM_ADMIN_CHAT_ID=123456789
#    TELEGRAM_WEBHOOK_SECRET=your-random-secret-here
# 2. Run: .\scripts\setup-telegram-webhook.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root '.env.local'

function Read-EnvValue([string]$name) {
  if (-not (Test-Path $envFile)) { return $null }
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*$name=(.+)$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $env:($name)
}

$token = Read-EnvValue 'TELEGRAM_BOT_TOKEN'
$secret = Read-EnvValue 'TELEGRAM_WEBHOOK_SECRET'
$siteUrl = Read-EnvValue 'NEXT_PUBLIC_SITE_URL'
if (-not $siteUrl) { $siteUrl = 'https://my-yoqubkhoja-tj.vercel.app' }

if (-not $token) {
  Write-Host 'TELEGRAM_BOT_TOKEN not found in .env.local or environment.' -ForegroundColor Red
  Write-Host 'Create a bot via @BotFather, then add TELEGRAM_BOT_TOKEN to .env.local'
  exit 1
}

if (-not $secret) {
  $secret = [guid]::NewGuid().ToString('N')
  Write-Host "TELEGRAM_WEBHOOK_SECRET not set. Generated secret (add to .env.local and Vercel):"
  Write-Host $secret -ForegroundColor Yellow
}

$webhookUrl = "$siteUrl/api/telegram/webhook"
$setUrl = "https://api.telegram.org/bot$token/setWebhook?url=$([uri]::EscapeDataString($webhookUrl))&secret_token=$([uri]::EscapeDataString($secret))"

Write-Host "Setting webhook to: $webhookUrl"
$response = Invoke-RestMethod -Uri $setUrl -Method Get
$response | ConvertTo-Json -Depth 5

if (-not $response.ok) {
  Write-Host 'setWebhook failed.' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'Webhook info:'
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method Get
$info | ConvertTo-Json -Depth 5

Write-Host ''
Write-Host 'Done. Ensure these env vars are also set on Vercel Production:' -ForegroundColor Green
Write-Host '  TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_WEBHOOK_SECRET'
