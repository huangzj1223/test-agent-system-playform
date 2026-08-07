"""Command line entrypoint for cross-project agent calls."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any


BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.bridge import invoke_agent, list_agents, parse_context  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="test-agent",
        description="Invoke test-agent-system-platform agents from any project.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available agents and exit.",
    )
    parser.add_argument(
        "--agent",
        default="api",
        choices=sorted(list_agents()),
        help="Agent to invoke. Default: api.",
    )
    parser.add_argument(
        "--prompt",
        help="User prompt to send to the agent.",
    )
    parser.add_argument(
        "--prompt-file",
        type=Path,
        help="Read the prompt from a UTF-8 text file.",
    )
    parser.add_argument(
        "--context",
        help='Runtime context as JSON or key=value pairs, for example: project_identifier=datafoundry,folder_id=api.',
    )
    parser.add_argument(
        "--config",
        help="Optional LangGraph RunnableConfig JSON object.",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Include raw JSON-serializable agent result.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=_positive_float,
        default=600.0,
        help="Maximum wall-clock time for one invocation. Default: 600 seconds.",
    )
    return parser


async def async_main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list:
        _print_json(
            {
                name: {
                    "module": spec.module,
                    "description": spec.description,
                }
                for name, spec in list_agents().items()
            }
        )
        return 0

    prompt = _read_prompt(args.prompt, args.prompt_file)
    context = parse_context(args.context)
    config = _parse_json_object(args.config, "config")
    try:
        result = await asyncio.wait_for(
            invoke_agent(
                args.agent,
                prompt,
                context=context,
                config=config,
            ),
            timeout=args.timeout_seconds,
        )
    except TimeoutError:
        _print_json(
            {
                "agent": args.agent,
                "error": "timeout",
                "timeout_seconds": args.timeout_seconds,
                "message": "Agent invocation timed out; no result was accepted.",
            },
            file=sys.stderr,
        )
        return 124

    if not args.raw:
        result.pop("raw", None)

    _print_json(result)
    return 0


def _print_json(payload: Any, *, file=None) -> None:
    stream = file or sys.stdout
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    encoding = getattr(stream, "encoding", None)
    if encoding:
        try:
            text.encode(encoding)
        except UnicodeEncodeError:
            text = json.dumps(payload, ensure_ascii=True, indent=2)
    print(text, file=stream)


def main(argv: list[str] | None = None) -> int:
    return asyncio.run(async_main(argv))


def _read_prompt(prompt: str | None, prompt_file: Path | None) -> str:
    if prompt and prompt_file:
        raise SystemExit("--prompt and --prompt-file cannot be used together")
    if prompt_file:
        return prompt_file.read_text(encoding="utf-8")
    if prompt:
        return prompt
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit("Provide --prompt, --prompt-file, or stdin input")


def _parse_json_object(value: str | None, label: str) -> dict[str, Any]:
    if not value:
        return {}
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise SystemExit(f"{label} must be a JSON object")
    return parsed


def _positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


if __name__ == "__main__":
    raise SystemExit(main())
