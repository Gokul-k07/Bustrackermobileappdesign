param(
  [string]$ProjectRef = "arkrhrnslncemnhtyiyp",
  [string]$FunctionSlug = "server",
  [string]$AllowedOrigin = "http://localhost:3000",
  [string]$BlockedOrigin = "https://evil.example"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$baseUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionSlug"
$preflightPath = "$baseUrl/profile"
$healthPath = "$baseUrl/health"
$publicPath = "$baseUrl/buses/available"
$protectedPath = "$baseUrl/profile"

function Get-HeaderValue {
  param(
    [Parameter(Mandatory = $true)]$Headers,
    [Parameter(Mandatory = $true)][string]$Name
  )

  try {
    if ($Headers.Contains($Name)) {
      return ($Headers.GetValues($Name) | Select-Object -First 1)
    }

    $lower = $Name.ToLower()
    if ($Headers.Contains($lower)) {
      return ($Headers.GetValues($lower) | Select-Object -First 1)
    }

    return $null
  }
  catch {
    foreach ($key in $Headers.Keys) {
      if ($key.ToLower() -eq $Name.ToLower()) {
        return $Headers[$key]
      }
    }
    return $null
  }
}

function Invoke-RequestRaw {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{}
  )

  try {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
    return @{
      StatusCode = [int]$response.StatusCode
      Headers = $response.Headers
      Body = $response.Content
    }
  } catch {
    $errorResponse = $_.Exception.Response
    if (-not $errorResponse) {
      throw
    }

    $body = ""
    try {
      $stream = $errorResponse.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $reader.Dispose()
        $stream.Dispose()
      }
    } catch {
      $body = ""
    }

    return @{
      StatusCode = [int]$errorResponse.StatusCode
      Headers = $errorResponse.Headers
      Body = $body
    }
  }
}

function Assert-Condition {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

Write-Host "[INFO] Running smoke checks against $baseUrl"

$preflightHeaders = @{
  "Origin" = $AllowedOrigin
  "Access-Control-Request-Method" = "GET"
  "Access-Control-Request-Headers" = "authorization,content-type"
}

$preflightAllowed = Invoke-RequestRaw -Method "OPTIONS" -Url $preflightPath -Headers $preflightHeaders
$preflightAllowedOrigin = Get-HeaderValue -Headers $preflightAllowed.Headers -Name "Access-Control-Allow-Origin"
Assert-Condition -Condition ($preflightAllowed.StatusCode -eq 204) -Message "Allowed origin preflight failed. Expected status 204, got $($preflightAllowed.StatusCode)."
Assert-Condition -Condition ($preflightAllowedOrigin -eq $AllowedOrigin) -Message "Allowed origin preflight missing/invalid Access-Control-Allow-Origin. Got '$preflightAllowedOrigin'."
Write-Host "[PASS] Allowed origin preflight returns 204 with matching CORS origin."

$healthResponse = Invoke-RequestRaw -Method "GET" -Url $healthPath -Headers @{ "Origin" = $AllowedOrigin }
Assert-Condition -Condition ($healthResponse.StatusCode -eq 200) -Message "Health endpoint failed. Expected 200, got $($healthResponse.StatusCode)."
Write-Host "[PASS] Health endpoint returns 200."

$publicResponse = Invoke-RequestRaw -Method "GET" -Url $publicPath -Headers @{ "Origin" = $AllowedOrigin }
Assert-Condition -Condition ($publicResponse.StatusCode -eq 200) -Message "Public endpoint failed. Expected 200, got $($publicResponse.StatusCode)."
Write-Host "[PASS] Public endpoint is callable without auth."

$protectedResponse = Invoke-RequestRaw -Method "GET" -Url $protectedPath -Headers @{ "Origin" = $AllowedOrigin }
$protectedCorsOrigin = Get-HeaderValue -Headers $protectedResponse.Headers -Name "Access-Control-Allow-Origin"
Assert-Condition -Condition ($protectedResponse.StatusCode -eq 401) -Message "Protected endpoint auth behavior changed. Expected 401, got $($protectedResponse.StatusCode)."
Assert-Condition -Condition ($protectedCorsOrigin -eq $AllowedOrigin) -Message "Protected endpoint response is missing expected CORS header. Got '$protectedCorsOrigin'."
Write-Host "[PASS] Protected endpoint returns 401 with correct CORS headers."

$preflightBlockedHeaders = @{
  "Origin" = $BlockedOrigin
  "Access-Control-Request-Method" = "GET"
  "Access-Control-Request-Headers" = "authorization,content-type"
}

$preflightBlocked = Invoke-RequestRaw -Method "OPTIONS" -Url $preflightPath -Headers $preflightBlockedHeaders
$preflightBlockedOrigin = Get-HeaderValue -Headers $preflightBlocked.Headers -Name "Access-Control-Allow-Origin"
Assert-Condition -Condition ($preflightBlocked.StatusCode -eq 204) -Message "Blocked origin preflight status changed. Expected 204, got $($preflightBlocked.StatusCode)."
Assert-Condition -Condition ([string]::IsNullOrWhiteSpace([string]$preflightBlockedOrigin)) -Message "Blocked origin unexpectedly received CORS allow header '$preflightBlockedOrigin'."
Write-Host "[PASS] Blocked origin does not receive CORS allow header."

Write-Host "[SUCCESS] All smoke checks passed."
