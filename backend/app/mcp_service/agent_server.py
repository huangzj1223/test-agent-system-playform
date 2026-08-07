"""MCP server exposing local testing agents."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastmcp import FastMCP  # noqa: E402

from app.agents.bridge import invoke_agent, list_agents, parse_context  # noqa: E402


mcp = FastMCP(name="Test-Agent-System-Platform")


@mcp.tool()
def list_test_agents() -> dict[str, dict[str, str]]:
    """List available intelligent testing agents."""
    return {
        name: {
            "module": spec.module,
            "description": spec.description,
        }
        for name, spec in list_agents().items()
    }


@mcp.tool()
async def invoke_test_agent(
    prompt: str,
    agent: str = "api",
    context: str | dict[str, Any] | None = None,
    config: dict[str, Any] | None = None,
    include_raw: bool = False,
) -> dict[str, Any]:
    """Invoke a testing agent with an optional runtime context."""
    runtime_context = parse_context(context) if isinstance(context, str) else dict(context or {})
    result = await invoke_agent(
        agent,
        prompt,
        context=runtime_context,
        config=config or {},
    )
    if not include_raw:
        result.pop("raw", None)
    return result


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run testing agents as an MCP server.")
    parser.add_argument(
        "--transport",
        default="stdio",
        choices=["stdio", "sse"],
        help="MCP transport. Default: stdio.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8018,
        help="SSE port. Default: 8018.",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="SSE host. Default: 127.0.0.1.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    if args.transport == "sse":
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
