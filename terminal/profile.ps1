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
        return
    }

    Write-Host 'Instalando OpenCode mediante npm...' -ForegroundColor Cyan
    sudo npm install -g opencode-ai
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'OpenCode instalado. Ejecuta: OpenCode-Start' -ForegroundColor Green
    } else {
        Write-Host 'No se pudo instalar OpenCode. Revisa la conexión.' -ForegroundColor Red
    }
}

function OpenCode-Status {
    Write-Host 'Proveedores conectados en esta mini PC:' -ForegroundColor Cyan
    opencode auth list
}

function Connect-OpenCode {
    Write-Host ''
    Write-Host 'Conecta OpenCode con tu cuenta de GitHub Copilot:' -ForegroundColor Cyan
    Write-Host '1. En el selector elige GitHub Copilot.' -ForegroundColor Gray
    Write-Host '2. OpenCode mostrará una dirección y un código.' -ForegroundColor Gray
    Write-Host '3. Abre la dirección en el teléfono, inicia sesión y autoriza.' -ForegroundColor Gray
    Write-Host '4. Después abre OpenCode y usa /models para elegir un modelo de Copilot.' -ForegroundColor Gray
    Write-Host ''
    opencode auth login
}

function OpenCode-Start {
    Set-Location /workspace
    opencode
}

function OpenCode-Repair {
    Write-Host 'Comprobando instalación y proveedores...' -ForegroundColor Cyan
    Install-OpenCode
    OpenCode-Status
    Write-Host ''
    Write-Host 'Si no aparece GitHub Copilot, ejecuta: Connect-OpenCode' -ForegroundColor Yellow
}

Set-Alias oc OpenCode-Start
Set-Alias oc-connect Connect-OpenCode
Set-Alias oc-status OpenCode-Status

Clear-Host
Write-Host 'ANDER PowerShell 7' -ForegroundColor Cyan
Write-Host 'Workspace compartido: /workspace' -ForegroundColor DarkGray
Write-Host 'OpenCode, Node.js, npm, Python, Git, curl y sudo están disponibles.' -ForegroundColor DarkGray
Write-Host 'Tab autocompleta · Shift+Tab retrocede · Esc cancela o regresa.' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'OpenCode-Start   ' -NoNewline -ForegroundColor Green
Write-Host 'Abrir OpenCode'
Write-Host 'Connect-OpenCode' -NoNewline -ForegroundColor Green
Write-Host ' Conectar GitHub Copilot sin pegar API'
Write-Host 'OpenCode-Status  ' -NoNewline -ForegroundColor Green
Write-Host 'Ver proveedores conectados'
Write-Host 'OpenCode-Repair  ' -NoNewline -ForegroundColor Green
Write-Host 'Revisar instalación'
Write-Host ''
