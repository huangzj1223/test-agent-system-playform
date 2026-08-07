chcp 65001 > $null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'SilentlyContinue'

$SCRIPT_DIR = $PSScriptRoot
$ROOT_DIR = (Get-Item $SCRIPT_DIR).Parent.FullName
$PID_DIR = Join-Path $SCRIPT_DIR ".pids"

function Write-Log {
    param($Message)
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}

function Write-Ok {
    param($Message)
    Write-Host ("[{0}] OK {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Green
}

function Stop-ProcessByPidFile {
    param($Name)
    $pidFile = Join-Path $PID_DIR "$Name.pid"
    if (-not (Test-Path $pidFile)) {
        return
    }
    
    $pid = Get-Content $pidFile -Raw
    if ([string]::IsNullOrEmpty($pid)) {
        return
    }
    
    $pid = $pid.Trim()
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($null -ne $process) {
        Write-Log ("Stopping {0} (PID: {1})..." -f $Name, $pid)
        $process.Kill()
        $process.WaitForExit()
        Write-Ok ("{0} stopped" -f $Name)
    }
    
    Remove-Item $pidFile -Force
}

function Stop-Docker {
    Write-Log "Stopping Docker containers..."
    $dockerFile = Join-Path $ROOT_DIR "server/docker/docker-compose.dev.yaml"
    if (Test-Path $dockerFile) {
        docker compose -f $dockerFile down
        Write-Ok "Docker containers stopped"
    }
}

Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  SDAD Full-stack Dev Environment - One Click Stop" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow

Write-Log "Stopping frontend services..."
Stop-ProcessByPidFile "Frontend"
Stop-ProcessByPidFile "Admin"
Stop-ProcessByPidFile "Mobile"

Write-Host ""
Write-Log "Stopping backend service..."
Stop-ProcessByPidFile "server"

Write-Host ""
Stop-Docker

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Stop Complete" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green