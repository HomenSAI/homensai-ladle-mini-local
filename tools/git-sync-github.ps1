param([switch]$PublishConfirmed)

$ErrorActionPreference = 'Stop'
if (-not $PublishConfirmed) { throw 'Pass -PublishConfirmed only after Gitea main is reviewed and approved for GitHub publication.' }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$ArgumentList)
    $gitArgs = @('-c', "safe.directory=$repoRoot") + $ArgumentList
    & git @gitArgs
    if ($LASTEXITCODE -ne 0) { throw "git $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE" }
}

$remoteNames = @(Invoke-Git -ArgumentList @('remote'))
if ($remoteNames -notcontains 'gitea' -or $remoteNames -notcontains 'github') { throw 'Both gitea and github remotes must be configured.' }
$branch = (Invoke-Git -ArgumentList @('branch', '--show-current') | Select-Object -Last 1).Trim()
if ($branch -ne 'main') { throw 'GitHub synchronization is limited to the reviewed main branch.' }
$dirty = @(Invoke-Git -ArgumentList @('status', '--porcelain', '--untracked-files=all'))
if ($dirty.Count -gt 0) { throw 'Working tree is not clean. Commit reviewed changes before syncing.' }

& (Join-Path $PSScriptRoot 'git-check.ps1')
if ($LASTEXITCODE -ne 0) { throw "git-check.ps1 failed with exit code $LASTEXITCODE" }
$dirtyAfterChecks = @(Invoke-Git -ArgumentList @('status', '--porcelain', '--untracked-files=all'))
if ($dirtyAfterChecks.Count -gt 0) { throw 'Checks changed tracked or untracked files. Review and commit those changes before syncing.' }

Invoke-Git -ArgumentList @('fetch', 'gitea', 'main', '--tags')
Invoke-Git -ArgumentList @('fetch', 'github', 'main', '--tags')
$localSha = (Invoke-Git -ArgumentList @('rev-parse', 'main') | Select-Object -Last 1).Trim()
$giteaSha = (Invoke-Git -ArgumentList @('rev-parse', 'refs/remotes/gitea/main') | Select-Object -Last 1).Trim()
if ($localSha -ne $giteaSha) { throw 'Local main does not exactly match reviewed gitea/main; sync Gitea first.' }

& git -c "safe.directory=$repoRoot" merge-base --is-ancestor refs/remotes/github/main refs/remotes/gitea/main
if ($LASTEXITCODE -ne 0) { throw 'GitHub main is not an ancestor of gitea/main. Resolve history differences manually; no push was performed.' }
Invoke-Git -ArgumentList @('push', 'github', 'main')
