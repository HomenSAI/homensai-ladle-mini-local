$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$ArgumentList)
    $gitArgs = @('-c', "safe.directory=$repoRoot") + $ArgumentList
    & git @gitArgs
    if ($LASTEXITCODE -ne 0) { throw "git $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE" }
}

function Invoke-Check {
    param([Parameter(Mandatory)][string]$Command, [Parameter(Mandatory)][string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

Invoke-Git -ArgumentList @('rev-parse', '--is-inside-work-tree')
Invoke-Git -ArgumentList @('diff', '--check')
Invoke-Git -ArgumentList @('diff', '--cached', '--check')

$checks = @(
    @{ Command = 'npm'; Arguments = @('test') },
    @{ Command = 'python'; Arguments = @('tools/check.py') },
    @{ Command = 'python'; Arguments = @('tools/make_preview.py') },
    @{ Command = 'python'; Arguments = @('tests/ui_test.py', '--in-memory') },
    @{ Command = 'python'; Arguments = @('tests/catalog_ui_test.py') },
    @{ Command = 'python'; Arguments = @('tests/mini_ui_test.py') },
    @{ Command = 'python'; Arguments = @('tests/preview_test.py') }
)

foreach ($check in $checks) {
    Invoke-Check -Command $check.Command -Arguments $check.Arguments
}
