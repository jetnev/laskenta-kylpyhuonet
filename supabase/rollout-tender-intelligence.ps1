param(
  [string]$ProjectRef,
  [string]$DbPassword,
  [string]$AccessToken
)

$ErrorActionPreference = 'Stop'

function Require-Value {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value: $Name"
  }
}

function Get-EnvFileValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  $line = Get-Content $Path | Where-Object { $_ -like "$Key=*" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return $line.Substring($line.IndexOf('=') + 1)
}

function Derive-ProjectRefFromUrl {
  param([string]$SupabaseUrl)

  if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
    return $null
  }

  $uri = [Uri]$SupabaseUrl
  $hostParts = $uri.Host.Split('.')
  if ($hostParts.Length -lt 1) {
    return $null
  }

  return $hostParts[0]
}

function Assert-UniqueMigrationVersions {
  param([string]$MigrationsPath)

  $files = Get-ChildItem -Path $MigrationsPath -Filter '*.sql' -File | Sort-Object Name
  $versions = @{}

  foreach ($file in $files) {
    $segments = $file.BaseName.Split('_', 2)
    $version = if ($segments.Length -gt 0) { $segments[0] } else { $file.BaseName }

    if (-not $versions.ContainsKey($version)) {
      $versions[$version] = New-Object System.Collections.Generic.List[string]
    }

    $versions[$version].Add($file.Name)
  }

  $duplicates = $versions.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }

  if ($duplicates.Count -gt 0) {
    $messages = $duplicates | ForEach-Object {
      "$($_.Key): $($_.Value -join ', ')"
    }
    throw "Duplicate migration versions detected. Ensure unique numeric prefixes before rollout. $($messages -join ' | ')"
  }
}

function Assert-FunctionStatus {
  param(
    [object[]]$Functions,
    [string]$FunctionName
  )

  $matchedFunction = $Functions | Where-Object { $_.name -eq $FunctionName } | Select-Object -First 1

  if (-not $matchedFunction) {
    throw "Function $FunctionName was not found in project function list."
  }

  if ($matchedFunction.status -ne 'ACTIVE') {
    throw "Function $FunctionName is not ACTIVE. Current status: $($matchedFunction.status)"
  }

  Write-Host "function=$FunctionName status=$($matchedFunction.status)"
}

function Invoke-FunctionSmokeCheck {
  param(
    [string]$FunctionName,
    [string]$SupabaseUrl,
    [hashtable]$Headers
  )

  $response = Invoke-WebRequest `
    -Uri "$SupabaseUrl/functions/v1/$FunctionName" `
    -Headers $Headers `
    -Method Post `
    -ContentType 'application/json' `
    -Body '{}' `
    -SkipHttpErrorCheck

  $acceptedStatuses = @(200, 400, 401, 403, 404, 422)
  if ($acceptedStatuses -notcontains $response.StatusCode) {
    throw "Function $FunctionName returned unexpected smoke status $($response.StatusCode)."
  }

  Write-Host "function=$FunctionName smokeStatus=$($response.StatusCode)"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$migrationsPath = Join-Path $repoRoot 'supabase\migrations'

$envLocalPath = Join-Path $repoRoot '.env.local'
$supabaseUrl = Get-EnvFileValue -Path $envLocalPath -Key 'VITE_SUPABASE_URL'
$anonKey = Get-EnvFileValue -Path $envLocalPath -Key 'VITE_SUPABASE_ANON_KEY'

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = Derive-ProjectRefFromUrl -SupabaseUrl $supabaseUrl
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  $DbPassword = $env:SUPABASE_DB_PASSWORD
}

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $AccessToken = $env:SUPABASE_ACCESS_TOKEN
}

Require-Value -Name 'ProjectRef' -Value $ProjectRef
Require-Value -Name 'SUPABASE_DB_PASSWORD' -Value $DbPassword
Require-Value -Name 'SUPABASE_ACCESS_TOKEN' -Value $AccessToken
Require-Value -Name 'VITE_SUPABASE_URL (.env.local)' -Value $supabaseUrl
Require-Value -Name 'VITE_SUPABASE_ANON_KEY (.env.local)' -Value $anonKey

$env:SUPABASE_ACCESS_TOKEN = $AccessToken

Write-Host '==> Validating migration versions are unique'
Assert-UniqueMigrationVersions -MigrationsPath $migrationsPath

Write-Host '==> Linking Supabase project'
npx supabase link --project-ref $ProjectRef --password $DbPassword --yes

Write-Host '==> Applying migrations to linked project'
npx supabase migration up --linked --include-all --yes

Write-Host '==> Deploying edge functions'
npx supabase functions deploy tender-document-extractor --project-ref $ProjectRef
npx supabase functions deploy tender-analysis-runner --project-ref $ProjectRef

$headers = @{
  apikey = $anonKey
  Authorization = "Bearer $anonKey"
}

Write-Host '==> Verifying table availability'
$tables = @(
  'tender_packages',
  'tender_documents',
  'tender_document_extractions',
  'tender_analysis_jobs'
)

foreach ($table in $tables) {
  $uri = "$supabaseUrl/rest/v1/${table}?select=id&limit=1"
  $response = Invoke-WebRequest -Uri $uri -Headers $headers -Method Get
  Write-Host "table=$table status=$($response.StatusCode)"
}

Write-Host '==> Verifying storage bucket exists'
$bucketResponse = Invoke-WebRequest -Uri "$supabaseUrl/storage/v1/bucket" -Headers $headers -Method Get
$buckets = $bucketResponse.Content | ConvertFrom-Json
$bucketExists = $false
foreach ($bucket in $buckets) {
  if ($bucket.id -eq 'tender-intelligence') {
    $bucketExists = $true
  }
}

if (-not $bucketExists) {
  throw 'Bucket tender-intelligence is missing after rollout.'
}

Write-Host '==> Verifying edge functions are reachable'
Write-Host '==> Verifying edge functions are ACTIVE'
$functionsJson = npx supabase functions list --project-ref $ProjectRef -o json
$functions = $functionsJson | ConvertFrom-Json
Assert-FunctionStatus -Functions $functions -FunctionName 'tender-document-extractor'
Assert-FunctionStatus -Functions $functions -FunctionName 'tender-analysis-runner'

Write-Host '==> Verifying edge function endpoint smoke statuses'
Invoke-FunctionSmokeCheck -FunctionName 'tender-document-extractor' -SupabaseUrl $supabaseUrl -Headers $headers
Invoke-FunctionSmokeCheck -FunctionName 'tender-analysis-runner' -SupabaseUrl $supabaseUrl -Headers $headers

Write-Host '==> Verifying analysis/extraction status contracts'
$analysisRows = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tender_analysis_jobs?select=id,status&order=requested_at.desc&limit=10" -Headers $headers -Method Get
$allowedAnalysisStatuses = @('pending', 'queued', 'running', 'completed', 'failed')
foreach ($row in $analysisRows) {
  if ($allowedAnalysisStatuses -notcontains $row.status) {
    throw "Unexpected tender_analysis_jobs status '$($row.status)' for row $($row.id)."
  }
}

$extractionRows = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tender_document_extractions?select=id,extraction_status&order=updated_at.desc&limit=10" -Headers $headers -Method Get
$allowedExtractionStatuses = @('not_started', 'pending', 'extracting', 'extracted', 'failed', 'unsupported')
foreach ($row in $extractionRows) {
  if ($allowedExtractionStatuses -notcontains $row.extraction_status) {
    throw "Unexpected tender_document_extractions status '$($row.extraction_status)' for row $($row.id)."
  }
}

Write-Host 'Rollout completed.'
