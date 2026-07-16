$Host.UI.RawUI.WindowTitle = 'ANDER PowerShell'
Set-Location /workspace

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

function Install-OpenCode {
    $version = (& opencode --version 2>$null)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OpenCode ya está instalado: $version" -ForegroundColor Green
        return $true
    }

    Write-Host 'Instalando OpenCode mediante npm...' -ForegroundColor Cyan
    sudo npm install -g opencode-ai
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'OpenCode instalado correctamente.' -ForegroundColor Green
        return $true
    }

    Write-Host 'No se pudo instalar OpenCode. Revisa la conexión.' -ForegroundColor Red
    return $false
}

function OpenCode-AuthFile {
    return (Join-Path $HOME '.local/share/opencode/auth.json')
}

function OpenCode-Status {
    Write-Host ''
    Write-Host '=== ANDER OpenCode Status ===' -ForegroundColor Cyan
    $version = (& opencode --version 2>$null)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Versión: $version" -ForegroundColor Green
    } else {
        Write-Host 'OpenCode no está instalado.' -ForegroundColor Red
        return
    }

    $authFile = OpenCode-AuthFile
    Write-Host "Credenciales: $authFile" -ForegroundColor DarkGray
    if (Test-Path $authFile) {
        Write-Host 'Archivo de credenciales encontrado y persistente.' -ForegroundColor Green
    } else {
        Write-Host 'No hay proveedor conectado en esta mini PC.' -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host 'Proveedores conectados:' -ForegroundColor Cyan
    & opencode auth list
}

function Connect-OpenCode {
    if (-not (Install-OpenCode)) { return }

    Write-Host ''
    Write-Host 'Conectando GitHub Copilot con OpenCode...' -ForegroundColor Cyan
    Write-Host 'OpenCode mostrará github.com/login/device y un código.' -ForegroundColor Gray
    Write-Host 'Abre esa dirección en el teléfono y autoriza tu cuenta.' -ForegroundColor Gray
    Write-Host ''

    & opencode auth login --provider github-copilot
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'No se pudo abrir GitHub Copilot directamente. Abriendo el selector general...' -ForegroundColor Yellow
        & opencode auth login
    }

    Write-Host ''
    OpenCode-Status
    Write-Host 'Después ejecuta OpenCode-Ready y dentro usa /models.' -ForegroundColor Green
}

function OpenCode-Doctor {
    if (-not (Install-OpenCode)) { return }
    OpenCode-Status

    $logDir = Join-Path $HOME '.local/share/opencode/log'
    if (Test-Path $logDir) {
        $latest = Get-ChildItem $logDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
            Write-Host ''
            Write-Host "Último log: $($latest.FullName)" -ForegroundColor Cyan
            Get-Content $latest.FullName -Tail 25
        }
    }

    Write-Host ''
    Write-Host 'Nota: Big Pickle y otros modelos Free tienen cuota temporal.' -ForegroundColor Yellow
    Write-Host 'La cuenta de tu laptop real no se copia automáticamente a este contenedor.' -ForegroundColor Yellow
    Write-Host 'Para usar Copilot aquí ejecuta: Connect-OpenCode' -ForegroundColor Green
}

function OpenCode-Ready {
    if (-not (Install-OpenCode)) { return }

    $authFile = OpenCode-AuthFile
    if (-not (Test-Path $authFile)) {
        Write-Host 'Esta mini PC todavía no tiene la sesión de tu laptop.' -ForegroundColor Yellow
        Write-Host 'Iniciando conexión con GitHub Copilot...' -ForegroundColor Cyan
        Connect-OpenCode
        if (-not (Test-Path $authFile)) { return }
    }

    Set-Location /workspace
    & opencode
}

function OpenCode-Start {
    Set-Location /workspace
    & opencode
}

function Import-OpenCodeAuth {
    $source = '/workspace/opencode-auth.json'
    $target = OpenCode-AuthFile
    if (-not (Test-Path $source)) {
        Write-Host 'No existe /workspace/opencode-auth.json' -ForegroundColor Red
        return
    }

    try {
        Get-Content $source -Raw | ConvertFrom-Json | Out-Null
        New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
        Copy-Item $source $target -Force
        chmod 600 $target
        Write-Host 'Credenciales importadas. Borra el archivo temporal de /workspace.' -ForegroundColor Green
    } catch {
        Write-Host 'El archivo no contiene JSON válido.' -ForegroundColor Red
    }
}

Set-Alias oc OpenCode-Ready
Set-Alias oc-start OpenCode-Start
Set-Alias oc-connect Connect-OpenCode
Set-Alias oc-status OpenCode-Status
Set-Alias oc-doctor OpenCode-Doctor

Clear-Host
Write-Host 'ANDER PowerShell 7' -ForegroundColor Cyan
Write-Host 'Workspace compartido: /workspace' -ForegroundColor DarkGray
Write-Host 'OpenCode, Node.js, npm, Python, Git, curl y sudo están disponibles.' -ForegroundColor DarkGray
Write-Host 'Tab autocompleta · Shift+Tab retrocede · Esc cancela o regresa.' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'oc                ' -NoNewline -ForegroundColor Green
Write-Host 'Preparar/abrir OpenCode'
Write-Host 'oc-connect        ' -NoNewline -ForegroundColor Green
Write-Host 'Conectar GitHub Copilot'
Write-Host 'oc-status         ' -NoNewline -ForegroundColor Green
Write-Host 'Ver proveedor y credenciales'
Write-Host 'oc-doctor         ' -NoNewline -ForegroundColor Green
Write-Host 'Mostrar diagnóstico y último log'
Write-Host ''