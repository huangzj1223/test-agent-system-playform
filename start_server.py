#!/usr/bin/env python3
"""
Simple LangGraph API Server

A minimal script to start the LangGraph API server directly using uvicorn.
"""


import os
import sys
import json
import sysconfig
from pathlib import Path


def prefer_installed_langgraph_api():
    """Prefer the venv's langgraph_api over the stale local vendored copy."""
    for key in ("purelib", "platlib"):
        site_packages = Path(sysconfig.get_paths().get(key, ""))
        if (site_packages / "langgraph_api" / "_checkpointer").exists():
            site_packages_str = str(site_packages)
            if site_packages_str in sys.path:
                sys.path.remove(site_packages_str)
            sys.path.insert(0, site_packages_str)
            return

def setup_environment():
    """Setup required environment variables"""
    # Add project source directories to Python path without shadowing installed packages.
# pragma: no cover  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2VGsxNVdRPT06MWQyMWJjMTY=

    project_root = Path(__file__).parent
    for extra_path in (project_root / "src", project_root / "backend"):
        if extra_path.exists():
            extra_path_str = str(extra_path)
            if extra_path_str not in sys.path:
                sys.path.append(extra_path_str)
    
    # Load graphs from graph.json
    config_path = Path(__file__).parent / "graph.json"
    graphs = {}
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            graphs = config.get("graphs", {})
    
    # Set environment variables
    os.environ.update({
        # Database and storage - 使用自定义 PostgreSQL checkpointer
        # "POSTGRES_URI": "postgresql://postgres:postgres@localhost:5432/langgraph_checkpointer_db?sslmode=disable",
        # "REDIS_URI": "redis://localhost:6379",
        "DATABASE_URI": ":memory:",
        "REDIS_URI": "fake",
        # "MIGRATIONS_PATH": "/storage/migrations",
        "MIGRATIONS_PATH": "__inmem",
        # Server configuration
        "ALLOW_PRIVATE_NETWORK": "true",
        "LANGGRAPH_UI_BUNDLER": "true",
        "LANGGRAPH_RUNTIME_EDITION": "inmem",
        "LANGSMITH_LANGGRAPH_API_VARIANT": "local_dev",
        "LANGGRAPH_DISABLE_FILE_PERSISTENCE": "false",
        "LANGGRAPH_ALLOW_BLOCKING": "true",
        "LANGGRAPH_API_URL": "http://localhost:2026",

        # "LANGGRAPH_DEFAULT_RECURSION_LIMIT": "1000",
        
        # Graphs configuration
        "LANGSERVE_GRAPHS": json.dumps(graphs) if graphs else "{}",
        
        # Worker configuration
        "N_JOBS_PER_WORKER": "1",
    })
# fmt: off  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2VGsxNVdRPT06MWQyMWJjMTY=
    
    # Load .env file if exists
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
            print("Loaded environment from .env")
        except ImportError:
            print("python-dotenv not installed, skipping .env file")
# pragma: no cover  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2VGsxNVdRPT06MWQyMWJjMTY=
    prefer_installed_langgraph_api()

def main():
    """Start the server"""
    print("Starting Simple LangGraph API Server...")
    
    # Setup environment
    setup_environment()
    
    # Print server information
    print("\n" + "="*60)
    print("Server URL: http://localhost:2026")
    print("API Documentation: http://localhost:2026/docs")
    print("Studio UI: http://localhost:2026/ui")
    print("Health Check: http://localhost:2026/ok")
    print("="*60)
# pragma: no cover  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2VGsxNVdRPT06MWQyMWJjMTY=
    
    try:
        # Import uvicorn after environment setup
        import uvicorn
        
        # Start the server directly
        uvicorn.run(
            "langgraph_api.server:app",
            host="0.0.0.0",
            port=2026,
            reload=False,
            access_log=False,
            log_config={
                "version": 1,
                "disable_existing_loggers": False,
                "formatters": {
                    "default": {
                        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    }
                },
                "handlers": {
                    "default": {
                        "formatter": "default",
                        "class": "logging.StreamHandler",
                        "stream": "ext://sys.stdout",
                    }
                },
                "root": {
                    "level": "INFO",
                    "handlers": ["default"],
                },
                "loggers": {
                    "uvicorn": {"level": "INFO"},
                    "uvicorn.error": {"level": "INFO"},
                    "uvicorn.access": {"level": "WARNING"},
                }
            }
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server failed to start: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
