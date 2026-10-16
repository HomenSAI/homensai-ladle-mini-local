$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$ArgumentList)
    $gitArgs = @('-c', "safe.directory=$repoRoot") + $ArgumentList
    & git @gitArgs
    if ($LASTEXITCODE -ne 0) { throw "git $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE" }
}

$remoteNames = @(Invoke-Git -ArgumentList @('remote'))
if ($remoteNames -notcontains 'gitea') { throw 'The gitea remote is not configured with a verified clone URL.' }
$branch = (Invoke-Git -ArgumentList @('branch', '--show-current') | Select-Object -Last 1).Trim()
if (-not $branch) { throw 'A named branch is required before syncing.' }
$dirty = @(Invoke-Git -ArgumentList @('status', '--porcelain', '--untracked-files=all'))
if ($dirty.Count -gt 0) { throw 'Working tree is not clean. Commit reviewed changes before syncing.' }

& (Join-Path $PSScriptRoot 'git-check.ps1')
if ($LASTEXITCODE -ne 0) { throw "git-check.ps1 failed with exit code $LASTEXITCODE" }
$dirtyAfterChecks = @(Invoke-Git -ArgumentList @('status', '--porcelain', '--untracked-files=all'))
if ($dirtyAfterChecks.Count -gt 0) { throw 'Checks changed tracked or untracked files. Review and commit those changes before syncing.' }

Invoke-Git -ArgumentList @('push', '--set-upstream', 'gitea', $branch)
