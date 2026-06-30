"""
Smoke-test script for the Web Automation Testing Agent.

Usage:
    python -m app.agents.web.validate_agent

Checks:
    1. Agent module imports cleanly (or reports LLM dep issue)
    2. Custom tools are registered and callable
    3. Backend routes resolve correctly
    4. Skills are discoverable
    5. External CLI dependencies (node / playwright)
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend/ to sys.path so `import app.*` resolves correctly
src_root = Path(__file__).resolve().parents[3]  # .../backend/
sys.path.insert(0, str(src_root))


def _check_import() -> bool:
    print("[1/5] Checking agent module import...")
    try:
        from app.agents.web import agent as agent_module

        print(f"      OK — agent created: {type(agent_module.agent).__name__}")
        return True
    except ImportError as e:
        err_msg = str(e)
        if "langchain-deepseek" in err_msg or "deepseek" in err_msg.lower():
            print("      WARN — LLM dependency missing (pip install langchain-deepseek)")
            print(f"             {err_msg}")
            return True
        print(f"      FAIL — {e}")
        return False
    except Exception as e:
        print(f"      FAIL — {e}")
        return False


def _check_tools() -> bool:
    print("[2/5] Checking custom tools...")
    try:
        import shutil
        from app.agents.web.tools import (
            check_environment,
            cleanup_temp,
            detect_test_mode,
            ensure_output_dir,
            list_sessions,
            temp_dir,
        )

        # ── detect_test_mode ──────────────────────────────────────────────────
        assert detect_test_mode("Test https://example.com") == "MODE_A_QA", "MODE_A expected"
        assert detect_test_mode("Test repo at C:\\Projects\\app") == "MODE_B_COMPONENT", "MODE_B expected"
        assert detect_test_mode("hello") == "ASK_CLARIFICATION", "ASK expected"
        assert detect_test_mode("对 https://example.com 生成自动化测试脚本") == "MODE_C_BASIC", "MODE_C_BASIC expected"
        assert detect_test_mode("Generate test scripts for https://example.com") == "MODE_C_BASIC", "MODE_C_BASIC (en) expected"
        assert (
            detect_test_mode("对 https://example.com 生成自动化测试脚本，源码在 C:\\Projects\\app")
            == "MODE_C_ENHANCED"
        ), "MODE_C_ENHANCED expected"
        print("      OK — detect_test_mode (all modes A/B/C)")

        # ── check_environment ─────────────────────────────────────────────────
        env = check_environment()
        assert "tools" in env, "Missing 'tools' key"
        assert "node" in env["tools"], "Missing node check"
        assert "playwright" in env["tools"], "Missing playwright check"
        assert "playwright_in_workspace" in env, "Missing playwright_in_workspace flag"
        print(
            f"      OK — check_environment: node={env['tools']['node'].get('version') or 'N/A'}, "
            f"playwright={env['tools']['playwright'].get('version') or 'N/A'}, "
            f"workspace_nm={env['playwright_in_workspace']}"
        )

        # ── ensure_output_dir ─────────────────────────────────────────────────
        qa_dir = ensure_output_dir("MODE_A_QA", "example.com")
        assert Path(qa_dir).exists(), "QA dir not created"
        assert (Path(qa_dir) / "screenshots").exists(), "Missing screenshots subdir"
        qa_path = Path(qa_dir)
        shutil.rmtree(qa_path, ignore_errors=True)
        shutil.rmtree(qa_path.parent, ignore_errors=True)

        script_dir = ensure_output_dir("MODE_C_BASIC", "example.com")
        assert Path(script_dir).exists(), "Script dir not created"
        assert (Path(script_dir) / "poms").exists(), "Missing poms subdir"
        assert (Path(script_dir) / "tests").exists(), "Missing tests subdir"
        assert (Path(script_dir) / "screenshots").exists(), "Missing screenshots subdir"
        assert (Path(script_dir) / "run.ps1").exists(), "Missing run.ps1"
        assert (Path(script_dir) / "run.sh").exists(), "Missing run.sh"
        sp = Path(script_dir)
        shutil.rmtree(sp, ignore_errors=True)
        shutil.rmtree(sp.parent, ignore_errors=True)
        print("      OK — ensure_output_dir (Mode A/B/C) with run scripts")

        # ── list_sessions ─────────────────────────────────────────────────────
        sessions_json = list_sessions()
        import json
        sessions_data = json.loads(sessions_json)
        assert "total" in sessions_data, "Missing 'total' key"
        assert "sessions" in sessions_data, "Missing 'sessions' key"
        print(f"      OK — list_sessions: found {sessions_data['total']} session(s)")

        # ── cleanup_temp ──────────────────────────────────────────────────────
        # Write a dummy file to _temp, then clean it up
        dummy = temp_dir / "_validate_dummy.txt"
        dummy.write_text("test", encoding="utf-8")
        result_json = cleanup_temp()
        result = json.loads(result_json)
        assert result["deleted_count"] >= 1, "Expected at least 1 deleted file"
        assert "_validate_dummy.txt" in result["deleted"], "Dummy file not listed as deleted"
        assert not dummy.exists(), "Dummy file still exists after cleanup"
        print(f"      OK — cleanup_temp: deleted {result['deleted_count']} file(s)")

        return True
    except Exception as e:
        import traceback
        print(f"      FAIL — {e}")
        traceback.print_exc()
        return False


def _check_backend() -> bool:
    print("[3/5] Checking backend routing...")
    try:
        from app.agents.web.tools import composite_backend, file_backend, shell_backend

        # Shell backend: execute a simple command
        result = shell_backend.execute("echo backend_ok")
        assert result.exit_code == 0, f"shell exit_code={result.exit_code}"
        assert "backend_ok" in result.output, f"unexpected output: {result.output}"
        print("      OK — shell_backend.execute")

        # File backend: list workspace root via ls_info (returns list of dicts)
        entries = file_backend.ls_info("/")
        assert isinstance(entries, list), f"ls_info should return list, got {type(entries)}"
        entry_names = {e["path"].strip("/").split("/")[-1] for e in entries}
        print(f"      OK — file_backend.ls_info: {len(entries)} entries at root")

        # File backend: check skills path availability (WARN if not mounted yet)
        skills_entries = file_backend.ls_info("/web/skills")
        if skills_entries:
            skill_names = {e["path"].rstrip("/").split("/")[-1] for e in skills_entries}
            print(f"      OK — skills directory: {len(skill_names)} skill(s) found")
        else:
            print("      WARN — /web/skills/ is empty or not yet mounted (skills added at runtime)")

        # Composite backend.execute delegates to shell
        result2 = composite_backend.execute("echo composite_ok")
        assert result2.exit_code == 0, f"composite exit_code={result2.exit_code}"
        print("      OK — composite_backend.execute")

        return True
    except Exception as e:
        print(f"      FAIL — {e}")
        return False


def _check_skills() -> bool:
    print("[4/5] Checking skill readability...")
    try:
        from app.agents.web.tools import file_backend

        required_skills = [
            "/web/skills/pw-dogfood/SKILL.md",
            "/web/skills/component-aware-web-automation/SKILL.md",
            "/web/skills/agent-browser-vs-playwright-cli/SKILL.md",
            "/web/skills/playwright-cli/SKILL.md",
            "/web/skills/agent-browser/SKILL.md",
            "/web/skills/runtime-script-gen/SKILL.md",
        ]
        found, missing = [], []
        for path in required_skills:
            content = file_backend.read(path)  # returns str; starts with "Error:" if not found
            if content.startswith("Error:"):
                missing.append(path)
            elif len(content) > 100:
                found.append(path)
            else:
                missing.append(f"{path} (too short: {len(content)} chars)")

        if found:
            print(f"      OK — {len(found)}/{len(required_skills)} skills readable")
        if missing:
            print(f"      WARN — {len(missing)} skills not found (may not be deployed yet):")
            for m in missing:
                print(f"             {m}")

        # Pass even if skills are missing — they may not be deployed in all environments
        return True
    except Exception as e:
        print(f"      FAIL — {e}")
        return False


def _check_environment() -> bool:
    print("[5/5] Checking external CLI dependencies (node / playwright)...")
    try:
        from app.agents.web.tools import check_environment

        env = check_environment()

        node = env["tools"].get("node", {})
        if node.get("available"):
            print(f"      OK  — node {node.get('version')}")
        else:
            print(f"      WARN — node unavailable: {node.get('error')}")

        pw = env["tools"].get("playwright", {})
        if pw.get("available"):
            print(f"      OK  — playwright {pw.get('version')}")
        else:
            print(f"      WARN — playwright (npx) unavailable: {pw.get('error')}")

        nm = env.get("playwright_in_workspace")
        print(f"      INFO — playwright in workspace/node_modules: {nm}")

        return True
    except Exception as e:
        print(f"      FAIL — {e}")
        return False


def main() -> int:
    print("=" * 60)
    print("Web Automation Testing Agent — Validation Suite")
    print("=" * 60)

    results = [
        _check_import(),
        _check_tools(),
        _check_backend(),
        _check_skills(),
        _check_environment(),
    ]

    passed = sum(results)
    total = len(results)

    print("=" * 60)
    if passed == total:
        print(f"All {total} checks PASSED.")
        return 0
    else:
        print(f"{passed}/{total} checks passed. Review failures above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
