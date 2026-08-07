"""
多文件上下文注入中间件 (FileContextMiddleware)

支持提取 PDF、图片、文本(txt/csv)、Excel 和 Word 文件的内容，
并将其统一注入到智能体的系统上下文中。
"""

from __future__ import annotations

import base64
import hashlib
import logging
import io
from typing import Any, Callable, Awaitable

from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langchain.agents.middleware.types import ResponseT
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.typing import ContextT

from app.processors.pdf import PDFProcessor, PDF_PROCESSOR_VERSION

logger = logging.getLogger(__name__)

_DOCUMENT_TEMPLATE = """\
以下是用户上传的参考文档，请在回答时充分参考其内容。

重要约束：
1. 只要本段 <document> 中出现了文件名，就表示后端已经收到用户上传的文件。
2. 用户上传的附件不会自动保存为 DeepAgents 工作区文件路径；不要尝试读取 `/文件名`、`./文件名` 或同名工作区文件。
3. 应直接基于 <document> 中已经注入的内容回答用户问题。
4. 即使文档正文解析失败，也不能回答"没有收到文件""没有上传文件"或"文件在系统中不存在"；应明确说明已收到的文件名、解析失败原因，并给出下一步建议。

<document>
__DOCUMENT_CONTENT__
</document>
"""


def _decode_base64(data: str) -> bytes:
    """将 base64 字符串解码为 bytes。"""
    if "," in data:
        data = data.split(",", 1)[1]
    return base64.b64decode(data)


def _extract_image_text(
    file_data: bytes,
    mime_type: str,
    enable_multimodal: bool = False,
    image_model=None,
) -> str:
    """使用多模态大模型解析图片（仅在 enable_multimodal=True 时调用豆包）"""
    if not enable_multimodal:
        return "[图片文件：请开启多模态解析开关以提取图片内容]"
    try:
        if not image_model:
            return "图片解析模型未初始化，无法处理图片"
        
        encoded_image = base64.b64encode(file_data).decode("utf-8")
        content = [
            {"type": "text", "text": "请详细描述并精确提取出图片中的所有文字信息以及关键细节。"},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{encoded_image}"
                }
            }
        ]
        msg = HumanMessage(content=content)
        response = image_model.invoke([msg])
        if hasattr(response, 'content'):
            return str(response.content)
        return str(response)
    except Exception as e:
        logger.warning(f"图片解析失败: {e}")
        return f"图片提取失败: {e}"


def _extract_text_file(file_data: bytes) -> str:
    """解析常规纯文本文件"""
    try:
        return file_data.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_data.decode("gbk")
        except UnicodeDecodeError:
            return file_data.decode("utf-8", errors="ignore")


def _extract_excel_text(file_data: bytes) -> str:
    """解析 Excel 文件"""
    try:
        import pandas as pd
        df_dict = pd.read_excel(io.BytesIO(file_data), sheet_name=None)
        res = []
        for sheet_name, df in df_dict.items():
            res.append(f"--- Sheet: {sheet_name} ---")
            res.append(df.to_string(index=False))
        return "\n".join(res)
    except Exception as e:
        logger.warning(f"Excel 解析失败: {e}")
        return f"Excel提取失败: {e}"
    
def _extract_csv_text(file_data: bytes) -> str:
    """解析 CSV 文件"""
    try:
        import pandas as pd
        df = pd.read_csv(io.BytesIO(file_data))
        return df.to_string(index=False)
    except Exception as e:
        logger.warning(f"CSV 解析失败: {e}")
        return f"CSV提取失败: {e}"


class FileContextMiddleware(AgentMiddleware):
    """
    多文件文档上下文注入中间件
    支持: PDF, Excel, 图片, Word, Text文本
    """

    def __init__(
            self,
            original_system_prompt: str | list | None = None,
            enable_cache: bool = True,
            max_content_length: int = 80_000,
            image_model=None,
    ):
        self._image_model = image_model
        self._pdf_processor = PDFProcessor(enable_cache=enable_cache, image_model=image_model)
        self._max_content_length = max_content_length
        self._original_system_content: str | list | None = original_system_prompt
        self._session_docs: dict[str, str] = {}
        self._session_files_hash: dict[str, str] = {}

    async def awrap_model_call(
            self,
            request: ModelRequest[ContextT],
            handler: Callable[[ModelRequest[ContextT]], Awaitable[ModelResponse[ResponseT]]],
    ) -> Any:
        if self._original_system_content is None and request.system_message is not None:
            self._original_system_content = request.system_message.content

        thread_id = self._get_thread_id()

        file_infos = self._extract_files_from_last_message(request)
        frontend_flag = self._get_enable_multimodal_flag(request)
        enable_multimodal = frontend_flag

        if file_infos:
            hash_builder = hashlib.md5()
            hash_builder.update(PDF_PROCESSOR_VERSION.encode("utf-8"))
            for file_data, _, _ in file_infos:
                hash_builder.update(file_data)
            combined_hash = hash_builder.hexdigest()

            if self._session_files_hash.get(thread_id) == combined_hash:
                logger.debug("[FileContextMiddleware] 会话 %s 文件未变化（hash=%s），跳过解析", thread_id, combined_hash)
            else:
                logger.info("[FileContextMiddleware] 检测到新文件: %d 个，多模态=%s 开关，PDF处理器版本=%s", len(file_infos), enable_multimodal, PDF_PROCESSOR_VERSION)

                all_text = []
                for file_data, file_name, mime_type in file_infos:
                    logger.info("[FileContextMiddleware] 解析文件: %s, 类型: %s", file_name, mime_type)
                    
                    filename_lower = file_name.lower()
                    text = ""
                    
                    if mime_type == "application/pdf" or filename_lower.endswith(".pdf"):
                        text = self._pdf_processor.extract_text(file_data, file_name, enable_multimodal=enable_multimodal)
                    elif mime_type.startswith("image/") or filename_lower.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                        text = _extract_image_text(
                            file_data,
                            mime_type,
                            enable_multimodal=enable_multimodal,
                            image_model=self._image_model,
                        )
                    elif mime_type in [
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    ] or filename_lower.endswith((".xls", ".xlsx")):
                        text = _extract_excel_text(file_data)
                    elif mime_type == "text/csv" or filename_lower.endswith(".csv"):
                        text = _extract_csv_text(file_data)
                    elif mime_type.startswith("text/") or filename_lower.endswith((".txt", ".md", ".json", ".log")):
                        text = _extract_text_file(file_data)
                    elif mime_type in [
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ] or filename_lower.endswith((".doc", ".docx")):
                        text = self._pdf_processor.extract_text(file_data, file_name, enable_multimodal=enable_multimodal)
                    else:
                        text = f"暂不支持的文件格式解析: {file_name}"
                        
                    if text:
                        all_text.append(f"--- 文件: {file_name} ---\n{text}")

                if all_text:
                    merged_text = "\n\n".join(all_text)
                    self._session_docs[thread_id] = merged_text
                    self._session_files_hash[thread_id] = combined_hash
                    logger.info(
                        "[FileContextMiddleware] 会话 %s 文档已更新，共 %d 个文件，长度: %d 字符",
                        thread_id, len(file_infos), len(merged_text),
                    )

        current_doc = self._session_docs.get(thread_id)
        if current_doc:
            current_system_msg = request.system_message
            request = request.override(
                system_message=self._build_system_message(current_doc, current_system_msg)
            )

        cleaned_messages = self._strip_images_from_messages(request.messages)
        request = request.override(messages=cleaned_messages)

        return await handler(request)

    def _get_thread_id(self) -> str:
        try:
            from langgraph.config import get_config
            config = get_config()
            tid = config.get("metadata", {}).get("thread_id") or config.get("configurable", {}).get("thread_id")
            if tid:
                return str(tid)
        except Exception:
            pass
        return "__default__"

    def _extract_files_from_last_message(self, request: ModelRequest) -> list[tuple[bytes, str, str]]:
        extracted_files = []
        if not request.messages:
            return extracted_files

        last_msg = request.messages[-1]
        if not isinstance(last_msg, HumanMessage):
            return extracted_files

        attachments = last_msg.additional_kwargs.get("attachments", [])
        if not isinstance(attachments, list):
            return extracted_files

        for att in attachments:
            if not isinstance(att, dict):
                continue

            data = att.get("data")
            if not data or not isinstance(data, str):
                continue

            try:
                file_bytes = _decode_base64(data)
                filename = att.get("metadata", {}).get("filename", f"file_{len(extracted_files)}")
                mime_type = att.get("mimeType", "").lower()
                extracted_files.append((file_bytes, filename, mime_type))
            except Exception as e:
                logger.warning("[FileContextMiddleware] 附件解码失败: %s", e)
                continue

        return extracted_files

    def _get_enable_multimodal_flag(self, request: ModelRequest) -> bool | None:
        for msg in reversed(request.messages):
            if not isinstance(msg, HumanMessage):
                continue
            value = msg.additional_kwargs.get("ENABLE_PDF_MULTIMODAL")
            if value is None:
                continue
            if isinstance(value, bool):
                return value
            return str(value).lower() == "true"
        return None

    def _build_system_message(self, doc_text: str, current_system_message: SystemMessage | None = None) -> SystemMessage:
        if len(doc_text) > self._max_content_length:
            doc_text = doc_text[: self._max_content_length] + "\n\n[文档内容已截断...]"

        doc_block_text = _DOCUMENT_TEMPLATE.replace("__DOCUMENT_CONTENT__", doc_text)

        if current_system_message is not None:
            base_content = current_system_message.content
        else:
            base_content = self._original_system_content

        if isinstance(base_content, str):
            new_content = base_content + "\n\n" + doc_block_text
        elif isinstance(base_content, list):
            new_content = list(base_content) + [{"type": "text", "text": doc_block_text}]
        else:
            new_content = doc_block_text

        return SystemMessage(content=new_content)

    def clear_session(self, thread_id: str) -> None:
        removed = self._session_docs.pop(thread_id, None)
        self._session_files_hash.pop(thread_id, None)
        if removed is not None:
            logger.info("[FileContextMiddleware] 会话 %s 的文档状态已清除", thread_id)

    def get_session_stats(self) -> dict:
        return {
            "active_sessions": len(self._session_docs),
            "session_ids": list(self._session_docs.keys()),
            "doc_lengths": {tid: len(text) for tid, text in self._session_docs.items()},
        }

    def _strip_images_from_messages(self, messages: list) -> list:
        cleaned = []
        for msg in messages:
            if isinstance(msg.content, list):
                new_content = []
                for block in msg.content:
                    if isinstance(block, dict) and block.get("type") in ("image", "image_url"):
                        continue
                    if hasattr(block, "type") and getattr(block, "type") in ("image", "image_url"):
                        continue
                    new_content.append(block)
                
                if len(new_content) == 1 and isinstance(new_content[0], dict) and new_content[0].get("type") == "text":
                    new_content = new_content[0].get("text")
                elif len(new_content) == 0:
                    new_content = ""
                
                msg_args = msg.model_dump() if hasattr(msg, "model_dump") else msg.dict()
                msg_args["content"] = new_content
                new_msg = msg.__class__(**msg_args)
                cleaned.append(new_msg)
            else:
                cleaned.append(msg)
        return cleaned
