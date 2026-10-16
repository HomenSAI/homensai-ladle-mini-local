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
if ($remoteNames -notcontains 'gitea' -or $remoteNames -notcontains 'github') { throw 'Both gitea and github remotes must be configured.' }
Invoke-Git -ArgumentList @('fetch', 'gitea', 'main', '--tags')
Invoke-Git -ArgumentList @('fetch', 'github', 'main', '--tags')

$giteaSha = (Invoke-Git -ArgumentList @('rev-parse', 'refs/remotes/gitea/main') | Select-Object -Last 1).Trim()
$githubSha = (Invoke-Git -ArgumentList @('rev-parse', 'refs/remotes/github/main') | Select-Object -Last 1).Trim()
if ($giteaSha -ne $githubSha) { throw "Remote main branches differ: gitea=$giteaSha github=$githubSha" }

$giteaTags = @(Invoke-Git -ArgumentList @('ls-remote', '--tags', '--refs', 'gitea') | ForEach-Object { ($_ -split '\s+', 2)[0] + ' ' + ($_ -split '\s+', 2)[1] } | Sort-Object)
$githubTags = @(Invoke-Git -ArgumentList @('ls-remote', '--tags', '--refs', 'github') | ForEach-Object { ($_ -split '\s+', 2)[0] + ' ' + ($_ -split '\s+', 2)[1] } | Sort-Object)
if (($giteaTags -join "`n") -ne ($githubTags -join "`n")) { throw 'Remote tag refs differ; inspect and reconcile tags manually.' }

Write-Output "main: $giteaSha"
Write-Output "Matching remote tag refs: $($giteaTags.Count)"
