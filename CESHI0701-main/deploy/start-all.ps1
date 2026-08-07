chcp 65001 > $null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'SilentlyContinue'

$SCRIPT_DIR = $PSScriptRoot
$ROOT_DIR = (Get-Item $SCRIPT_DIR).Parent.FullName
$LOG_DIR = Join-Path $SCRIPT_DIR "logs"
$PID_DIR = Join-Path $SCRIPT_DIR ".pids"

New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $PID_DIR -Force | Out-Null

function Write-Log {
    param($Message)
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}

function Write-Ok {
    param($Message)
    Write-Host ("[{0}] OK {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Green
}

function Write-Warn {
    param($Message)
    Write-Host ("[{0}] !! {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Yellow
}

function Write-Err {
    param($Message)
    Write-Host ("[{0}] XX {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Red
}

function Show-ProgressBar {
    param($Current, $Max, $Message)
    $progress = [math]::Min([math]::Round(($Current / $Max) * 100), 100)
    $barLength = 40
    $filled = [math]::Round(($Current / $Max) * $barLength)
    $empty = $barLength - $filled
    
    $progressBar = "[" + ("=" * $filled) + (" " * $empty) + "]"
    $elapsed = $Current
    $eta = if ($Current -gt 0) { [math]::Round(($Max - $Current) * ($Current / $Current)) } else { $Max }
    
    Write-Host ("`r{0} {1} {2}%  [{3}s / {4}s] ETA: {5}s" -f $Message, $progressBar, $progress, $elapsed, $Max, $eta) -NoNewline -ForegroundColor Cyan
}

function Test-PortUsed {
    param($Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    }
    catch {
        return $true
    }
}

function Test-Dependency {
    param($Command)
    $result = Get-Command $Command -ErrorAction SilentlyContinue
    return $null -ne $result
}

function Check-Dependencies {
    Write-Log "Checking system dependencies..."
    $missing = @()
    
    if (-not (Test-Dependency "node")) { $missing += "node" }
    if (-not (Test-Dependency "npm")) { $missing += "npm" }
    if (-not (Test-Dependency "pnpm")) { $missing += "pnpm" }
    if (-not (Test-Dependency "docker")) { $missing += "docker" }
    
    if ($missing.Count -gt 0) {
        Write-Err ("Missing dependencies: {0}" -f ($missing -join ', '))
        Write-Err "Please install Node.js (>=20), pnpm and Docker Desktop"
        exit 1
    }

    Write-Log "Checking Docker status..."
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Docker is not ready, trying to start Docker Desktop..."
        
        $dockerPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerPath) {
            Start-Process -FilePath $dockerPath
        } else {
            $dockerPath = "$env:ProgramFiles\Docker\Docker.exe"
            if (Test-Path $dockerPath) {
                Start-Process -FilePath $dockerPath
            } else {
                Write-Err "Docker Desktop not found. Please install Docker Desktop first."
                exit 1
            }
        }
        
        Write-Host ""
        $maxWait = 60
        $waitCount = 0
        while ($waitCount -lt $maxWait) {
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Ok "Docker is now running"
                break
            }
            Show-ProgressBar -Current $waitCount -Max $maxWait -Message "Waiting for Docker..."
            Start-Sleep -Seconds 2
            $waitCount += 2
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Err "Docker startup timed out. Please start Docker Desktop manually."
            exit 1
        }
    }

    Write-Ok "Dependency check passed"
}

function Ensure-Dependencies {
    param($Dir, $Name)
    $targetDir = Join-Path $ROOT_DIR $Dir
    $nodeModules = Join-Path $targetDir "node_modules"
    
    if (-not (Test-Path $nodeModules)) {
        Write-Warn ("{0} missing node_modules, running npm install (first time may be slow)..." -f $Name)
        try {
            Push-Location $targetDir
            npm install 2>&1 | Out-File "$LOG_DIR/$Name-install.log"
            Write-Ok ("{0} dependencies installed" -f $Name)
        }
        catch {
            Write-Err ("{0} dependencies install failed, see {1}" -f $Name, "$LOG_DIR/$Name-install.log")
            exit 1
        }
        finally {
            Pop-Location
        }
    }
}

function Start-BackgroundProcess {
    param($Command, $Arguments, $WorkingDir, $Name)
    $logFile = Join-Path $LOG_DIR "$Name.log"
    $pidFile = Join-Path $PID_DIR "$Name.pid"
    
    $cmdArgs = "/c cd /d `"$WorkingDir`" && $Command $Arguments > `"$logFile`" 2>&1"
    
    Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -WindowStyle Hidden
    
    Start-Sleep -Seconds 2
    
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -match $Name -or $_.Path -match "npm"
    } | Select-Object -First 1 -ExpandProperty Id | Out-File $pidFile -Force
    
    Write-Ok ("{0} started, log: deploy/logs/{1}.log" -f $Name, $Name)
}

function Start-Vite {
    param($Dir, $Name, $Port)
    if (Test-PortUsed $Port) {
        Write-Warn ("{0} port {1} is already in use, skip (may already be running)" -f $Name, $Port)
        return
    }
    
    Ensure-Dependencies $Dir $Name
    Write-Log ("Starting {0} (port {1})..." -f $Name, $Port)
    
    $targetDir = Join-Path $ROOT_DIR $Dir
    Start-BackgroundProcess -Command "npm" -Arguments "run dev" -WorkingDir $targetDir -Name $Name
}

function Start-Server {
    if (Test-PortUsed 9001) {
        Write-Warn "Backend server port 9001 is already in use, skip (may already be running)"
        return
    }
    
    Write-Log "Starting backend server (port 9001), first time will start MySQL/Redis containers, please wait..."
    
    $dockerFile = Join-Path $ROOT_DIR "server/docker/docker-compose.dev.yaml"
    if (-not (Test-Path $dockerFile)) {
        Write-Err ("Docker Compose file not found: {0}" -f $dockerFile)
        exit 1
    }
    
    Write-Log "Starting MySQL and Redis containers..."
    docker compose -f $dockerFile up -d
    
    Start-Sleep -Seconds 5
    
    Write-Log "Starting backend service..."
    $targetDir = Join-Path $ROOT_DIR "server"
    Start-BackgroundProcess -Command "npm" -Arguments "run start:dev" -WorkingDir $targetDir -Name "server"
}

function Wait-Port {
    param($Port, $Name, $MaxWait = 60)
    Write-Log ("Waiting for {0} (port {1}) to be ready..." -f $Name, $Port)
    $count = 0
    while ($count -lt $MaxWait) {
        if (-not (Test-PortUsed $Port)) {
            Show-ProgressBar -Current $count -Max $MaxWait -Message ("Waiting for {0}..." -f $Name)
            Start-Sleep -Seconds 2
            $count += 2
            continue
        }
        Write-Host ""
        Write-Ok ("{0} is ready -> http://localhost:{1}" -f $Name, $Port)
        return $true
    }
    Write-Host ""
    Write-Warn ("{0} timeout after {1} seconds, please check log: deploy/logs/{2}.log" -f $Name, $MaxWait, $Name)
    return $false
}

$totalSteps = 6
$currentStep = 0

function Update-Step {
    param($StepName, $Status)
    $script:currentStep++
    $progress = [math]::Round(($currentStep / $totalSteps) * 100)
    $statusColor = switch ($Status) {
        "ok" { "Green" }
        "warn" { "Yellow" }
        default { "Cyan" }
    }
    Write-Host ("[{0}/{1}] [{2}%] {3}" -f $currentStep, $totalSteps, $progress, $StepName) -ForegroundColor $statusColor
}

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  SDAD Full-stack Dev Environment - One Click Start" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Total steps: $totalSteps" -ForegroundColor Gray
Write-Host ""

Update-Step -StepName "Checking system dependencies..." -Status "running"
Check-Dependencies
Update-Step -StepName "Dependency check passed" -Status "ok"

Write-Host ""
Write-Log "Start order: Docker -> Backend -> Frontend"

Update-Step -StepName "Starting backend server..." -Status "running"
Start-Server

Update-Step -StepName "Waiting for Backend (port 9001)..." -Status "running"
Wait-Port -Port 9001 -Name "Backend" -MaxWait 90 | Out-Null

Write-Host ""
Write-Log "Starting frontend services..."

Update-Step -StepName "Starting Frontend (port 3006)..." -Status "running"
Start-Vite -Dir "frontend" -Name "Frontend" -Port 3006

Update-Step -StepName "Starting Admin (port 5173)..." -Status "running"
Start-Vite -Dir "backend" -Name "Admin" -Port 5173

Update-Step -StepName "Starting Mobile (port 3000)..." -Status "running"
Start-Vite -Dir "mobile" -Name "Mobile" -Port 3000

Start-Sleep -Seconds 5

Write-Host ""
Write-Log "Waiting for frontend services to be ready..."

Wait-Port -Port 3006 -Name "Frontend" -MaxWait 40 | Out-Null
Wait-Port -Port 5173 -Name "Admin" -MaxWait 40 | Out-Null
Wait-Port -Port 3000 -Name "Mobile" -MaxWait 40 | Out-Null

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Start Complete" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Backend       : http://localhost:9001  (API Doc /docs)" -ForegroundColor Cyan
Write-Host "  Frontend      : http://localhost:3006" -ForegroundColor Cyan
Write-Host "  Admin         : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Mobile        : http://localhost:3000" -ForegroundColor Cyan
Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host "  Logs: deploy/logs/<service>.log" -ForegroundColor Gray
Write-Host "  Stop all: run stop-all.ps1 or close terminal" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Default admin: admin / 123456" -ForegroundColor Yellow
Write-Host ""