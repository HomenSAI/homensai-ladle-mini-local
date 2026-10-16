param([switch]$Native)

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
Invoke-Git -ArgumentList @('fsck', '--no-dangling')
$unmerged = @(Invoke-Git -ArgumentList @('ls-files', '--unmerged'))
if ($unmerged.Count -gt 0) { throw 'Unresolved merge conflicts exist.' }
$trackedFiles = @(Invoke-Git -ArgumentList @('ls-files'))
$forbiddenFiles = @($trackedFiles | Where-Object { $_ -match '(?i)(\.(jks|keystore|p12|pfx|db|sqlite3?|apk|aab|ttf|otf|woff2?)$|(^|/)\.env($|\.(?!example$)))' })
if ($forbiddenFiles.Count -gt 0) { throw "Forbidden tracked files: $($forbiddenFiles -join ', ')" }
foreach ($path in $trackedFiles) {
    if ($path -match '\.(js|cjs|json|java|gradle|properties|ps1|sh|md|txt|yml|yaml)$') {
        $content = [IO.File]::ReadAllText((Join-Path $repoRoot $path))
        if ($content -match '-----BEGIN (OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}') { throw "Potential secret detected in $path; content withheld." }
    }
}
$version = (Get-Content (Join-Path $repoRoot 'VERSION') -Raw).Trim()
$package = Get-Content (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$gradle = Get-Content (Join-Path $repoRoot 'app/build.gradle') -Raw
if ($version -notmatch '^\d+\.\d+\.\d+$' -or $package.version -ne $version -or $gradle -notmatch "versionName '$([regex]::Escape($version))'" -or $gradle -notmatch 'versionCode\s+[1-9]\d*') { throw 'Version metadata is inconsistent.' }

if (-not $Native) {
    Invoke-Check -Command 'docker' -Arguments @('build', '-f', 'tools/Dockerfile.check', '-t', 'homensai-ladle-mini-local:check', '.')
    Invoke-Check -Command 'docker' -Arguments @('run', '--rm', '--network', 'none', '--mount', "type=bind,source=$repoRoot,target=/workspace,readonly", 'homensai-ladle-mini-local:check', 'bash', '-c', 'cp -a /workspace /tmp/checked && cd /tmp/checked && bash tools/check-all.sh')
    return
}

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
