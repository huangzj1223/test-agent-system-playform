"""测试用例Agent的工具定义。

此模块包含所有可用的工具定义，包括：
- 基础工具：导出测试用例到 Excel / Word / JSON
- 文档工具：从 PDF 文件路径提取文本
- RAG工具：通过 MCP 客户端获取的检索增强工具
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Annotated, Union, Optional

from langchain.tools import InjectedToolCallId
from langchain_core.messages import ToolMessage
from langchain_core.tools import BaseTool, tool
from langgraph.types import Command


from app.config.settings import settings
from app.agents.testcase.case_validator import validate_test_cases
from app.agents.testcase.excel_exporter import (
    append_test_cases_to_excel,
    count_cases_in_sheet,
    export_test_cases_to_excel,
    resolve_excel_output_path,
)
from app.agents.testcase.export_session import get_active_export_path, set_active_export_path
from app.middleware.phase_todo_sync import export_success_command
from app.agents.testcase.browser_snapshot import capture_page_snapshot_impl
from app.agents.testcase.local_search import search_local_testcases_impl
from app.agents.tools.testcase import (
    batch_create_test_cases_tool,
    create_test_case_tool,
    parse_document_from_url,
    update_test_case_tool,
)

# 单次工具调用建议导出的用例条数上限（避免参数过长导致导出失败，如约 19 条上限）
EXCEL_EXPORT_BATCH_MAX = 10

from app.agents.testcase.json_exporter import export_test_cases_to_json


# MCP服务器配置
MCP_SERVER_CONFIGS = {
    "rag-server": {
        "url": settings.rag_mcp_url,
        "transport": "sse",
    }
}

# 默认导出目录
EXPORTS_DIR = Path(__file__).resolve().parents[4] / "exports"


def _get_default_output_path(format_type: str, module_name: str = "") -> str:
    """
    生成默认导出文件路径。
    
    Args:
        format_type: 文件格式类型 ('excel', 'word', 'json')
        module_name: 模块名称（可选，用于文件名）
    
    Returns:
        默认文件路径字符串
    """
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if module_name:
        safe_module = "".join(c for c in module_name if c.isalnum() or c in ('_', '-', ' '))
        safe_module = safe_module.strip().replace(' ', '_')
        filename = f"{safe_module}_测试用例_{timestamp}"
    else:
        filename = f"测试用例_{timestamp}"
    
    extensions = {
        'excel': '.xlsx',
        'word': '.docx',
        'json': '.json'
    }
    
    ext = extensions.get(format_type, '.xlsx')
    return str(EXPORTS_DIR / f"{filename}{ext}")


def _normalize_tool_test_cases(test_cases: list | str) -> list:
    if isinstance(test_cases, str):
        try:
            parsed = json.loads(test_cases)
        except json.JSONDecodeError as exc:
            raise ValueError(f"test_cases is not valid JSON: {exc}") from exc
        test_cases = parsed.get("test_cases", parsed) if isinstance(parsed, dict) else parsed

    if not isinstance(test_cases, list):
        raise ValueError("test_cases must be a list or a JSON object containing test_cases.")

    if not test_cases:
        return []

    if not all(isinstance(item, dict) for item in test_cases):
        raise ValueError("each item in test_cases must be an object.")

    return test_cases


def _resolve_menu_sheet_name(sheet_name: str, module_name: str, test_cases: list) -> str:
    """解析 Excel 页签名：优先 sheet_name（左侧菜单名），其次 module_name / 用例所属模块。"""
    if sheet_name and str(sheet_name).strip():
        return str(sheet_name).strip()
    if module_name and str(module_name).strip():
        return str(module_name).strip()
    if test_cases:
        first = test_cases[0]
        for key in ("module", "所属模块", "功能模块", "模块"):
            value = first.get(key)
            if value and str(value).strip():
                return str(value).strip()
    return ""


def _export_error_message(content: str, tool_call_id: str) -> Command:
    return Command(
        update={
            "messages": [
                ToolMessage(
                    content=content,
                    tool_call_id=tool_call_id,
                    name="export_testcases_to_excel",
                    status="error",
                )
            ],
        }
    )


@tool
def export_testcases_to_excel(
    test_cases: list | str,
    output_path: str = None,
    sheet_name: str = "",
    module_name: str = "",
    append: bool = False,
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> str | Command:
    """
    将测试用例导出为 Excel；同一 Excel 文件内按**系统左侧菜单**分工作表（页签）。

    **页签规则（强制）**：
    - `sheet_name` = 左侧菜单名称，如「用户管理」「组织架构」
    - 同一菜单下所有用例（新增、编辑、删除、查询、校验、安全等）**必须写入同一页签**
    - 换菜单时仍用同一 `output_path`，`append=True`，`sheet_name` 改为新菜单名（自动新建页签）

    **导出流程**：
    - 全局第 1 次导出：`append=False`，记下 `output_path`
    - 同一菜单后续批次：`append=True`，`sheet_name` 不变
    - 新菜单首批：`append=True`，`sheet_name`=新菜单名

    单次 test_cases 不超过 10 条（工具硬上限，避免参数过长导致调用失败）。

    **分批与校验**：
    - 用例较多时必须拆成多批（每批 ≤10 条），不可一次传入全部用例
    - 导出前校验**仅针对本批**（含前置条件非空、步骤=预期）；某批失败只修正并重导该批，已成功 append 的批次保留
    - 第 1 批：append=False；第 2 批起：append=True，output_path 与 sheet_name 与第 1 批相同

    **重新导出（用户要求修正/重导时）**：
    - **禁止** execute 删除 exports/ 下任何文件；**禁止**用 gen_excel.py 等脚本绕过本工具
    - 仅修正有问题批次后再次调用本工具；字段须含 preconditions 或 前提与约束（非空）
    - 需要全新文件：append=False + **新** output_path（带时间戳），保留旧 xlsx
    - 不要用 append=False 覆盖无关的历史导出文件

    Args:
        test_cases: 测试用例列表（建议每批 5~10 条）
        output_path: Excel 路径；第 2 次起必须与首次相同
        sheet_name: **左侧菜单名**（页签名），如「用户管理」
        module_name: 仅用于生成文件名（可选，如项目/需求简称）；勿与 sheet_name 混淆
        append: True=向已有文件追加（可追加到已有页签或新建页签）

    Returns:
        导出路径及页签说明
    """
    if output_path is None and append:
        return _export_error_message(
            "追加模式必须提供 output_path（与首次导出路径相同）。", tool_call_id
        )
    test_cases = _normalize_tool_test_cases(test_cases)
    if not test_cases:
        return _export_error_message(
            "暂未生成测试用例，无法导出 Excel。请先完成测试用例生成后再点击导出。",
            tool_call_id,
        )
    menu_sheet = _resolve_menu_sheet_name(sheet_name, module_name, test_cases)
    if not menu_sheet:
        return _export_error_message(
            "必须指定 sheet_name（系统左侧菜单名，如「用户管理」「组织架构」），"
            "或在用例中填写所属模块字段。",
            tool_call_id,
        )
    if len(test_cases) > EXCEL_EXPORT_BATCH_MAX:
        return _export_error_message(
            f"单次导出最多 {EXCEL_EXPORT_BATCH_MAX} 条用例（当前 {len(test_cases)} 条）。"
            f"请拆成多批：同菜单 append=True 且 sheet_name 相同。",
            tool_call_id,
        )
    batch_count = len(test_cases)
    _, validation_error = validate_test_cases(test_cases, batch_size=batch_count)
    if validation_error:
        return _export_error_message(validation_error, tool_call_id)
    session_path = get_active_export_path()
    path_note = ""

    if append and session_path:
        session_resolved = Path(session_path).resolve()
        if output_path is None:
            output_path = session_path
            path_note = "（未传 output_path，已使用本会话首批路径）\n"
        else:
            candidate = resolve_excel_output_path(output_path, prefer_existing=True)
            if not candidate.exists() or candidate.resolve() != session_resolved:
                output_path = session_path
                path_note = (
                    "（传入路径与首批不一致或不存在，已回退到本会话首批路径）\n"
                )
    elif output_path is None:
        output_path = _get_default_output_path("excel", module_name or menu_sheet)

    resolved_path = resolve_excel_output_path(output_path, prefer_existing=append)
    if append and session_path and resolved_path.resolve() != Path(session_path).resolve():
        resolved_path = Path(session_path).resolve()
        path_note = path_note or "（已对齐到本会话首批路径）\n"
    auto_append_note = ""
    if not append and resolved_path.exists():
        append = True
        auto_append_note = (
            f"（检测到文件已存在，已自动改为追加模式，避免覆盖已有数据）\n"
        )

    if append:
        try:
            exported_path = append_test_cases_to_excel(test_cases, resolved_path, menu_sheet)
        except PermissionError as exc:
            return _export_error_message(str(exc), tool_call_id)
        except RuntimeError as exc:
            return _export_error_message(str(exc), tool_call_id)
        exported_path = set_active_export_path(exported_path)
        total = count_cases_in_sheet(exported_path, menu_sheet)
        body = (
            f"{path_note}{auto_append_note}"
            f"Excel 本批追加 {batch_count} 条到页签「{menu_sheet}」（该页签累计 {total} 条）。\n"
            f"**output_path（下批必用）**: {exported_path}\n"
            f"后续请 append=True、sheet_name=\"{menu_sheet}\"、每批 ≤{EXCEL_EXPORT_BATCH_MAX} 条。"
        )
        return export_success_command(body, tool_call_id)
    try:
        exported_path = export_test_cases_to_excel(test_cases, resolved_path, menu_sheet)
    except PermissionError as exc:
        return _export_error_message(str(exc), tool_call_id)
    exported_path = set_active_export_path(exported_path)
    body = (
        f"Excel 首批导出 {batch_count} 条到页签「{menu_sheet}」。\n"
        f"**output_path（下批必用）**: {exported_path}\n"
        f"后续请 append=True、sheet_name=\"{menu_sheet}\"、每批 ≤{EXCEL_EXPORT_BATCH_MAX} 条。"
    )
    return export_success_command(body, tool_call_id)


@tool
def export_testcases_to_docx(
    test_cases: list | str, 
    output_path: str = None,
    module_name: str = ""
) -> str:
    """
    将测试用例列表导出为 Word (.docx) 文件。
    
    当用户要求导出 Word / DOCX 格式的测试用例文档时调用。
    
    Args:
        test_cases: 测试用例列表
        output_path: 导出路径（可选，默认导出到 exports 目录）
        module_name: 模块名称（用于生成默认文件名）
    
    Returns:
        导出文件的绝对路径
    """
    if output_path is None:
        output_path = _get_default_output_path('word', module_name)
    test_cases = _normalize_tool_test_cases(test_cases)
    from app.agents.testcase.docx_exporter import export_test_cases_to_docx

    if not test_cases:
        return "暂未生成测试用例，无法导出 Word。请先完成测试用例生成后再点击导出。"
    exported_path = export_test_cases_to_docx(test_cases, output_path)
    return f"Word测试用例已导出: {exported_path}"


@tool
def export_testcases_to_json(
    test_cases: list | str, 
    output_path: str = None,
    module_name: str = "",
    project_name: str = "XINZHI-TEST"
) -> str:
    """
    将测试用例列表导出为 JSON 文件。
    
    当用户要求导出 JSON 格式、或需要将用例用于自动化测试时调用。
    
    Args:
        test_cases: 测试用例列表
        output_path: 导出路径（可选，默认导出到 exports 目录）
        module_name: 模块名称（用于生成默认文件名）
        project_name: 项目标识，默认 XINZHI-TEST
    
    Returns:
        导出文件的绝对路径
    """
    if output_path is None:
        output_path = _get_default_output_path('json', module_name)
    test_cases = _normalize_tool_test_cases(test_cases)
    if not test_cases:
        return "暂未生成测试用例，无法导出 JSON。请先完成测试用例生成后再点击导出。"
    exported_path = export_test_cases_to_json(test_cases, output_path, project_name)
    return f"JSON测试用例已导出: {exported_path}"


@tool
async def extract_pdf_text_from_file(file_path: str, enable_multimodal: bool = False) -> str:
    """
    从 PDF 文件路径中提取文本。

    当用户上传 PDF 后，或系统提示需要解析本地 PDF 文件时调用。

    Args:
        file_path: PDF 文件的绝对路径或相对路径。
        enable_multimodal: 是否启用多模态图片解析。

    Returns:
        提取的文本内容。
    """
    if not os.path.isfile(file_path):
        return f"PDF文件不存在: {file_path}"

    try:
        with open(file_path, "rb") as f:
            pdf_data = f.read()
    except OSError as e:
        return f"读取PDF文件失败: {str(e)}"

    filename = os.path.basename(file_path)
    from app.core.llms import get_default_image_model
    from app.processors.pdf import extract_pdf_text

    image_model = await get_default_image_model() if enable_multimodal else None

    return extract_pdf_text(
        pdf_data,
        filename=filename,
        enable_multimodal=enable_multimodal,
        image_model=image_model,
    )


def _cached_rag_tools() -> tuple[BaseTool, ...]:
    """缓存RAG工具列表，避免重复创建MCP客户端。"""
    from langchain_mcp_adapters.client import MultiServerMCPClient

    try:
        client = MultiServerMCPClient(MCP_SERVER_CONFIGS)
        try:
            asyncio.get_running_loop()
            return ()
        except RuntimeError:
            pass

        tools = asyncio.run(asyncio.wait_for(client.get_tools(), timeout=2.0))
        return tuple(tools)
    except asyncio.TimeoutError:
        return ()
    except Exception:
        return ()


def rag_mcp_tools() -> list[BaseTool]:
    """获取RAG MCP工具列表。"""
    try:
        return list(_cached_rag_tools())
    except Exception:
        return []

async def arag_mcp_tools() -> list[BaseTool]:
    """Load RAG MCP tools from async LangGraph execution paths."""
    from langchain_mcp_adapters.client import MultiServerMCPClient

    try:
        client = MultiServerMCPClient(MCP_SERVER_CONFIGS)
        tools = await asyncio.wait_for(client.get_tools(), timeout=2.0)
        return list(tools)
    except Exception:
        return []


def get_rag_tool_names() -> set[str]:
    """获取RAG工具的名称集合，用于识别和过滤。"""
    return {tool.name for tool in rag_mcp_tools()}


def get_tool_name(tool: Union[BaseTool, dict]) -> str:
    """获取工具名称，支持 BaseTool 对象和字典格式。"""
    if isinstance(tool, dict):
        return tool.get("name", "")
    return getattr(tool, "name", "")


RAG_SYSTEM_PROMPT_APPENDIX = """

---

## 附录：可用 RAG 工具列表

{rag_tools_description}

> 详细的 RAG 检索策略、mode 选择规范、结果引用规范等，请严格遵循 `rag-query` Skill 执行。

**P0 快速检索参数（默认即可，勿放大）**：`rag_query_data(query=..., mode="mix", top_k=25, chunk_top_k=3, enable_vlm_enhanced=false, max_total_tokens=8000)`；单功能/增量任务**最多调用 1 次**；首轮无 chunks 则停止，禁止第二、三轮。
"""


def format_rag_tools_description() -> str:
    """格式化RAG工具描述，用于系统提示词。"""
    tools = rag_mcp_tools()
    if not tools:
        return "（暂无RAG工具配置或 RAG MCP 服务未启动）"

    descriptions = []
    for tool_item in tools:
        desc = getattr(tool_item, "description", "无描述")
        descriptions.append(f"- **{tool_item.name}**: {desc}")
    return "\n".join(descriptions)


@tool
def search_local_testcases(
    module: str = "",
    action: str = "",
    limit: int = 5,
) -> str:
    """
    轻量检索本地历史测试用例摘要（不连接数据库时使用）。

    仅读取 workspace 内固定的 all_testcases.json 与 exploration/{模块}.json 元信息，
    禁止用此工具替代 grep/read_file 扫描整个 workspace。

    Args:
        module: 左侧菜单/模块名，如「用户管理」
        action: 操作名，如「编辑用户」「新增用户」
        limit: 返回条数上限（1~20，默认 5）

    Returns:
        JSON 字符串：命中摘要、文件路径、exploration 提示
    """
    result = search_local_testcases_impl(module=module, action=action, limit=limit)
    return json.dumps(result, ensure_ascii=False, indent=2)


@tool
def capture_page_snapshot(url: str, timeout_seconds: int = 25) -> str:
    """
    Phase 1 URL 探索专用：一次性打开页面、采集交互元素快照、关闭浏览器。

    内置硬超时（默认 25s），避免 execute + agent-browser open 长时间挂死。
    **禁止**在 Phase 1 用 execute 运行 agent-browser/playwright 替代本工具。

    Args:
        url: 要访问的 http(s) 地址
        timeout_seconds: 整条命令链超时秒数（10~45，默认 25）

    Returns:
        JSON：ok/snapshot/requires_login/message 或 error 原因。
        requires_login=true 时禁止再用 execute 登录，应使用用户提供的操作步骤继续 Phase 1。
    """
    result = capture_page_snapshot_impl(url=url, timeout_seconds=timeout_seconds)
    return json.dumps(result, ensure_ascii=False, indent=2)


@tool
def check_environment() -> str:
    """
    检查当前环境中是否有可用的浏览器自动化工具（用于 URL 探索）。

    验证 node.js、playwright、agent-browser 等工具的可用性。

    Returns:
        JSON 字符串，包含各工具的可用性状态
    """
    import subprocess
    import os

    results = {"platform": os.name, "tools": {}}

    # Check node.js
    try:
        proc = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
            shell=False,
        )
        results["tools"]["node"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
        }
    except Exception as e:
        results["tools"]["node"] = {"available": False, "error": str(e)}

    # Check playwright
    try:
        proc = subprocess.run(
            "npx playwright --version",
            capture_output=True,
            text=True,
            timeout=15,
            shell=True,
        )
        results["tools"]["playwright"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
        }
    except Exception as e:
        results["tools"]["playwright"] = {"available": False, "error": str(e)}

    # Check agent-browser
    try:
        proc = subprocess.run(
            "agent-browser --version",
            capture_output=True,
            text=True,
            timeout=10,
            shell=True,
        )
        results["tools"]["agent_browser"] = {
            "available": proc.returncode == 0,
            "version": proc.stdout.strip() if proc.returncode == 0 else None,
        }
    except Exception as e:
        results["tools"]["agent_browser"] = {"available": False, "error": str(e)}

    # 判断 URL 探索是否可用（需要 playwright 或 agent-browser）
    results["url_exploration_available"] = (
        results["tools"].get("playwright", {}).get("available", False) or
        results["tools"].get("agent_browser", {}).get("available", False)
    )

    return json.dumps(results, ensure_ascii=False, indent=2)


def get_base_tools() -> list:
    """获取基础工具列表（不包含RAG工具）。"""
    return [
        create_test_case_tool,
        update_test_case_tool,
        batch_create_test_cases_tool,
        parse_document_from_url,
        export_testcases_to_excel,
        export_testcases_to_docx,
        export_testcases_to_json,
        extract_pdf_text_from_file,
        search_local_testcases,
        capture_page_snapshot,
        check_environment,
    ]


def get_all_tools() -> list:
    """获取默认工具列表；RAG 工具由 RAGMiddleware 在启用时按需加载。"""
    return get_base_tools()
