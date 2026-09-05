# TuaoBet — sobe o stack com build estável no Docker Desktop (Windows).
# O erro "parent snapshot ... does not exist" costuma ser bug do BuildKit; o builder clássico evita isso.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:DOCKER_BUILDKIT = "0"
$env:COMPOSE_DOCKER_CLI_BUILD = "0"

Write-Host "A compilar com builder clássico (DOCKER_BUILDKIT=0)..." -ForegroundColor Cyan
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
  Write-Host "`nSe ainda falhar, tenta limpar cache: docker builder prune -af" -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host "`nFrontend: http://localhost:8080  |  API: http://localhost:3001" -ForegroundColor Green
