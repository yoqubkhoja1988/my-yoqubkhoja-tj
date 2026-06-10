# One-time: connect Neon DATABASE_URL to Vercel and redeploy.
# Usage:
#   .\scripts\setup-vercel-db.ps1 -DatabaseUrl "postgresql://..."
#
# Get DATABASE_URL from Neon dashboard -> yoqubkhoja-db -> Connection string -> Copy

param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Installing Vercel CLI..."
npm install --no-save vercel@latest | Out-Null

Write-Host "Adding DATABASE_URL to Vercel (production + preview)..."
$DatabaseUrl | npx vercel env add DATABASE_URL production --yes 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: npx vercel login"
  Write-Host "Then re-run this script."
  exit 1
}

$DatabaseUrl | npx vercel env add DATABASE_URL preview --yes 2>$null

Write-Host "Deploying to production..."
npx vercel deploy --prod --yes

Write-Host "Done. Check: https://my-yoqubkhoja-tj.vercel.app/api/health/db"
