# ver-paleta.ps1 · abre el visor de T con la paleta de prueba A o B y, opcionalmente, un clip candidato del hero (MATERIAL-01..03).
# Uso (PowerShell, desde cualquier carpeta):
#   C:\Users\liama\Desktop\Nichos\Barber-shop-template-main\tools\material\ver-paleta.ps1 -Paleta a
#   …\ver-paleta.ps1 -Paleta a -Clip stock-7575396   → el hero 16:9 toma dev-fixtures/media/paleta-a/hero-stock-7575396.{mp4,webm} (+ -1280.* y -poster.avif si existen)
#   …\ver-paleta.ps1 -Paleta b
#   Sin -Clip: hero.* = lo instalado (A: Pexels 7440194 desde MATERIAL-02). El 9:16 (hero-v.*) no cambia con -Clip. Ctrl+C corta el servidor.
param(
  [ValidateSet("a", "b")] [string] $Paleta = "a",
  [string] $Clip = "",
  [string] $Idioma = "he"
)
$T = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$ocupado = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($ocupado) { Write-Host "Puerto 3000 ocupado (PID $($ocupado.OwningProcess)); lo cierro." ; Stop-Process -Id $ocupado.OwningProcess -Force }
$env:VITE_ACTIVE_NICHE = "peluqueria"
$env:VITE_UI_LANGUAGE = $Idioma
$env:VITE_DEMO_MODE = "false"
$env:VITE_FIREBASE_API_KEY = ""
$env:VITE_TENANT_FIXTURE = "peluqueria-paleta-$Paleta"
$env:VITE_HERO_CLIP = $Clip
Write-Host "Paleta $Paleta · clip '$Clip' · http://localhost:3000/  (Ctrl+C para cortar)"
Start-Process "http://localhost:3000/"
Set-Location $T
npx tsx server.ts
