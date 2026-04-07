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

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

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

Write-Host '==> Linking Supabase project'
npx supabase link --project-ref $ProjectRef --password $DbPassword --yes

Write-Host '==> Applying migrations to linked project'
npx supabase db push --linked --password $DbPassword

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
$fnResponse1 = Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/tender-document-extractor" -Headers $headers -Method Post -ContentType 'application/json' -Body '{}'
$fnResponse2 = Invoke-WebRequest -Uri "$supabaseUrl/functions/v1/tender-analysis-runner" -Headers $headers -Method Post -ContentType 'application/json' -Body '{}'
Write-Host "function=tender-document-extractor status=$($fnResponse1.StatusCode)"
Write-Host "function=tender-analysis-runner status=$($fnResponse2.StatusCode)"

Write-Host 'Rollout completed.'
