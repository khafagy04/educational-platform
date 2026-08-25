param([string]$OutputDirectory = ".\backups")
$ErrorActionPreference = 'Stop'
$resolved = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $resolved | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $resolved "educational-platform-$stamp.dump"
docker compose exec -T postgres pg_dump -U platform -d educational_platform -Fc -f /tmp/platform.dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
docker compose cp postgres:/tmp/platform.dump $target
if ($LASTEXITCODE -ne 0) { throw 'Copying the database backup failed.' }
if (-not (Test-Path -LiteralPath $target) -or (Get-Item -LiteralPath $target).Length -lt 1024) { throw 'Backup verification failed.' }
Get-FileHash -Algorithm SHA256 -LiteralPath $target | Format-List
Write-Output $target
