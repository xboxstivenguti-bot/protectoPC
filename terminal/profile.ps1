$Host.UI.RawUI.WindowTitle = 'ANDER PowerShell'
Set-Location /workspace

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

Clear-Host
Write-Host 'ANDER PowerShell 7' -ForegroundColor Cyan
Write-Host 'Workspace compartido: /workspace' -ForegroundColor DarkGray
Write-Host 'Node.js, npm, Python, Git, curl y sudo están disponibles.' -ForegroundColor DarkGray
Write-Host 'Para instalar OpenCode usa la instrucción oficial vigente desde opencode.ai/docs.' -ForegroundColor DarkGray
Write-Host ''
