$Host.UI.RawUI.WindowTitle = 'ANDER PowerShell'
Set-Location /workspace

$env:OPENCODE_DISABLE_AUTOUPDATE = '1'
$env:OPENCODE_DISABLE_PRUNE = '1'
$env:OPENCODE_DISABLE_TERMINAL_TITLE = '1'

if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine
    Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
    Set-PSReadLineKeyHandler -Key Shift+Tab -Function TabCompletePrevious
    Set-PSReadLineKeyHandler -Key Escape -Function RevertLine
    Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
    Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
    Set-PSReadLineOption -HistoryNoDuplicates
}

function prompt {
    $path = (Get-Location).Path.Replace('/workspace', '~')
    Write-Host 'ander' -NoNewline -ForegroundColor Cyan
    Write-Host '@cloudpc' -NoNewline -ForegroundColor Magenta
    Write-Host ":$path" -NoNewline -ForegroundColor Yellow
    return ' PS> '
}

function ll { Get-ChildItem -Force @args }
function la { Get-ChildItem -Force @args }
function .. { Set-Location .. }
function workspace { Set-Location /workspace }

function OpenCode-Binary { return '/usr/local/bin/opencode' }

function Install-OpenCode {
    $binary = OpenCode-Binary
    if (-not (Test-Path $binary)) {
        Write-Host 'Falta el binario estable de OpenCode.' -ForegroundColor Red
        Write-Host 'Ejecuta git pull y vuelve a iniciar start.js.' -ForegroundColor Yellow
        return $false
    }

    $version = (& $binary --version 2>$null)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OpenCode estable listo: $version" -ForegroundColor Green
        return $true
    }

    Write-Host 'El binario de OpenCode no pudo ejecutarse.' -ForegroundColor Red
    Write-Host 'Vuelve a iniciar start.js para reconstruir la imagen baseline.' -ForegroundColor Yellow
    return $false
}

function OpenCode-AuthFile { return (Join-Path $HOME '.local/share/opencode/auth.json') }

function Show-GitHubDeviceLink {
    $url = 'https://github.com/login/device'
    $esc = [char]27
    Write-Host ''
    Write-Host 'ABRE ESTE ENLACE EN CHROMIUM O SAFARI:' -ForegroundColor Yellow
    Write-Host "$esc]8;;$url$esc\$url$esc]8;;$esc\" -ForegroundColor Cyan
    Write-Host 'Escribe el código mostrado por OpenCode y autoriza tu cuenta.' -ForegroundColor Gray
    Write-Host 'Waiting for authorization es normal hasta completar ese paso.' -ForegroundColor DarkGray
    Write-Host 'Ctrl + C cancela la espera.' -ForegroundColor DarkGray
    Write-Host ''
}

function Show-OpenCodeLastLog {
    $logDir = Join-Path $HOME '.local/share/opencode/log'
    if (-not (Test-Path $logDir)) { return }
    $latest = Get-ChildItem $logDir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) {
        Write-Host ''
        Write-Host "Último log: $($latest.FullName)" -ForegroundColor Cyan
        Get-Content $latest.FullName -Tail 35 -ErrorAction SilentlyContinue
    }
}

function Invoke-OpenCode {
    param([string[]]$Arguments = @())
    if (-not (Install-OpenCode)) { return }
    Set-Location /workspace
    $binary = OpenCode-Binary
    & $binary @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host ''
        Write-Host "OpenCode terminó con código $exitCode." -ForegroundColor Red
        Write-Host 'Tus credenciales de GitHub siguen guardadas.' -ForegroundColor Yellow
        Show-OpenCodeLastLog
        Write-Host 'Ejecuta oc-repair para limpiar solo la caché temporal.' -ForegroundColor Green
    }
}

function OpenCode-Status {
    Write-Host ''
    Write-Host '=== ANDER OpenCode Status ===' -ForegroundColor Cyan
    if (-not (Install-OpenCode)) { return }
    $authFile = OpenCode-AuthFile
    Write-Host "Credenciales: $authFile" -ForegroundColor DarkGray
    if (Test-Path $authFile) { Write-Host 'Credenciales persistentes encontradas.' -ForegroundColor Green }
    else { Write-Host 'No hay proveedor conectado en esta mini PC.' -ForegroundColor Yellow }
    Write-Host ''
    Write-Host 'Proveedores conectados:' -ForegroundColor Cyan
    $binary = OpenCode-Binary
    & $binary auth list
    if ($LASTEXITCODE -ne 0) { Show-OpenCodeLastLog }
}

function Connect-OpenCode {
    if (-not (Install-OpenCode)) { return }
    Write-Host ''
    Write-Host 'Conectando GitHub Copilot con OpenCode...' -ForegroundColor Cyan
    Show-GitHubDeviceLink
    $binary = OpenCode-Binary
    & $binary auth login --provider github-copilot
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Abriendo el selector general de proveedores...' -ForegroundColor Yellow
        & $binary auth login
    }
    Write-Host ''
    OpenCode-Status
    Write-Host 'Después ejecuta oc y dentro usa /models.' -ForegroundColor Green
}

function OpenCode-Repair {
    Write-Host 'Limpiando solamente la caché temporal de OpenCode...' -ForegroundColor Cyan
    $cache = Join-Path $HOME '.cache/opencode'
    Remove-Item $cache -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $cache | Out-Null
    Write-Host 'Caché limpia. Tus credenciales y configuración se conservaron.' -ForegroundColor Green
    OpenCode-Status
}

function OpenCode-Doctor {
    OpenCode-Status
    Show-OpenCodeLastLog
    Write-Host ''
    Write-Host 'Binario baseline estable para Codespaces.' -ForegroundColor Green
    Write-Host 'Actualización automática desactivada.' -ForegroundColor Green
}

function OpenCode-Ready {
    if (-not (Install-OpenCode)) { return }
    $authFile = OpenCode-AuthFile
    if (-not (Test-Path $authFile)) {
        Write-Host 'Esta mini PC todavía no tiene un proveedor conectado.' -ForegroundColor Yellow
        Connect-OpenCode
        if (-not (Test-Path $authFile)) { return }
    }
    Invoke-OpenCode
}

function OpenCode-Start { Invoke-OpenCode }

Set-Alias oc OpenCode-Ready
Set-Alias oc-start OpenCode-Start
Set-Alias oc-connect Connect-OpenCode
Set-Alias oc-status OpenCode-Status
Set-Alias oc-doctor OpenCode-Doctor
Set-Alias oc-repair OpenCode-Repair
Set-Alias github-device Show-GitHubDeviceLink

Clear-Host
Write-Host 'ANDER PowerShell 7' -ForegroundColor Cyan
Write-Host 'Workspace compartido: /workspace' -ForegroundColor DarkGray
Write-Host 'OpenCode baseline, Node.js, npm, Python, Git, curl y sudo disponibles.' -ForegroundColor DarkGray
Write-Host 'Tab autocompleta · Esc limpia · Ctrl+C cancela procesos.' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'oc          ' -NoNewline -ForegroundColor Green
Write-Host 'Abrir OpenCode'
Write-Host 'oc-connect  ' -NoNewline -ForegroundColor Green
Write-Host 'Conectar GitHub Copilot'
Write-Host 'oc-status   ' -NoNewline -ForegroundColor Green
Write-Host 'Ver proveedor y credenciales'
Write-Host 'oc-repair   ' -NoNewline -ForegroundColor Green
Write-Host 'Limpiar caché sin borrar la cuenta'
Write-Host 'oc-doctor   ' -NoNewline -ForegroundColor Green
Write-Host 'Mostrar diagnóstico y último log'
Write-Host ''
