# setup-webrtc.ps1
# Run PowerShell as Administrator.

param(
  [int]$Port = 3000,
  [switch]$StartServer  # if set, starts "node server.js" in the current directory (Windows)
)

$ErrorActionPreference = "Stop"

function Get-WSLIP {
  try {
    $ip = wsl.exe hostname -I | ForEach-Object { ($_ -split ' ')[0].Trim() }
    if (-not $ip) { throw "Empty WSL IP" }
    return $ip
  } catch {
    Write-Host "Failed to get WSL IP. Is WSL running?" -ForegroundColor Yellow
    return $null
  }
}

# 1) Get WSL IP
$wslIp = Get-WSLIP
if ($wslIp) {
  Write-Host ("WSL IP: {0}" -f $wslIp)
} else {
  Write-Host "Proceeding without portproxy (no WSL IP). You can re-run later." -ForegroundColor Yellow
}

# 2) Create firewall rule (TCP inbound, Private profile)
$ruleName = "webrtc-$Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Private | Out-Null
  Write-Host ("Firewall rule created: {0} (TCP {1}, Private)" -f $ruleName, $Port)
} else {
  Write-Host ("Firewall rule already exists: {0}" -f $ruleName)
}

# 3) Create portproxy: 0.0.0.0:Port -> WSL_IP:Port
if ($wslIp) {
  $existing = netsh interface portproxy show v4tov4 | Select-String (":{0}\s" -f $Port)
  if (-not $existing) {
    netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$Port connectaddress=$wslIp connectport=$Port | Out-Null
    Write-Host ("Portproxy added: 0.0.0.0:{0} -> {1}:{0}" -f $Port, $wslIp)
  } else {
    Write-Host ("Portproxy already exists for port {0}" -f $Port)
  }
}

# 4) Optional: start Node server (Windows side)
if ($StartServer) {
  Write-Host "Starting: node server.js"
  Start-Process -NoNewWindow -PassThru -FilePath "powershell.exe" -ArgumentList "node server.js" | Out-Null
}

Write-Host ("DONE.
Open on PC:  http://localhost:{0}/viewer.html
Open on phone (same Wi-Fi):  http://<YOUR_PC_IP>:{0}/sender.html" -f $Port)
