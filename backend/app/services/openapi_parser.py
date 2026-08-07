"""
OpenAPI Schema parser service.
"""

import json
import re
from typing import Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import yaml

from app.models.api_endpoint import APIEndpoint
from app.models.attachment import Attachment
from app.models.folder import Folder
from app.models.project import Project
from app.models.folder_type import FolderType


HTTP_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE"}
METHOD_LABELS = ["method", "httpmethod", "http method", "\u8bf7\u6c42\u65b9\u5f0f", "\u65b9\u6cd5", "http\u65b9\u6cd5"]
PATH_LABELS = ["path", "url", "uri", "api", "endpoint", "address", "\u8bf7\u6c42\u8def\u5f84", "\u63a5\u53e3\u5730\u5740", "\u8bf7\u6c42\u5730\u5740", "\u63a5\u53e3\u8def\u5f84", "\u8def\u5f84", "\u5730\u5740"]
SUMMARY_LABELS = ["summary", "name", "title", "description", "\u63a5\u53e3\u540d\u79f0", "\u63a5\u53e3\u8bf4\u660e", "\u529f\u80fd", "\u8bf4\u660e", "\u63cf\u8ff0"]


def parse_openapi_document_content(content: Any) -> dict[str, Any]:
    """Parse API docs from OpenAPI JSON/YAML or common Markdown formats."""
    if isinstance(content, dict):
        return content

    if not isinstance(content, str):
        raise ValueError("Content must be a JSON/YAML object or Markdown text")

    text = content.strip()
    if not text:
        raise ValueError("File content is empty")

    candidates: list[str] = []
    fenced_blocks = re.findall(r"```(?:json|yaml|yml|openapi|swagger)?\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    candidates.extend(block.strip() for block in fenced_blocks if block.strip())
    candidates.append(text)

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except Exception:
            parsed = None
        if _looks_like_openapi(parsed):
            return parsed

        try:
            parsed = yaml.safe_load(candidate)
        except Exception:
            parsed = None
        if _looks_like_openapi(parsed):
            return parsed

    markdown_spec = _parse_markdown_api_document(text)
    if markdown_spec:
        return markdown_spec

    raise ValueError("No valid API definition found. Markdown must contain HTTP method and path, such as POST /api/login, or fields like method/path.")


def _looks_like_openapi(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    return "paths" in value and ("openapi" in value or "swagger" in value or "info" in value)


def _parse_markdown_api_document(text: str) -> dict[str, Any] | None:
    endpoints: list[dict[str, Any]] = []
    endpoints.extend(_parse_markdown_tables(text))
    endpoints.extend(_parse_markdown_sections(text))

    paths: dict[str, Any] = {}
    seen: set[tuple[str, str]] = set()
    for endpoint in endpoints:
        method = str(endpoint.get("method", "")).upper()
        path = _normalize_api_path(str(endpoint.get("path", "")))
        if method not in HTTP_METHODS or not path:
            continue
        key = (method, path)
        if key in seen:
            continue
        seen.add(key)

        summary = endpoint.get("summary") or f"{method} {path}"
        tag = endpoint.get("tag") or _tag_from_path(path)
        paths.setdefault(path, {})[method.lower()] = {
            "summary": summary,
            "description": endpoint.get("description") or "Parsed from Markdown API document",
            "tags": [tag],
            "parameters": [],
            "responses": {"200": {"description": "OK"}},
        }

    if not paths:
        return None

    return {
        "openapi": "3.0.0",
        "info": {
            "title": _extract_markdown_title(text) or "Markdown API",
            "version": "1.0.0",
            "description": "Converted from Markdown API document",
        },
        "paths": paths,
    }


def _parse_markdown_tables(text: str) -> list[dict[str, Any]]:
    endpoints: list[dict[str, Any]] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines) - 1:
        header = lines[i].strip()
        separator = lines[i + 1].strip()
        if not (header.startswith("|") and separator.startswith("|") and re.search(r"\|\s*:?-{3,}:?\s*\|", separator + "|")):
            i += 1
            continue

        headers = [_normalize_header(cell) for cell in _split_md_row(header)]
        method_idx = _find_header_index(headers, METHOD_LABELS)
        path_idx = _find_header_index(headers, PATH_LABELS)
        summary_idx = _find_header_index(headers, SUMMARY_LABELS)
        if path_idx is None:
            i += 1
            continue

        i += 2
        while i < len(lines) and lines[i].strip().startswith("|"):
            cells = _split_md_row(lines[i])
            method = (_cell_at(cells, method_idx) if method_idx is not None else "GET").upper()
            path = _cell_at(cells, path_idx)
            summary = _cell_at(cells, summary_idx) if summary_idx is not None else ""
            endpoints.append({"method": method, "path": path, "summary": summary})
            i += 1
        continue
    return endpoints


def _parse_markdown_sections(text: str) -> list[dict[str, Any]]:
    endpoints: list[dict[str, Any]] = []
    current_heading = ""
    pending: dict[str, str] = {}

    def flush() -> None:
        nonlocal pending
        if pending.get("path"):
            endpoints.append({
                "method": pending.get("method", "GET"),
                "path": pending["path"],
                "summary": pending.get("summary") or current_heading,
                "tag": pending.get("tag"),
            })
        pending = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading_match:
            flush()
            current_heading = _clean_markdown_text(heading_match.group(2))
            heading_endpoint = _extract_method_path(current_heading)
            if heading_endpoint:
                endpoints.append({
                    "method": heading_endpoint[0],
                    "path": heading_endpoint[1],
                    "summary": _remove_method_path(current_heading),
                    "tag": current_heading.split()[0] if current_heading else "API",
                })
            continue

        method_path = _extract_method_path(line)
        if method_path:
            endpoints.append({
                "method": method_path[0],
                "path": method_path[1],
                "summary": _remove_method_path(_clean_markdown_text(line)) or current_heading,
            })
            continue

        method_value = _extract_field(line, METHOD_LABELS)
        if method_value:
            method_path_value = _extract_method_path(method_value)
            if method_path_value:
                pending["method"], pending["path"] = method_path_value
            else:
                pending["method"] = method_value.upper()
            pending.setdefault("summary", current_heading)

        path_value = _extract_field(line, PATH_LABELS)
        if path_value:
            path_method_value = _extract_method_path(path_value)
            if path_method_value:
                pending["method"], pending["path"] = path_method_value
            else:
                pending["path"] = path_value
            pending.setdefault("summary", current_heading)

        summary_value = _extract_field(line, SUMMARY_LABELS)
        if summary_value:
            pending["summary"] = summary_value

        if pending.get("method") and pending.get("path"):
            flush()

    flush()
    return endpoints


def _extract_method_path(text: str) -> tuple[str, str] | None:
    match = re.search(r"\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE)\b\s*[:\uFF1A-]?\s*`?((?:https?://[^\s`|)]+)|(?:/[^\s`|)]+))", text, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper(), match.group(2)
    reverse_match = re.search(r"`?((?:https?://[^\s`|)]+)|(?:/[^\s`|)]+))`?\s*[:\uFF1A-]?\s*\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE)\b", text, flags=re.IGNORECASE)
    if reverse_match:
        return reverse_match.group(2).upper(), reverse_match.group(1)
    return None

def _extract_field(line: str, labels: list[str]) -> str | None:
    cleaned = _clean_markdown_text(line)
    normalized = _normalize_header(cleaned)
    for label in labels:
        normalized_label = _normalize_header(label)
        if normalized.startswith(normalized_label + ":") or normalized.startswith(normalized_label + "\uFF1A"):
            return re.split(r"[:\uFF1A]", cleaned, maxsplit=1)[-1].strip()
    return None

def _normalize_api_path(value: str) -> str:
    value = _clean_markdown_text(value).strip()
    value = re.sub(r"\s+.*$", "", value)
    if value.startswith(("http://", "https://")):
        match = re.match(r"https?://[^/]+(/[^?#\s]*)", value)
        value = match.group(1) if match else ""
    if value and not value.startswith("/"):
        value = "/" + value
    return value


def _extract_markdown_title(text: str) -> str | None:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+)$", line.strip())
        if match:
            return _clean_markdown_text(match.group(1))
    return None


def _tag_from_path(path: str) -> str:
    parts = [part for part in path.strip("/").split("/") if part and not part.startswith("{")]
    return parts[0] if parts else "API"


def _split_md_row(row: str) -> list[str]:
    return [_clean_markdown_text(cell) for cell in row.strip().strip("|").split("|")]


def _normalize_header(header: str) -> str:
    return re.sub(r"\s+", "", header.strip().lower())


def _find_header_index(headers: list[str], names: list[str]) -> int | None:
    normalized_names = [_normalize_header(name) for name in names]
    for index, header in enumerate(headers):
        if any(name in header for name in normalized_names):
            return index
    return None


def _cell_at(cells: list[str], index: int | None) -> str:
    if index is None or index >= len(cells):
        return ""
    return cells[index]


def _clean_markdown_text(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^[-*]\s+", "", value)
    value = value.replace("**", "").replace("__", "").replace("`", "")
    return value.strip()


def _remove_method_path(value: str) -> str:
    return re.sub(r"\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|TRACE)\b\s*[:\uFF1A-]?\s*(?:https?://[^\s`|)]+|/[^\s`|)]+)", "", value, flags=re.IGNORECASE).strip(" -:\uFF1A")

class OpenAPIParser:
    """OpenAPI Schema 解析器"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def parse_and_create_structure(
        self,
        project_id: UUID,
        parent_folder_id: UUID | None,
        schema_file_id: UUID,
        openapi_spec: dict[str, Any],
        user_id: UUID
    ) -> dict[str, Any]:
        """
        解析 OpenAPI Spec 并创建文件夹结构

        Args:
            project_id: 项目 ID
            parent_folder_id: 父文件夹 ID（如果为空，则在项目根目录创建）
            schema_file_id: Schema 文件 ID
            openapi_spec: OpenAPI 规范字典
            user_id: 当前用户 ID

        Returns:
            包含创建的文件夹和端点信息的字典
        """
        # 提取基本信息
        info = openapi_spec.get("info", {})
        title = info.get("title", "API")
        version = info.get("version", "1.0.0")

        # 提取所有路径
        paths = openapi_spec.get("paths", {})

        # 按标签分组端点
        endpoints_by_tag = self._group_endpoints_by_tag(paths)
# fmt: off  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2VWtkaVF3PT06YzA2ZGZjOTM=

        # 创建文件夹结构
        result = {
            "schema_title": title,
            "schema_version": version,
            "total_endpoints": sum(len(endpoints) for endpoints in endpoints_by_tag.values()),
            "total_tags": len(endpoints_by_tag),
            "tag_folders": [],
            "endpoints": [],
            "summary": {}  # 新增：汇总信息
        }

        # 为每个标签组创建文件夹
        for tag_name, endpoints in sorted(endpoints_by_tag.items()):
            # 创建标签文件夹（如 "Activities"）
            tag_folder = await self._create_tag_folder(
                project_id=project_id,
                parent_folder_id=parent_folder_id,
                tag_name=tag_name,
                schema_file_id=schema_file_id,
                user_id=user_id
            )
            result["tag_folders"].append({
                "folder_id": str(tag_folder.id),
                "folder_name": tag_name,
                "endpoint_count": len(endpoints)
            })

            # 为每个端点创建子文件夹（如 "GET /api/v1/Activities"）
            for endpoint_data in endpoints:
                endpoint = await self._create_endpoint_folder(
                    project_id=project_id,
                    parent_folder_id=tag_folder.id,
                    endpoint_data=endpoint_data,
                    schema_file_id=schema_file_id,
                    tag_name=tag_name
                )
                result["endpoints"].append({
                    "endpoint_id": str(endpoint.id),
                    "display_name": endpoint.display_name,
                    "folder_name": endpoint.custom_config.get("folder_name", ""),
                    "method": endpoint.method,
                    "path": endpoint.path,
                    "summary": endpoint.summary,
                    "folder_id": str(endpoint.folder_id),
                    "tag_group": tag_name
                })

        # 添加汇总信息
        result["summary"] = {
            "message": f"成功解析 OpenAPI 文档：{title} v{version}",
            "folders_created": len(result["tag_folders"]),
            "endpoints_created": result["total_endpoints"],
            "structure": "已创建按标签分组的文件夹结构，可以在左侧查看"
        }
# noqa  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2VWtkaVF3PT06YzA2ZGZjOTM=

        return result

    def _group_endpoints_by_tag(self, paths: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        """
        按标签分组端点

        Args:
            paths: OpenAPI paths 对象

        Returns:
            {tag_name: [endpoint_data, ...]}
        """
        endpoints_by_tag: dict[str, list[dict[str, Any]]] = {}

        for path, path_item in paths.items():
            # 遍历该路径的所有 HTTP 方法
            for method, method_spec in path_item.items():
                if method.lower() not in ["get", "post", "put", "delete", "patch", "options", "head", "trace"]:
                    continue

                # 提取标签（如果没有标签，则使用 "Other"）
                tags = method_spec.get("tags", ["Other"])
                primary_tag = tags[0] if tags else "Other"

                # 构建端点数据
                endpoint_data = {
                    "path": path,
                    "method": method.upper(),
                    "summary": method_spec.get("summary"),
                    "description": method_spec.get("description"),
                    "parameters": method_spec.get("parameters", []),
                    "request_body": method_spec.get("requestBody"),
                    "responses": method_spec.get("responses", {}),
                    "security": method_spec.get("security"),
                    "tags": tags,
                    "deprecated": method_spec.get("deprecated", False),
                    "operation_id": method_spec.get("operationId")
                }

                # 添加到分组
                if primary_tag not in endpoints_by_tag:
                    endpoints_by_tag[primary_tag] = []
                endpoints_by_tag[primary_tag].append(endpoint_data)

        return endpoints_by_tag

    async def _create_tag_folder(
        self,
        project_id: UUID,
        parent_folder_id: UUID | None,
        tag_name: str,
        schema_file_id: UUID,
        user_id: UUID
    ) -> Folder:
        """
        创建标签文件夹（如 "Activities"）

        Args:
            project_id: 项目 ID
            parent_folder_id: 父文件夹 ID
            tag_name: 标签名称
            schema_file_id: Schema 文件 ID
            user_id: 用户 ID

        Returns:
            创建的文件夹对象
        """
        # 检查是否已存在同名文件夹
        # 这里简化处理，实际应该查询数据库

        folder = Folder(
            project_id=project_id,
            parent_id=parent_folder_id,
            name=tag_name,
            description=f"API endpoints for {tag_name}",
            folder_type=FolderType.API_TEST
        )
# fmt: off  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2VWtkaVF3PT06YzA2ZGZjOTM=

        self.db.add(folder)
        await self.db.flush()

        return folder

    async def _create_endpoint_folder(
        self,
        project_id: UUID,
        parent_folder_id: UUID,
        endpoint_data: dict[str, Any],
        schema_file_id: UUID,
        tag_name: str
    ) -> APIEndpoint:
        """
        创建端点定义和对应的文件夹

        Args:
            project_id: 项目 ID
            parent_folder_id: 父文件夹 ID（标签文件夹）
            endpoint_data: 端点数据
            schema_file_id: Schema 文件 ID
            tag_name: 标签名称

        Returns:
            创建的端点对象
        """
        path = endpoint_data["path"]
        method = endpoint_data["method"]

        # 提取路径的最后一部分作为资源名称
        # 例如：/api/v1/Activities -> Activities
        #       /api/v1/Users/{id} -> Users
        path_parts = path.strip("/").split("/")
        resource_name = path_parts[-1].replace("{", "").replace("}", "") if path_parts else "Unknown"

        # 创建显示名称（保持原样：GET /api/v1/Activities）
        display_name = f"{method} {path}"

        # 创建文件夹名称（简化：GET-Activities）
        folder_name = f"{method}-{resource_name}"

        # 创建文件夹（如 "GET-Activities"）
        endpoint_folder = Folder(
            project_id=project_id,
            parent_id=parent_folder_id,
            name=folder_name,
            description=endpoint_data.get("summary") or endpoint_data.get("description", ""),
            folder_type=FolderType.API_TEST
        )
        self.db.add(endpoint_folder)
        await self.db.flush()

        # 创建端点定义
        endpoint = APIEndpoint(
            project_id=project_id,
            folder_id=endpoint_folder.id,
            display_name=display_name,
            path=path,
            method=method,
            summary=endpoint_data.get("summary"),
            description=endpoint_data.get("description"),
            schema_file_id=schema_file_id,
            parameters=endpoint_data.get("parameters"),
            request_body=endpoint_data.get("request_body"),
            responses=endpoint_data.get("responses"),
            security=endpoint_data.get("security"),
            tags=endpoint_data.get("tags"),
            tag_group=tag_name,
            custom_config={
                "deprecated": endpoint_data.get("deprecated", False),
                "operation_id": endpoint_data.get("operation_id"),
                "resource_name": resource_name,
                "folder_name": folder_name
            },
            sort_order=self._get_method_sort_order(method)
        )
        self.db.add(endpoint)
        await self.db.flush()

        return endpoint

    def _get_method_sort_order(self, method: str) -> int:
        """
        获取 HTTP 方法的排序顺序

        顺序：GET -> POST -> PUT -> PATCH -> DELETE -> 其他
        """
        order = {
            "GET": 0,
            "POST": 1,
            "PUT": 2,
            "PATCH": 3,
            "DELETE": 4
        }
        return order.get(method.upper(), 99)

async def parse_openapi_from_attachment(
    db: AsyncSession,
    attachment: Attachment
) -> dict[str, Any]:
    """
    从附件对象解析 OpenAPI Spec

    Args:
        db: 数据库会话
        attachment: 附件对象

    Returns:
        OpenAPI 规范字典
    """
    # 从 MinIO 或本地存储读取文件内容
    # 这里简化处理，假设已经有文件内容
    # 实际实现需要从 MinIO 读取

    # 临时方案：假设文件内容在 attachment.file_path
    import aiofiles
    async with aiofiles.open(attachment.file_path, "r", encoding="utf-8") as f:
        content = await f.read()
# noqa  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2VWtkaVF3PT06YzA2ZGZjOTM=

    return json.loads(content)
