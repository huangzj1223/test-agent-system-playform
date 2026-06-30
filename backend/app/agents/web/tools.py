"""
Standalone tools and backend configuration for the Web Automation Testing Agent.

This module contains no LLM initialization, so it can be imported and tested
independently of model-provider dependencies.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Any

from deepagents.backends import CompositeBackend, FilesystemBackend, LocalShellBackend

# =============================================================================
# Workspace & Artifact Directories
# =============================================================================
workspace_dir = Path(__file__).resolve().parents[2] / "workspace"
output_root = workspace_dir / "web-output"
output_root.mkdir(parents=True, exist_ok=True)

# 临时脚本目录 — LLM 写入的所有探索/录制脚本应放在这里，运行后可安全清理
temp_dir = workspace_dir / "_temp"
temp_dir.mkdir(parents=True, exist_ok=True)


# =============================================================================
# Custom Tools
# =============================================================================


def detect_test_mode(user_request: str) -> str:
    """
    Analyze the user's request and decide which testing mode to run.

    Args:
        user_request: The raw user message describing what they want.

    Returns:
        "MODE_C_ENHANCED" if the request contains both a URL and a repo path,
            with intent to generate test scripts.
        "MODE_C_BASIC" if the request contains a URL and explicit script-generation intent.
        "MODE_B_COMPONENT" if the request contains only a local directory/repo path.
        "MODE_A_QA" if the request contains a URL with no script-generation intent.
        "ASK_CLARIFICATION" if ambiguous.
    """
    url_pattern = re.compile(r"https?://[^\s\"']+")
    has_url = bool(url_pattern.search(user_request))

    path_markers = [
        r"[a-zA-Z]:\\",
        r"/home/",
        r"/Users/",
        r"/workspace/",
        r"git@",
        r"github\.com",
        r"\.git",
        r"src/",
        r"repo",
        r"project path",
        r"source code",
        r"codebase",
    ]
    has_repo = any(re.search(marker, user_request) for marker in path_markers)

    script_markers = [
        r"脚本",
        r"自动化",
        r"spec\.ts",
        r"\.spec\.",
        r"playwright",
        r"test script",
        r"automation script",
        r"ts.{0,5}脚本",
        r"生成.{0,10}(测试|脚本|test)",
        r"POM",
        r"Page Object",
        r"测试脚本",
        r"自动化测试",
        r"e2e",
    ]
    has_script_intent = any(
        re.search(marker, user_request, re.IGNORECASE) for marker in script_markers
    )

    if has_url and has_repo and has_script_intent:
        return "MODE_C_ENHANCED"
    if has_url and has_script_intent:
        return "MODE_C_BASIC"
    if has_repo and not has_url:
        return "MODE_B_COMPONENT"
    if has_url and not has_repo:
        return "MODE_A_QA"
    if has_url and has_repo:
        return "MODE_B_COMPONENT"
    return "ASK_CLARIFICATION"


def run_recon_script(
    target_url: str,
    output_dir: str = "",
    login_url: str = "",
    username: str = "",
    password: str = "",
    username_selector: str = "",
    password_selector: str = "",
    submit_selector: str = "",
) -> str:
    """
    Perform Phase-1 reconnaissance on a target URL using Playwright Node.js API.

    Supports optional authentication: when login_url and credentials are provided,
    the tool logs in first (handles post-login modals automatically), then navigates
    to target_url for element extraction. This eliminates the need to write manual
    login scripts.

    Args:
        target_url: The URL to explore after optional login.
        output_dir: Optional absolute directory path. When provided, a screenshot is
                    saved to <output_dir>/screenshots/01-recon-page.png.
        login_url: URL of the login page. When empty, no login is performed.
        username: Login username / account number.
        password: Login password. Special shell characters are handled safely.
        username_selector: CSS selector for the username input field.
                           Default: input[type="text"]:visible or id-based fallbacks.
        password_selector: CSS selector for the password input field.
                           Default: input[type="password"]:visible.
        submit_selector: CSS selector for the login submit button.
                         Default: button[type="submit"] or button with login text.

    Returns:
        JSON string with keys:
          url, title, login_status, elements, links, framework, forms, screenshot_path
    """
    script_dir = workspace_dir / "_recon_scripts"
    script_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    script_path = script_dir / f"recon_{ts}.mjs"
    result_path = script_dir / f"recon_{ts}_result.json"

    # Screenshot setup
    ss_path_value = ""
    screenshot_line = ""
    if output_dir:
        ss_dir = Path(output_dir) / "screenshots"
        ss_dir.mkdir(parents=True, exist_ok=True)
        ss_path_value = str(ss_dir / "01-recon-page.png").replace("\\", "/")
        screenshot_line = f'await page.screenshot({{ path: "{ss_path_value}", fullPage: true }});'

    # Build the authentication block
    if login_url and username:
        # Escape values for safe embedding inside a JS string literal
        def js_str(s: str) -> str:
            return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

        safe_login_url = js_str(login_url)
        safe_username = js_str(username)
        safe_password = js_str(password)
        # Strip query/fragment from login_url for redirect detection
        login_base = login_url.split("?")[0].split("#")[0]
        safe_login_base = js_str(login_base)

        usel = username_selector or (
            'input[type="text"]:visible, '
            'input[id*="account"]:visible, '
            'input[id*="username"]:visible, '
            'input[id*="user"]:visible, '
            'input[name*="user"]:visible'
        )
        psel = password_selector or 'input[type="password"]:visible'
        bsel = submit_selector or (
            'button[type="submit"]:visible, '
            'button:has-text("登录"):visible, '
            'button:has-text("Login"):visible, '
            'button:has-text("Sign in"):visible, '
            'input[type="submit"]:visible'
        )

        auth_block = f"""\
          // ── Authentication phase ─────────────────────────────────────────
          console.log('Navigating to login page...');
          await page.goto("{safe_login_url}", {{ waitUntil: "load", timeout: 60000 }});
          await page.waitForTimeout(1500);

          await page.locator('{usel}').first().fill("{safe_username}");
          console.log('Filled username');
          await page.locator('{psel}').first().fill("{safe_password}");
          console.log('Filled password');
          await page.locator('{bsel}').first().click();
          console.log('Clicked submit');

          // Wait for SPA navigation
          await page.waitForTimeout(3000);

          // Dismiss any post-login modals / notifications automatically
          const dismissSelectors = [
            '.ant-modal-close', '.ant-notification-notice-close',
            'button:has-text("确定")', 'button:has-text("知道了")',
            'button:has-text("关闭")', 'button:has-text("OK")',
          ];
          for (const sel of dismissSelectors) {{
            try {{
              const btn = page.locator(sel).first();
              if (await btn.isVisible({{ timeout: 800 }})) {{
                await btn.click();
                await page.waitForTimeout(400);
                console.log('Dismissed dialog:', sel);
              }}
            }} catch (_) {{}}
          }}

          result.login_status = page.url().includes("{safe_login_base}") ? "failed" : "success";
          console.log('Login status:', result.login_status);

          if (result.login_status === "failed") {{
            result.login_error = "URL still contains login path after submit. Check credentials or selectors.";
            writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
            return;
          }}

          // ── Navigate to target page ───────────────────────────────────────
"""
        init_result = 'const result = { login_status: "pending" };'
    else:
        auth_block = "          result.login_status = 'skipped';\n"
        init_result = "const result = { login_status: 'skipped' };"

    result_file_escaped = str(result_path).replace("\\", "/")

    script_content = textwrap.dedent(f"""\
        import {{ chromium }} from "playwright";
        import {{ writeFileSync }} from "fs";

        const TARGET_URL = "{target_url}";
        const RESULT_FILE = "{result_file_escaped}";

        (async () => {{
          let browser;
          {init_result}
          try {{
            browser = await chromium.launch({{ headless: true, args: ["--no-sandbox"] }});
            const page = await browser.newPage({{ viewport: {{ width: 1920, height: 1080 }} }});

{auth_block}
          console.log('Navigating to target URL...');
          await page.goto(TARGET_URL, {{ waitUntil: "networkidle", timeout: 60000 }});
          await page.waitForTimeout(2000);

          {screenshot_line}

          // Extract interactive elements (using both data-testid and data-test)
          const elements = await page.evaluate(() => {{
            return [...document.querySelectorAll(
              'button, input, select, textarea, a[href], [role=button], [role=link], '
              + '[role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=switch], '
              + '[role=combobox], [onclick], [tabindex]:not([tabindex="-1"])'
            )].map((el, i) => ({{
              index: i,
              tag: el.tagName.toLowerCase(),
              type: el.type || '',
              id: el.id || '',
              name: el.name || '',
              testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || '',
              ariaLabel: el.getAttribute('aria-label') || '',
              role: el.getAttribute('role') || '',
              placeholder: el.placeholder || '',
              text: el.textContent?.trim().slice(0, 60) || '',
              href: el.tagName === 'A' ? el.href : '',
              disabled: el.disabled || false,
              visible: el.offsetParent !== null,
              classes: el.className?.toString().slice(0, 80) || ''
            }})));
          }});

          // Extract same-origin links
          const links = await page.evaluate(() => {{
            return [...document.querySelectorAll('a[href]')]
              .filter(a => a.href.startsWith(location.origin))
              .map(a => ({{
                text: a.textContent?.trim().slice(0, 50),
                href: a.href.replace(location.origin, '')
              }}));
          }});

          // Detect frontend framework
          const framework = await page.evaluate(() => ({{
            react: !!document.querySelector('[data-reactroot]') || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size,
            vue: !!window.__VUE__ || !!document.querySelector('[data-v-]'),
            angular: !!window.ng || !!document.querySelector('[ng-version]'),
            svelte: !!document.querySelector('[class*="svelte-"]'),
            next: !!window.__NEXT_DATA__,
            nuxt: !!window.__NUXT__
          }}));

          // Extract forms
          const forms = await page.evaluate(() => {{
            return [...document.querySelectorAll('form')].map((form, fi) => ({{
              formIndex: fi,
              action: form.action,
              method: form.method,
              fields: [...form.querySelectorAll('input, select, textarea, button')].map(el => ({{
                tag: el.tagName.toLowerCase(),
                type: el.type || '',
                name: el.name || '',
                id: el.id || '',
                testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || '',
                placeholder: el.placeholder || '',
                required: el.required
              }}))
            }})));
          }});

          result.url = page.url();
          result.title = await page.title();
          result.elements = elements;
          result.links = links;
          result.framework = framework;
          result.forms = forms;
          result.screenshot_path = "{ss_path_value}";

          writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
          console.log("RECON_SUCCESS");
        }} catch (e) {{
          result.error = e.message;
          result.stack = e.stack?.slice(0, 800);
          writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
          console.error("RECON_ERROR:", e.message);
        }} finally {{
          if (browser) await browser.close();
        }}
        }})();
    """)

    script_path.write_text(script_content, encoding="utf-8")

    # Use workspace_dir as cwd so node resolves playwright from workspace/node_modules
    node_cwd = str(workspace_dir)
    try:
        proc = subprocess.run(
            f'node "{script_path}"',
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            shell=True,
            cwd=node_cwd,
        )
    except subprocess.TimeoutExpired:
        return json.dumps({
            "error": "Recon script timed out after 120 seconds. "
                     "The target URL may be unreachable or very slow.",
            "target_url": target_url,
        })
    except Exception as e:
        return json.dumps({"error": f"Failed to run recon script: {e}"})

    # Read result JSON then delete temp files
    try:
        if result_path.exists():
            result_data = result_path.read_text(encoding="utf-8")
            if proc.stderr and proc.stderr.strip():
                try:
                    parsed = json.loads(result_data)
                    parsed["_stderr_warnings"] = proc.stderr.strip()[:500]
                    result_data = json.dumps(parsed, ensure_ascii=False, indent=2)
                except json.JSONDecodeError:
                    pass
            return result_data
        else:
            return json.dumps({
                "error": "Recon script failed to produce results.",
                "stdout": proc.stdout[:1000] if proc.stdout else "",
                "stderr": proc.stderr[:1000] if proc.stderr else "",
                "exit_code": proc.returncode,
            })
    finally:
        for tmp in (script_path, result_path):
            try:
                if tmp.exists():
                    tmp.unlink()
            except OSError:
                pass


def check_environment() -> dict[str, Any]:
    """
    Verify that required runtime tools are available in the current environment.

    Checks node.js and npx playwright (the tools actually used by the agent),
    and also reports workspace/node_modules availability.

    Returns:
        A status dictionary with availability flags and version strings.
    """
    results: dict[str, Any] = {"platform": os.name, "tools": {}}

    # Check node.js runtime
    try:
        proc = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
            shell=False,
        )
        results["tools"]["node"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
            "error": proc.stderr.strip() if proc.returncode != 0 else None,
        }
    except FileNotFoundError:
        results["tools"]["node"] = {"available": False, "version": None, "error": "not found on PATH"}
    except Exception as e:  # noqa: BLE001
        results["tools"]["node"] = {"available": False, "version": None, "error": str(e)}

    # Check npx playwright — use shell=True so Windows resolves npx.cmd automatically
    try:
        proc = subprocess.run(
            "npx playwright --version",
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            shell=True,
            cwd=str(workspace_dir),
        )
        results["tools"]["playwright"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
            "error": proc.stderr.strip()[:300] if proc.returncode != 0 else None,
        }
    except Exception as e:  # noqa: BLE001
        results["tools"]["playwright"] = {"available": False, "version": None, "error": str(e)}

    # Check agent-browser CLI
    try:
        proc = subprocess.run(
            "agent-browser --version",
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
            shell=True,
        )
        results["tools"]["agent_browser"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
            "error": proc.stderr.strip()[:200] if proc.returncode != 0 else None,
        }
    except Exception as e:  # noqa: BLE001
        results["tools"]["agent_browser"] = {"available": False, "version": None, "error": str(e)}

    # Report workspace node_modules presence
    nm_path = workspace_dir / "node_modules" / "playwright"
    results["workspace_node_modules"] = str(workspace_dir / "node_modules")
    results["playwright_in_workspace"] = nm_path.exists()

    # Synthesize: URL exploration is only viable if at least one browser CLI is available
    agent_browser_ok = results["tools"].get("agent_browser", {}).get("available", False)
    playwright_ok = results["tools"].get("playwright", {}).get("available", False)
    results["url_exploration_available"] = agent_browser_ok or playwright_ok
    results["recommended_cli"] = (
        "agent-browser" if agent_browser_ok else ("playwright-cli" if playwright_ok else None)
    )

    return results


def run_tests(script_dir: str, headed: bool = False, test_file: str = "") -> str:
    """
    Run Playwright tests in the specified output directory.

    This is the ONLY sanctioned way to run Playwright tests. It uses shell=True so
    that npx resolves correctly on Windows (npx.cmd), enforces a hard 240-second
    wall-clock timeout to prevent zombie processes, and always runs in headless mode
    unless explicitly requested.

    Args:
        script_dir: Absolute path to the directory containing playwright.config.ts.
        headed: If True, launches a visible browser. Default False (headless / CI mode).
                Only use headed=True when the user explicitly wants to watch the run.
        test_file: Optional relative path to a specific spec file
                   (e.g. "tests/smart-search.spec.ts"). Runs all tests when empty.

    Returns:
        JSON string with exit_code, output, and script_dir.
    """
    script_path = Path(script_dir)
    if not script_path.exists():
        return json.dumps({"error": f"Directory not found: {script_dir}"})

    config_file = script_path / "playwright.config.ts"
    if not config_file.exists():
        return json.dumps({"error": f"playwright.config.ts not found in {script_dir}"})

    # Build command as a string so shell=True resolves npx.cmd on Windows
    cmd = "npx playwright test"
    if test_file:
        cmd += f' "{test_file}"'
    if headed:
        cmd += " --headed"
    # Hard cap per-test timeout at 60s via CLI flag to prevent hangs during validation
    cmd += " --timeout 60000"

    env = os.environ.copy()
    env["HEADLESS"] = "false" if headed else "true"

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=240,   # hard wall-clock limit: 4 minutes max for entire suite
            shell=True,
            cwd=str(script_path),
            env=env,
        )
        output = proc.stdout + ("\n" + proc.stderr if proc.stderr else "")
        return json.dumps({
            "exit_code": proc.returncode,
            "headed": headed,
            "script_dir": str(script_path),
            "output": output.strip(),
        }, ensure_ascii=False)
    except subprocess.TimeoutExpired:
        return json.dumps({
            "error": "Test suite timed out after 240 seconds (wall-clock limit). "
                     "Check that the target URL is reachable and consider reducing test scope.",
            "script_dir": script_dir,
        })
    except Exception as e:
        return json.dumps({"error": f"Failed to run tests: {e}"})



def ensure_output_dir(mode: str, label: str = "") -> str:
    """
    Create a timestamped artifact directory tree for the current testing session.
    Also generates run.ps1 (Windows) and run.sh (Linux/macOS) helper scripts so
    users can replay tests in headed (visible) or headless mode without extra flags.

    Layout (since 2026-05): ``web-output/<kind>/<module-slug>/<YYYYMMDD_HHMMSS>/``
    so the same module's runs group under one folder; temp agent files stay in
    ``workspace/_temp/`` and ``workspace/_recon_scripts/`` (see workspace/.gitignore).

    Args:
        mode: One of "MODE_A_QA", "MODE_B_COMPONENT", "MODE_C_BASIC",
              or "MODE_C_ENHANCED".
        label: Module or project name (e.g. ``knowledge-portal-smart-search``);
               used as the middle path segment. Falls back to ``session`` if empty.

    Returns:
        The absolute path to the created root output directory.
    """
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_label = re.sub(r"[^\w\-]", "_", label)[:80] if label else "session"
    safe_label = safe_label.strip("_") or "session"

    if mode == "MODE_A_QA":
        root = output_root / "qa" / safe_label / ts
        for sub in ("screenshots", "traces", "videos", "storage"):
            (root / sub).mkdir(parents=True, exist_ok=True)
    elif mode == "MODE_B_COMPONENT":
        root = output_root / "tests" / safe_label / ts
        for sub in ("poms", "tests", "references"):
            (root / sub).mkdir(parents=True, exist_ok=True)
    elif mode in ("MODE_C_BASIC", "MODE_C_ENHANCED"):
        root = output_root / "scripts" / safe_label / ts
        for sub in ("poms", "tests", "screenshots"):
            (root / sub).mkdir(parents=True, exist_ok=True)
    else:
        raise ValueError(f"Unknown mode: {mode}")

    npm_pkg_name = re.sub(r"[^a-z0-9\-]", "-", safe_label.lower()).strip("-") or "playwright-tests"
    if not npm_pkg_name.startswith("pw-"):
        npm_pkg_name = f"pw-{npm_pkg_name}"[:214]

    # ── package.json — 让输出目录成为独立的可运行项目 ─────────────────────────
    pkg_json = textwrap.dedent(f"""\
        {{
          "name": "{npm_pkg_name}",
          "version": "1.0.0",
          "description": "Auto-generated Playwright E2E tests",
          "scripts": {{
            "test": "playwright test",
            "test:headed": "HEADLESS=false playwright test --headed",
            "test:report": "playwright show-report"
          }},
          "devDependencies": {{
            "@playwright/test": "^1.40.0",
            "@types/node": "^20.0.0",
            "dotenv": "^16.0.0"
          }}
        }}
    """)

    # ── tsconfig.json — TypeScript 编译配置 ────────────────────────────────────
    tsconfig_json = textwrap.dedent("""\
        {
          "compilerOptions": {
            "target": "ES2020",
            "module": "commonjs",
            "lib": ["ES2020"],
            "strict": true,
            "esModuleInterop": true,
            "resolveJsonModule": true,
            "outDir": "./dist",
            "rootDir": "."
          },
          "include": ["poms/**/*", "tests/**/*", "playwright.config.ts"],
          "exclude": ["node_modules", "dist", "test-results"]
        }
    """)

    # ── .env.example — 环境变量模板（凭据和 URL 不写死在代码中）──────────────
    env_example = textwrap.dedent("""\
        # 复制此文件为 .env 并填入真实值（.env 不应提交到版本控制）
        # Copy this file to .env and fill in real values (do NOT commit .env)

        # 目标应用的基础 URL
        BASE_URL=http://your-app-host/path

        # 测试账号凭据
        TEST_USERNAME=your_username
        TEST_PASSWORD=your_password

        # 浏览器模式：'false' = 有头（可见浏览器），不设置或 'true' = 无头
        # HEADLESS=false
    """)

    # ── .gitignore ──────────────────────────────────────────────────────────────
    gitignore = textwrap.dedent("""\
        node_modules/
        dist/
        test-results/
        playwright-report/
        .env
        storageState.json
        .auth/
        *.png
        *.mp4
        *.zip
    """)

    # ── README.md — 使用说明 ───────────────────────────────────────────────────
    readme = textwrap.dedent(f"""\
        # Playwright 自动化测试脚本

        由 Web 自动化测试代理自动生成。

        ## 快速开始

        ```bash
        # 1. 安装依赖
        npm install
        npx playwright install chromium

        # 2. 配置环境变量
        cp .env.example .env
        # 编辑 .env 填入真实的 BASE_URL、TEST_USERNAME、TEST_PASSWORD

        # 3. 运行测试（无头模式）
        npx playwright test

        # 4. 有头模式（可见浏览器，方便调试）
        # Windows PowerShell:
        .\\run.ps1 -Headed
        # Linux/macOS:
        bash run.sh --headed
        ```

        ## 鉴权（推荐，默认生成约定）

        需要登录的应用：**整次 `playwright test` 只 UI 登录一次**。

        - `tests/**/*.setup.ts`：执行登录并 `storageState` 写入项目根目录的 `storageState.json`（含敏感 cookie，已在 `.gitignore` 中忽略）。
        - `playwright.config.ts`：`setup` 工程先跑，主工程 `chromium` 依赖 `setup` 并 `use.storageState: './storageState.json'`。
        - 业务 `*.spec.ts` 的 `beforeEach`：只做「进入已登录后的业务页」（POM 轻量导航），**不要**每个用例再跑完整填表登录。

        ## 目录结构（`ensure_output_dir` 创建）

        ```
        web-output/
        ├── qa/<模块slug>/<YYYYMMDD_HHMMSS>/          # 模式 A
        ├── tests/<模块slug>/<YYYYMMDD_HHMMSS>/       # 模式 B
        └── scripts/<模块slug>/<YYYYMMDD_HHMMSS>/    # 模式 C（本 README 所在类型）
                ├── poms/                  # Page Object Model 类
                ├── tests/                 # *.spec.ts、*.setup.ts
                ├── screenshots/
                ├── playwright.config.ts
                ├── package.json
                ├── tsconfig.json
                ├── .env.example
                ├── run.ps1
                └── run.sh
        ```

        Workspace 根下的 `_temp/`、`_recon_scripts/` 仅放临时脚本，与上述 `web-output` 目录分开。

        ## 环境变量说明

        在 `.env` 文件中配置（或在 CI 中设置同名环境变量）：

        | 变量 | 说明 |
        |------|------|
        | `BASE_URL` | 目标应用地址，例如 `http://192.168.1.100:5000/app` |
        | `TEST_USERNAME` | 测试账号 |
        | `TEST_PASSWORD` | 测试密码 |
        | `HEADLESS` | 设为 `false` 启动可见浏览器 |

        ## 将脚本迁移到已有 Playwright 项目

        1. 将 `poms/` 和 `tests/` 复制到目标项目对应目录
        2. 确保目标项目已安装 `@playwright/test`
        3. 将环境变量添加到目标项目的 `.env` 文件
        4. 检查并更新 POM 中的 CSS 选择器（如应用版本升级后类名可能变化）
    """)

    # Generate Windows PowerShell runner script
    ps1_content = textwrap.dedent("""\
        # Playwright 测试运行脚本 (Windows PowerShell)
        # 用法:
        #   有头模式（可见浏览器）: .\\run.ps1 -Headed
        #   无头模式（默认/CI）:   .\\run.ps1
        #   指定测试文件:          .\\run.ps1 -Headed -TestFile "tests/xxx.spec.ts"

        param(
            [switch]$Headed,
            [string]$TestFile = ""
        )

        # 加载 .env 文件（如果存在）
        if (Test-Path ".env") {
            Get-Content ".env" | Where-Object { $_ -match "^[^#].*=.*" } | ForEach-Object {
                $parts = $_ -split "=", 2
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }

        $args_list = @("playwright", "test")
        if ($TestFile -ne "") { $args_list += $TestFile }
        if ($Headed) {
            $env:HEADLESS = "false"
            $args_list += "--headed"
            Write-Host "启动有头模式（可见浏览器）..." -ForegroundColor Green
        } else {
            $env:HEADLESS = "true"
            Write-Host "启动无头模式（后台运行）..." -ForegroundColor Cyan
        }

        npx @args_list
    """)

    # Generate Linux/macOS shell runner script
    sh_content = textwrap.dedent("""\
        #!/bin/bash
        # Playwright 测试运行脚本 (Linux / macOS)
        # 用法:
        #   有头模式（可见浏览器）: bash run.sh --headed
        #   无头模式（默认/CI）:   bash run.sh
        #   指定测试文件:          bash run.sh --headed tests/xxx.spec.ts

        # 加载 .env 文件（如果存在）
        if [ -f ".env" ]; then
          export $(grep -v '^#' .env | xargs)
        fi

        HEADED=false
        TEST_FILE=""

        for arg in "$@"; do
          case $arg in
            --headed) HEADED=true ;;
            *) TEST_FILE="$arg" ;;
          esac
        done

        if [ "$HEADED" = true ]; then
          export HEADLESS=false
          echo "启动有头模式（可见浏览器）..."
          npx playwright test $TEST_FILE --headed
        else
          export HEADLESS=true
          echo "启动无头模式（后台运行）..."
          npx playwright test $TEST_FILE
        fi
    """)

    (root / "run.ps1").write_text(ps1_content, encoding="utf-8")
    (root / "run.sh").write_text(sh_content, encoding="utf-8")

    # For modes that produce TypeScript deliverables, write project scaffolding files
    if mode in ("MODE_B_COMPONENT", "MODE_C_BASIC", "MODE_C_ENHANCED"):
        (root / "package.json").write_text(pkg_json, encoding="utf-8")
        (root / "tsconfig.json").write_text(tsconfig_json, encoding="utf-8")
        (root / ".env.example").write_text(env_example, encoding="utf-8")
        (root / ".gitignore").write_text(gitignore, encoding="utf-8")
        (root / "README.md").write_text(readme, encoding="utf-8")

    return str(root.resolve())


def _session_has_markers(session_dir: Path) -> bool:
    """Whether this directory looks like a session root (deliverables or QA dirs)."""
    return (
        (session_dir / "playwright.config.ts").exists()
        or (session_dir / "report.md").exists()
        or (session_dir / "poms").exists()
        or (session_dir / "tests").exists()
        or (session_dir / "screenshots").exists()
        or (session_dir / "references").exists()
    )


def _discover_session_dirs(mode_dir: Path) -> list[Path]:
    """
    Return session root paths. Supports:
    - Legacy flat: ``web-output/scripts/foo_20260514_120000/``
    - Nested: ``web-output/scripts/foo/20260514_120000/``
    """
    if not mode_dir.exists():
        return []
    found: list[Path] = []
    for tier1 in sorted(mode_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not tier1.is_dir():
            continue
        if _session_has_markers(tier1):
            found.append(tier1)
            continue
        for tier2 in sorted(tier1.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if tier2.is_dir() and _session_has_markers(tier2):
                found.append(tier2)
    return found


def list_sessions(mode_filter: str = "") -> str:
    """
    List all historical output directories under web-output/, sorted newest first.

    Args:
        mode_filter: Optional filter — one of "qa", "tests", "scripts".
                     When empty, all sessions are returned.

    Returns:
        JSON string with a list of session summaries, each containing:
          - path: absolute directory path
          - mode: qa | tests | scripts
          - label: directory name
          - created: ISO timestamp derived from directory name
          - deliverables: list of key files present (poms, tests, screenshots, config)
          - file_count: total number of files in the session
    """
    sessions: list[dict[str, Any]] = []

    scan_dirs: list[tuple[str, Path]] = []
    for mode_name in ("qa", "tests", "scripts"):
        if mode_filter and mode_filter != mode_name:
            continue
        mode_dir = output_root / mode_name
        for session_dir in _discover_session_dirs(mode_dir):
            scan_dirs.append((mode_name, session_dir))

    for mode_name, session_dir in scan_dirs:
        all_files = list(session_dir.rglob("*"))
        file_count = sum(1 for f in all_files if f.is_file())

        # Identify key deliverables
        deliverables: list[str] = []
        poms = list((session_dir / "poms").glob("*.ts")) if (session_dir / "poms").exists() else []
        tests = list((session_dir / "tests").glob("*.spec.ts")) if (session_dir / "tests").exists() else []
        screenshots = list((session_dir / "screenshots").glob("*.png")) if (session_dir / "screenshots").exists() else []

        if poms:
            deliverables.append(f"poms: {[p.name for p in poms]}")
        if tests:
            deliverables.append(f"tests: {[t.name for t in tests]}")
        if screenshots:
            deliverables.append(f"screenshots: {len(screenshots)} files")
        if (session_dir / "playwright.config.ts").exists():
            deliverables.append("playwright.config.ts")
        if (session_dir / "report.md").exists():
            deliverables.append("report.md")

        rel = session_dir.relative_to(output_root / mode_name).as_posix()

        # Parse timestamp from leaf folder name or legacy ``label_YYYYMMDD_HHMMSS``
        created = "unknown"
        m_leaf = re.match(r"^(\d{8}_\d{6})$", session_dir.name)
        if m_leaf:
            created = m_leaf.group(1)
        else:
            m_legacy = re.search(r"_(\d{8}_\d{6})$", session_dir.name)
            if m_legacy:
                created = m_legacy.group(1)

        sessions.append({
            "path": str(session_dir.resolve()),
            "mode": mode_name,
            "label": rel,
            "created": created,
            "deliverables": deliverables,
            "file_count": file_count,
        })

    # Sort newest first by created timestamp
    sessions.sort(key=lambda s: s["created"], reverse=True)

    return json.dumps({
        "total": len(sessions),
        "sessions": sessions,
    }, ensure_ascii=False, indent=2)


def cleanup_temp() -> str:
    """
    Delete all files inside the _temp/ workspace directory.

    This is a safety-net cleanup that removes any exploration scripts that the
    agent may have forgotten to delete after execution.

    Returns:
        JSON string with the count of deleted files and their names.
    """
    deleted: list[str] = []
    errors: list[str] = []

    if temp_dir.exists():
        for item in temp_dir.iterdir():
            try:
                if item.is_file():
                    item.unlink()
                    deleted.append(item.name)
                elif item.is_dir():
                    shutil.rmtree(item)
                    deleted.append(f"{item.name}/ (dir)")
            except OSError as e:
                errors.append(f"{item.name}: {e}")

    return json.dumps({
        "deleted_count": len(deleted),
        "deleted": deleted,
        "errors": errors,
    }, ensure_ascii=False)


# =============================================================================
# Backends
# =============================================================================

def create_backends() -> tuple[LocalShellBackend, FilesystemBackend, CompositeBackend]:
    """
    Factory function for backend instances.

    Returns:
        (shell_backend, file_backend, composite_backend)
    """
    shell = LocalShellBackend(
        root_dir=workspace_dir,
        virtual_mode=False,
        inherit_env=True,
        timeout=600,
    )

    file = FilesystemBackend(
        root_dir=workspace_dir,
        virtual_mode=True,
    )

    composite = CompositeBackend(
        default=shell,
        routes={"/": file},
    )

    return shell, file, composite


shell_backend, file_backend, composite_backend = create_backends()
