$env:PORT = 5050
$env:JWT_SECRET = "test-secret"
$env:AUTH_USERS_FILE = "./users_test.json"
$env:ADMIN_EMAIL = "admin@test.com"
$env:ADMIN_PASSWORD = "adminpassword"

Remove-Item -Path $env:AUTH_USERS_FILE -ErrorAction SilentlyContinue

Write-Host "[*] Starting server on port $env:PORT..."
$process = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 3

Write-Host "[*] Registering complainant..."
$compResp = Invoke-RestMethod -Uri "http://localhost:5050/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email": "complainant@test.com", "password": "password123", "displayName": "Complainant"}'
$compToken = $compResp.token

Write-Host "[*] Logging in as admin..."
$adminResp = Invoke-RestMethod -Uri "http://localhost:5050/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email": "admin@test.com", "password": "adminpassword"}'
$adminToken = $adminResp.token

Write-Host "`n--- TEST 1: Complainant accessing /api/cases (should be 403) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:5050/api/cases" -Headers @{Authorization="Bearer $compToken"} -Method Get
    Write-Host "HTTP Status: 200 (FAIL)"
} catch {
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__) (PASS)"
}

Write-Host "`n--- TEST 2: Complainant accessing /api/cases/CF-1042 (should be 403) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:5050/api/cases/CF-1042" -Headers @{Authorization="Bearer $compToken"} -Method Get
    Write-Host "HTTP Status: 200 (FAIL)"
} catch {
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__) (PASS)"
}

Write-Host "`n--- TEST 3: Admin accessing /api/cases (should be 200) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:5050/api/cases" -Headers @{Authorization="Bearer $adminToken"} -Method Get | Out-Null
    Write-Host "HTTP Status: 200 (PASS)"
} catch {
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__) (FAIL)"
}

Write-Host "`n--- TEST 4: Complainant accessing /api/overview (should be 403) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:5050/api/overview" -Headers @{Authorization="Bearer $compToken"} -Method Get
    Write-Host "HTTP Status: 200 (FAIL)"
} catch {
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__) (PASS)"
}

Write-Host "`n[*] Stopping server..."
Stop-Process -Id $process.Id -Force
Remove-Item -Path $env:AUTH_USERS_FILE -ErrorAction SilentlyContinue
Write-Host "Done."

