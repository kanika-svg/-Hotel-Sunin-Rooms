# Deploy Supabase Edge Function and set JWT secret
# Run this AFTER: npx supabase login  and  npx supabase link --project-ref YOUR_PROJECT_REF
# Usage: .\deploy-supabase.ps1

Set-Location $PSScriptRoot

Write-Host "Deploying Edge Function 'api'..." -ForegroundColor Cyan
npx supabase functions deploy api --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed. Make sure you ran: npx supabase login  and  npx supabase link --project-ref YOUR_REF" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Setting JWT_SECRET..." -ForegroundColor Cyan
npx supabase secrets set JWT_SECRET=uj4x5VmZ+/bZsHlHm0HBp5Wo900iZsZwGiMgpEV4Rhs=
if ($LASTEXITCODE -ne 0) {
    Write-Host "Setting secret failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Done. Set VITE_API_URL on Netlify to https://YOUR_PROJECT_REF.supabase.co/functions/v1/api and redeploy." -ForegroundColor Green
