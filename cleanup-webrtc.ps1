# cleanup-webrtc.ps1
param([int]$Port = 3000)

$ErrorActionPreference = "Stop"

$ruleName = "webrtc-$Port"

# Remove firewall rule
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $ruleName
  Write-Host ("Firewall rule removed: {0}" -f $ruleName)
} else {
  Write-Host ("Firewall rule not found: {0}" -f $ruleName)
}

# Remove portproxy
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port | Out-Null
Write-Host ("Portproxy removed for port {0}" -f $Port)

Write-Host "Cleanup DONE."
