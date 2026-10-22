[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$certificateDirectory = Join-Path $repoRoot 'frontend/.local-certs'
$certificatePath = Join-Path $certificateDirectory 'phone-cert.pem'
$privateKeyPath = Join-Path $certificateDirectory 'phone-key.pem'
$mobileRootPath = Join-Path $certificateDirectory 'mobile-rootCA.pem'

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    throw 'mkcert is required. Install the official mkcert Windows build, ensure mkcert.exe is on PATH, then rerun this script.'
}
if (-not (Get-Command Get-NetAdapter -ErrorAction SilentlyContinue)) {
    throw 'Get-NetAdapter is unavailable; use a supported Windows PowerShell 5.1 or PowerShell 7 session.'
}

$physicalAdapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq 'Up' })
$addresses = @()
foreach ($adapter in $physicalAdapters) {
    $privateAddresses = @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.AddressState -eq 'Preferred' -and
            $_.IPAddress -match '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$'
        })
    foreach ($address in $privateAddresses) {
        if ($addresses -notcontains $address.IPAddress) {
            $addresses += $address.IPAddress
        }
    }
}
if ($addresses.Count -eq 0) {
    throw 'No private IPv4 address was found on an active physical adapter. Connect to the same private LAN as the phone and retry.'
}

New-Item -ItemType Directory -Path $certificateDirectory -Force | Out-Null
Write-Host 'Installing the local mkcert CA in the Windows trust store...'
& mkcert -install
if ($LASTEXITCODE -ne 0) {
    throw 'mkcert -install failed. Resolve the local CA trust-store error and retry.'
}

# The generated certificate contains IP Subject Alternative Names for the detected LAN addresses.
$certificateNames = @('localhost', '127.0.0.1') + $addresses
Remove-Item -LiteralPath $certificatePath, $privateKeyPath -Force -ErrorAction SilentlyContinue
Write-Host ('Creating a local HTTPS certificate for: ' + ($certificateNames -join ', '))
& mkcert -cert-file $certificatePath -key-file $privateKeyPath @certificateNames
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $certificatePath) -or -not (Test-Path -LiteralPath $privateKeyPath)) {
    throw 'mkcert did not create the local phone certificate and key.'
}

$caRootOutput = & mkcert -CAROOT
if ($LASTEXITCODE -ne 0) {
    throw 'mkcert could not locate its CA directory.'
}
$caRoot = ([string]($caRootOutput -join [Environment]::NewLine)).Trim()
$rootCaPath = Join-Path $caRoot 'rootCA.pem'
if (-not (Test-Path -LiteralPath $rootCaPath)) {
    throw 'mkcert rootCA.pem was not found. Do not copy or share rootCA-key.pem.'
}
Copy-Item -LiteralPath $rootCaPath -Destination $mobileRootPath -Force

Write-Host ''
Write-Host 'Local phone HTTPS certificate created.'
Write-Host ('Phone HTTPS URL(s): ' + (($addresses | ForEach-Object { 'https://' + $_ + ':5173' }) -join ', '))
Write-Host ('Copy this public CA certificate to your phone and install/trust it: ' + $mobileRootPath)
Write-Host 'Do NOT copy, upload, or commit phone-key.pem or mkcert rootCA-key.pem.'
Write-Host 'After trusting the CA on the phone, stop the old API and Vite processes, rerun .\start-bclick-local.ps1, then restart npm run dev.'
Write-Host 'Use the https:// LAN URL printed above. The app keeps Secure __Host cookies and exact-Origin checks.'
