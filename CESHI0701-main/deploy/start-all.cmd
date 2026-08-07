@echo off
REM Windows 双击入口：通过 Git Bash 运行 deploy/start-all.sh
REM 若未安装 Git Bash，请手动执行：bash deploy/start-all.sh
setlocal
set "SCRIPT_DIR=%~dp0"

REM 优先使用 Git 自带 bash
set "GITBASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GITBASH%" set "GITBASH=%ProgramFiles(x86)%\Git\bin\bash.exe"

if exist "%GITBASH%" (
  "%GITBASH%" "%SCRIPT_DIR%start-all.sh"
) else (
  where bash >nul 2>nul && (
    bash "%SCRIPT_DIR%start-all.sh"
  ) || (
    echo [错误] 未找到 Git Bash，请安装 Git for Windows，或手动运行: bash deploy/start-all.sh
  )
)

echo.
echo 按任意键关闭本窗口（服务在后台继续运行）...
pause >nul
