$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$ArgumentList)
    $gitArgs = @('-c', "safe.directory=$repoRoot") + $ArgumentList
    & git @gitArgs
    if ($LASTEXITCODE -ne 0) { throw "git $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE" }
}

Invoke-Git -ArgumentList @('rev-parse', '--show-toplevel')
Invoke-Git -ArgumentList @('status', '--short', '--branch')
Invoke-Git -ArgumentList @('branch', '-avv')
Invoke-Git -ArgumentList @('remote', '-v')
