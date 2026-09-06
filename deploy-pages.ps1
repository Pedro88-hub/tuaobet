# Rebuild e publica o frontend no GitHub Pages
# Uso:
#   .\deploy-pages.ps1              → domínio bet.tuao.dev.br (base /)
#   .\deploy-pages.ps1 -GithubPath  → https://pedro88-hub.github.io/tuaobet/

param(
  [switch]$GithubPath
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root "tuaobet-frontend"

if ($GithubPath) {
  $env:VITE_BASE_PATH = "/tuaobet/"
} else {
  # Domínio custom (bet.tuao.dev.br) — site na raiz
  $env:VITE_BASE_PATH = "/"
}

if (-not $env:VITE_API_URL) {
  $env:VITE_API_URL = "https://tuaobet.onrender.com"
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

# Custom domain GitHub Pages
if (-not $GithubPath) {
  Set-Content -Path (Join-Path $deployDir "CNAME") -Value "bet.tuao.dev.br" -NoNewline
}

Push-Location $deployDir
git init -b gh-pages | Out-Null
git add -A
git commit -m "Deploy frontend to GitHub Pages" | Out-Null
git remote add origin https://github.com/Pedro88-hub/tuaobet.git
git push -u origin gh-pages --force
Pop-Location

if ($GithubPath) {
  Write-Host "Publicado: https://pedro88-hub.github.io/tuaobet/"
} else {
  Write-Host "Publicado para: https://bet.tuao.dev.br (DNS Cloudflare + Pages custom domain)"
  Write-Host "Fallback: https://pedro88-hub.github.io/tuaobet/ (só após DNS)"
}
