# Prepares electron-builder winCodeSign cache without symlink privileges.
# Run once before "npm run dist" if you see "Cannot create symbolic link" errors.
$ErrorActionPreference = "Stop"

$cacheRoot = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign"
$cacheDir = Join-Path $cacheRoot "winCodeSign-2.6.0"
$rcedit = Join-Path $cacheDir "rcedit-x64.exe"

if (Test-Path $rcedit) {
  Write-Host "winCodeSign cache already present: $cacheDir"
  exit 0
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$7za = Join-Path $projectRoot "node_modules\7zip-bin\win\x64\7za.exe"
if (-not (Test-Path $7za)) {
  Write-Error "7za not found. Run 'npm install' in the project folder first."
}

$url = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
$zip = Join-Path $env:TEMP "winCodeSign-2.6.0.7z"
$staging = Join-Path $env:TEMP "winCodeSign-staging"

Write-Host "Downloading winCodeSign tools..."
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Write-Host "Extracting (Windows tools only; macOS symlink warnings are OK)..."
# Do not use -snld. Darwin entries may warn about symlinks on Windows — rcedit is what we need.
$null = & $7za x $zip "-o$staging" -y 2>&1

New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

$inner = Get-ChildItem $staging -Directory | Where-Object { $_.Name -like "winCodeSign*" } | Select-Object -First 1
if ($inner) {
  Copy-Item -Path (Join-Path $inner.FullName "*") -Destination $cacheDir -Recurse -Force
} else {
  Copy-Item -Path (Join-Path $staging "*") -Destination $cacheDir -Recurse -Force
}

if (-not (Test-Path $rcedit)) {
  Write-Error "Cache prep failed: rcedit-x64.exe not found in $cacheDir"
}

Write-Host "winCodeSign cache ready: $cacheDir"
