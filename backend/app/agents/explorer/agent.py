"""
Page Explorer Agent - Web 页面探测与功能识别

该智能体专门负责：
- 打开目标URL → 获取页面快照和截图
- 分析页面结构：识别导航菜单、按钮、表单、表格等功能元素
- 输出结构化的页面分析报告（功能点清单、可交互元素清单）
"""
# pragma: no cover

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator, Callable

from deepagents import create_deep_agent as create_agent
from deepagents.backends import FilesystemBackend, LocalShellBackend, CompositeBackend
from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langgraph.pregel import Pregel

from app.agents.tools.web.browser_tools import inspect_web_page
from app.config.settings import settings
from app.core.llms import get_default_text_model

# =============================================================================
# 配置
# =============================================================================

_explorer_root = Path(settings.web_cli_workspace_root).resolve()
_project_root = Path(__file__).resolve().parents[4]

fs_backend = FilesystemBackend(root_dir=_explorer_root, virtual_mode=True)
shell_backend = LocalShellBackend(
    root_dir=_explorer_root,
    inherit_env=True,
    timeout=120,
    virtual_mode=True,
)
composite_backend = CompositeBackend(
    default=shell_backend,
    routes={"/": fs_backend},
)

# =============================================================================
# 上下文定义
# =============================================================================


@dataclass
class ExplorerContext:
    """页面探测智能体运行时上下文"""
    project_identifier: str = ""
    target_url: str = ""
    current_user_id: str = "00000000-0000-0000-0000-000000000001"


# =============================================================================
# 中间件
# =============================================================================


class ExplorerContextMiddleware(AgentMiddleware):
    """将运行时参数注入系统提示词"""

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        ctx = request.runtime.context
        project_identifier = getattr(ctx, "project_identifier", "")
        target_url = getattr(ctx, "target_url", "")

        context_info = f"""

---
## 🎯 运行时上下文

- `project_identifier`: `{project_identifier}`
- `target_url`: `{target_url}`

**重要**：开始探测前必须先调用 inspect_web_page(target_url) 打开并分析目标页面。
---
"""
        if isinstance(request.system_message.content, list):
            request.system_message.content = request.system_message.content + [
                {"type": "text", "text": context_info}
            ]
        else:
            request.system_message.content = (
                str(request.system_message.content or "") + context_info
            )
        return await handler(request)


SYSTEM_PROMPT = """# Web 页面探测专家

你是一位经验丰富的 Web 页面探测分析专家。你的唯一职责是**打开目标页面、分析页面结构、输出结构化报告**。

## 🔧 可用工具

| 工具 | 用途 |
|------|------|
| `inspect_web_page(target_url)` | 打开页面，获取页面快照 + 截图 |
| `execute(command)` | 执行 shell 命令（用于 playwright-cli 浏览器操作） |

## 🔄 标准工作流程

### Step 1: 打开页面
```
# 首先使用 inspect_web_page 打开并获取页面快照
result = inspect_web_page(target_url="<target_url>")
# 返回: success, page_snapshot, screenshot_path
```

### Step 2: 深入探索
如果需要更多交互操作（登录、点击菜单、填写表单等），使用 execute 工具执行 playwright-cli 命令：
```bash
# 打开浏览器
execute(command="playwright-cli open --browser=chrome <target_url>")

# 获取页面快照
execute(command="playwright-cli snapshot")

# 截图
execute(command="playwright-cli screenshot --filename=page.png")

# 点击元素（使用 snapshot 返回的 ref）
execute(command="playwright-cli click e5")

# 填写输入框
execute(command="playwright-cli fill e3 'test@example.com'")

# 查看控制台
execute(command="playwright-cli console")

# 关闭浏览器
execute(command="playwright-cli close")
```

### Step 3: 输出分析报告

最后必须输出以下格式的 JSON 分析报告：

```json
{
  "page_title": "页面标题",
  "url": "目标URL",
  "overview": "页面整体描述",
  "features": [
    {
      "name": "功能名称",
      "type": "navigation|form|table|button|modal|search|other",
      "description": "功能描述",
      "selector_hint": "定位提示（CSS选择器/data-testid/text内容）",
      "interaction_type": "click|fill|select|hover|submit"
    }
  ],
  "navigation_structure": {
    "menus": ["菜单项列表"],
    "breadcrumbs": "面包屑路径"
  },
  "requires_login": true/false,
  "screenshot_path": "截图文件路径"
}
```

## ⚠️ 关键规则

1. **必须先打开页面**：第一步永远是 inspect_web_page(target_url)
2. **深入探索**：如果需要了解登录后的功能，使用 playwright-cli 进行交互操作
3. **记录定位器**：为每个功能元素记录稳定的定位器（CSS选择器、role+name、data-testid）
4. **结构化输出**：最终报告必须是上述 JSON 格式
5. **截图证据**：每个重要页面状态都应截图保存

## 🎯 工作记忆

- 打开页面 → 获取快照 → 分析结构 → 深入探索 → 输出报告
"""


@asynccontextmanager
async def make_agent() -> AsyncIterator[Pregel]:
    """创建页面探测智能体"""
    model = await get_default_text_model()
    context_middleware = ExplorerContextMiddleware()

    explorer_tools = [inspect_web_page]

    agent = create_agent(
        model=model,
        tools=explorer_tools,
        system_prompt=SYSTEM_PROMPT,
        middleware=[context_middleware],
        backend=composite_backend,
        context_schema=ExplorerContext,
    )

    yield agent


agent = make_agent
