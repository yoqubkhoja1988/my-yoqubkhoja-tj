# Add NEXT_PUBLIC_CONTACT_TELEGRAM to Vercel (production + preview + development).
# Usage: .\scripts\setup-vercel-contact-env.ps1
# Requires: npx vercel login (once)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$TelegramUsername = "yoqubkhoja1988"

Write-Host "Adding NEXT_PUBLIC_CONTACT_TELEGRAM to Vercel..."
foreach ($target in @("production", "preview", "development")) {
  $TelegramUsername | npx vercel env add NEXT_PUBLIC_CONTACT_TELEGRAM $target --yes 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed for $target. Run: npx vercel login"
    exit 1
  }
  Write-Host "  OK: $target"
}

Write-Host "Redeploying to production..."
npx vercel deploy --prod --yes

Write-Host "Done."
