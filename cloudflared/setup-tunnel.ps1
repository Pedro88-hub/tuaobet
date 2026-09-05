# TuaoBet — preparar Cloudflare Tunnel (corre no TEU PowerShell)
# 1) Fecha e reabre o terminal depois do winget install, ou usa o caminho completo ao cloudflared.exe

$ErrorActionPreference = "Stop"
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
    $candidates = @(
        "${env:ProgramFiles}\cloudflared\cloudflared.exe",
        "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
        "${env:ProgramFiles}\Cloudflare\cloudflared\cloudflared.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { $cf = $p; break }
    }
    if (-not $cf) {
        Write-Host "cloudflared nao encontrado. Reabre o PowerShell ou instala de novo: winget install Cloudflare.cloudflared" -ForegroundColor Red
        exit 1
    }
    $cloudflared = $cf
} else {
    $cloudflared = $cf.Source
}

Write-Host "Usando: $cloudflared" -ForegroundColor Cyan
Write-Host ""
Write-Host "PASSO A — Login (abre o browser). Escolhe a zona tuao.dev.br" -ForegroundColor Yellow
& $cloudflared tunnel login
Write-Host ""
Write-Host "PASSO B — Criar túnel 'tuaobet' e ANOTA o UUID na saída" -ForegroundColor Yellow
& $cloudflared tunnel create tuaobet
Write-Host ""
Write-Host "PASSO C — Edita cloudflared\config.yml: substitui TUNNEL_UUID_ABAIXO pelo UUID (2 sitios)" -ForegroundColor Yellow
Write-Host "       credentials-file fica: C:\Users\pedro\.cloudflared\<UUID>.json" -ForegroundColor Yellow
Write-Host ""
Write-Host "PASSO D — Só depois da propagacao DNS na Cloudflare:" -ForegroundColor Yellow
Write-Host "  $($cloudflared) tunnel route dns tuaobet tuao.dev.br" -ForegroundColor Gray
Write-Host "  $($cloudflared) tunnel route dns tuaobet api.tuao.dev.br" -ForegroundColor Gray
Write-Host ""
Write-Host "PASSO E — Docker na pasta do projeto:" -ForegroundColor Yellow
Write-Host "  cd c:\Users\pedro\Documents\tuaobet" -ForegroundColor Gray
Write-Host "  docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build" -ForegroundColor Gray
Write-Host ""
Write-Host "PASSO F — Arrancar túnel:" -ForegroundColor Yellow
$config = Join-Path $PSScriptRoot "config.yml"
Write-Host "  & `"$cloudflared`" tunnel --config `"$config`" run tuaobet" -ForegroundColor Gray
