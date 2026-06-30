#!/usr/bin/env python3
"""Check which dependencies from pyproject.toml are missing."""
import subprocess
import sys
import re

# Required packages from pyproject.toml
required = [
    "alembic>=1.13.0",
    "apscheduler>=3.11.0",
    "asyncpg>=0.31.0",
    "deepagents>=0.6.1",
    "fastapi>=0.136.1",
    "httpx>=0.28.1",
    "jsonpath-ng>=1.8.0",
    "langchain-deepseek>=1.0.1",
    "langchain-mcp-adapters>=0.2.2",
    "langgraph-cli[inmem]>=0.4.26",
    "minio>=7.2.20",
    "motor>=3.7.1",
    "psycopg>=3.3.4",
    "passlib[bcrypt]>=1.7.4",
    "psycopg-binary>=3.3.4",
    "psycopg-pool>=3.3.1",
    "psycopg2-binary>=2.9.9",
    "pydantic-settings>=2.14.1",
    "python-multipart>=0.0.28",
    "redis>=7.4.0",
    "sse-starlette==2.1.3",
    "starlette>=1.0.0",
    "structlog>=25.5.0",
    "pydantic[email]>=2.13.4",
    "sqlalchemy>=2.0.49",
    "uvicorn>=0.46.0",
    "python-jose>=3.5.0",
    "openpyxl>=3.1.5",
    "langchain-pymupdf4llm>=0.5.0",
    "aiohttp>=3.14.0",
]

# Map package specifiers to import names
pkg_to_import = {
    "alembic": "alembic",
    "apscheduler": "apscheduler",
    "asyncpg": "asyncpg",
    "deepagents": "deepagents",
    "fastapi": "fastapi",
    "httpx": "httpx",
    "jsonpath-ng": "jsonpath_ng",
    "langchain-deepseek": "langchain_deepseek",
    "langchain-mcp-adapters": "langchain_mcp_adapters",
    "langgraph-cli": "langgraph_cli",
    "minio": "minio",
    "motor": "motor",
    "psycopg": "psycopg",
    "passlib": "passlib",
    "psycopg-binary": "psycopg_binary",
    "psycopg-pool": "psycopg_pool",
    "psycopg2-binary": "psycopg2",
    "pydantic-settings": "pydantic_settings",
    "python-multipart": "multipart",
    "redis": "redis",
    "sse-starlette": "sse_starlette",
    "starlette": "starlette",
    "structlog": "structlog",
    "pydantic": "pydantic",
    "sqlalchemy": "sqlalchemy",
    "uvicorn": "uvicorn",
    "python-jose": "jose",
    "openpyxl": "openpyxl",
    "langchain-pymupdf4llm": "langchain_pymupdf4llm",
    "aiohttp": "aiohttp",
}

installed = []
missing = []
import_errors = []

for spec in required:
    # Extract package name (remove extras and version)
    name = re.split(r'[\[>=<]', spec)[0].strip()
    import_name = pkg_to_import.get(name, name)
    
    try:
        mod = __import__(import_name)
        version = getattr(mod, '__version__', 'unknown')
        installed.append(f"  [OK] {name} ({version})")
    except ImportError:
        # Try pip show as fallback
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "show", name],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.startswith('Version:'):
                        ver = line.split(':')[1].strip()
                        installed.append(f"  [OK] {name} ({ver}) [pip show]")
                        break
                else:
                    installed.append(f"  [OK] {name} [pip show, no version]")
            else:
                missing.append(f"  [MISSING] {spec}")
        except Exception:
            missing.append(f"  [MISSING] {spec}")

print("=" * 60)
print("Python Dependencies Check (pyproject.toml)")
print("=" * 60)
print(f"\nInstalled ({len(installed)}/{len(required)}):")
for item in installed:
    print(item)

if missing:
    print(f"\nMissing ({len(missing)}/{len(required)}):")
    for item in missing:
        print(item)
    print(f"\nInstall command:")
    names = " ".join([re.split(r'[\[>=<]', s)[0].strip() for s in missing if '[MISSING]' in s])
    print(f"  uv pip install {names}")
else:
    print(f"\nAll {len(required)} Python packages are installed!")
