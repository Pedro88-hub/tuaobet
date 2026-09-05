# Rebuild e publica o frontend no GitHub Pages (branch gh-pages)
# Uso: .\deploy-pages.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root "tuaobet-frontend"

$env:VITE_BASE_PATH = "/tuaobet/"
if (-not $env:VITE_API_URL) {
  $env:VITE_API_URL = "https://api.tuao.dev.br"
}

Push-Location $Frontend
npm ci
npm run build
Copy-Item dist/index.html dist/404.html -Force
Pop-Location

$deployDir = Join-Path $env:TEMP "tuaobet-gh-pages-deploy"
if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
New-Item -ItemType Directory -Path $deployDir | Out-Null
Copy-Item -Recurse (Join-Path $Frontend "dist\*") $deployDir
New-Item -ItemType File -Path (Join-Path $deployDir ".nojekyll") -Force | Out-Null

Push-Location $deployDir
git init -b gh-pages | Out-Null
git add -A
git commit -m "Deploy frontend to GitHub Pages" | Out-Null
git remote add origin https://github.com/Pedro88-hub/tuaobet.git
git push -u origin gh-pages --force
Pop-Location

Write-Host "Publicado: https://pedro88-hub.github.io/tuaobet/"
