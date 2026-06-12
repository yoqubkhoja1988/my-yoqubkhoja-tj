# Full Telegram setup for live chat (local + Vercel + webhook)
# Usage:
#   .\scripts\setup-telegram-vercel.ps1 -BotToken "123456:ABC..."
# Optional:
#   -AdminChatId "123456789"
#   -SkipDeploy

param(
  [Parameter(Mandatory = $false)]
  [string]$BotToken = '',
  [string]$AdminChatId = '',
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$envFile = Join-Path $root '.env.local'

function Read-EnvLocal([string]$name) {
  if (-not (Test-Path $envFile)) { return $null }
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*$name=(.+)$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

if (-not $BotToken -or $BotToken -match 'TOKEN|BOTFATHER|АЗ|placeholder' -or $BotToken -notmatch '^\d+:[A-Za-z0-9_-]+$') {
  $fromFile = Read-EnvLocal 'TELEGRAM_BOT_TOKEN'
  if ($fromFile -and $fromFile -match '^\d+:[A-Za-z0-9_-]+$') {
    $BotToken = $fromFile
  }
}

if (-not $BotToken -or $BotToken -notmatch '^\d+:[A-Za-z0-9_-]+$') {
  Write-Host 'Bot token not found or invalid.' -ForegroundColor Red
  Write-Host 'Get TOKEN from @BotFather (/newbot), then run:'
  Write-Host '  .\scripts\setup-telegram-vercel.ps1 -BotToken "123456789:AAH..."'
  exit 1
}

if (-not $AdminChatId) {
  $fromFileChat = Read-EnvLocal 'TELEGRAM_ADMIN_CHAT_ID'
  if ($fromFileChat) { $AdminChatId = $fromFileChat }
}

$siteUrl = 'https://my-yoqubkhoja-tj.vercel.app'
$webhookSecret = [guid]::NewGuid().ToString('N')
$webhookUrl = "$siteUrl/api/telegram/webhook"

Write-Host '=== Telegram setup ===' -ForegroundColor Cyan

$me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/getMe" -Method Get
if (-not $me.ok) {
  Write-Host 'Invalid bot token.' -ForegroundColor Red
  exit 1
}
Write-Host "Bot: @$($me.result.username)" -ForegroundColor Green

if (-not $AdminChatId) {
  Write-Host 'Discovering admin chat id from getUpdates (send /start to bot first if empty)...'
  $updates = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/getUpdates?limit=20" -Method Get
  foreach ($item in ($updates.result | Select-Object -Last 20)) {
    $username = $item.message.from.username
    if ($username -eq 'yoqubkhoja1988') {
      $AdminChatId = [string]$item.message.chat.id
      break
    }
  }
}

Write-Host 'Setting webhook...'
$setBody = @{
  url = $webhookUrl
  secret_token = $webhookSecret
  allowed_updates = @('message')
} | ConvertTo-Json
$set = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/setWebhook" -Method Post -ContentType 'application/json' -Body $setBody
if (-not $set.ok) {
  Write-Host 'setWebhook failed.' -ForegroundColor Red
  exit 1
}

function Add-EnvLocal([string]$name, [string]$value) {
  $envFile = Join-Path $root '.env.local'
  $lines = @()
  if (Test-Path $envFile) { $lines = Get-Content $envFile }
  $filtered = $lines | Where-Object { $_ -notmatch "^\s*$name=" }
  $filtered += "$name=$value"
  Set-Content -Path $envFile -Value ($filtered -join "`n") -Encoding UTF8
}

Add-EnvLocal 'TELEGRAM_BOT_TOKEN' $BotToken
Add-EnvLocal 'TELEGRAM_WEBHOOK_SECRET' $webhookSecret
if ($AdminChatId) {
  Add-EnvLocal 'TELEGRAM_ADMIN_CHAT_ID' $AdminChatId
}

Write-Host 'Adding env vars to Vercel...'
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
foreach ($target in @('production', 'preview', 'development')) {
  $BotToken | npx vercel env add TELEGRAM_BOT_TOKEN $target --yes 2>&1 | Out-Null
  $webhookSecret | npx vercel env add TELEGRAM_WEBHOOK_SECRET $target --yes 2>&1 | Out-Null
  if ($AdminChatId) {
    $AdminChatId | npx vercel env add TELEGRAM_ADMIN_CHAT_ID $target --yes 2>&1 | Out-Null
  }
  Write-Host "  OK: $target"
}
$ErrorActionPreference = $prevEap

Write-Host 'Webhook info:'
$info = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/getWebhookInfo" -Method Get
$info.result | ConvertTo-Json

if ($AdminChatId) {
  $testText = 'Telegram live chat for my-yoqubkhoja-tj is configured.'
  $testBody = @{ chat_id = $AdminChatId; text = $testText } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/sendMessage" -Method Post -ContentType 'application/json' -Body $testBody | Out-Null
  Write-Host 'Test message sent to admin.' -ForegroundColor Green
} else {
  Write-Host 'Admin chat id not found. Open bot and send /start from @yoqubkhoja1988, then rerun script.' -ForegroundColor Yellow
}

if (-not $SkipDeploy) {
  Write-Host 'Deploying production...'
  npx vercel deploy --prod --yes
}

Write-Host 'Done.' -ForegroundColor Green
