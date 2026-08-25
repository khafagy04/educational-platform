param([Parameter(Mandatory=$true)][string]$BackupPath)
$ErrorActionPreference = 'Stop'
$resolved = [System.IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $resolved)) { throw 'Backup file not found.' }
$verificationSqlPath = Join-Path $PSScriptRoot 'restore-verification.sql'
if (-not (Test-Path -LiteralPath $verificationSqlPath)) { throw 'Restore verification SQL file not found.' }
$drillDatabase = 'educational_platform_restore_drill'
docker compose cp $resolved postgres:/tmp/restore-drill.dump
if ($LASTEXITCODE -ne 0) { throw 'Copying the restore artifact failed.' }
docker compose cp $verificationSqlPath postgres:/tmp/restore-verification.sql
if ($LASTEXITCODE -ne 0) { throw 'Copying the restore verification SQL failed.' }
docker compose exec -T postgres dropdb -U platform --if-exists $drillDatabase
if ($LASTEXITCODE -ne 0) { throw 'Preparing the restore drill database failed.' }
docker compose exec -T postgres createdb -U platform $drillDatabase
if ($LASTEXITCODE -ne 0) { throw 'Creating the restore drill database failed.' }
try {
  docker compose exec -T postgres pg_restore -U platform -d $drillDatabase --no-owner --no-privileges /tmp/restore-drill.dump
  if ($LASTEXITCODE -ne 0) { throw 'Restoring the drill database failed.' }
  docker compose exec -T postgres psql -U platform -d $drillDatabase -f /tmp/restore-verification.sql
  if ($LASTEXITCODE -ne 0) { throw 'Restore verification queries failed.' }
} finally {
  docker compose exec -T postgres dropdb -U platform --if-exists $drillDatabase
  if ($LASTEXITCODE -ne 0) { Write-Warning 'The temporary restore drill database could not be removed.' }
}
