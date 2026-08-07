# PDF 处理器
"""
PDF 文档处理器，支持文本提取和缓存
"""
from app.config.settings import settings


# uv pip install langchain-community langchain-pymupdf4llm

import tempfile
import os
import logging
import hashlib
import time
from typing import Optional

from langchain_pymupdf4llm import PyMuPDF4LLMLoader

try:
    from langchain_community.document_loaders.parsers import LLMImageBlobParser
except ImportError:
    LLMImageBlobParser = None

logger = logging.getLogger(__name__)

# Bump this when PDF/Word extraction behavior changes so middleware session caches are invalidated.
PDF_PROCESSOR_VERSION = "2026-04-26-1"

# PDF 内容缓存，避免重复解析同一个文件
_pdf_cache = {}


def _safe_delete_temp_file(file_path: str, max_retries: int = 3, delay: float = 0.1):
    """
    安全删除临时文件，处理Windows文件锁定问题

    Args:
        file_path: 要删除的文件路径
        max_retries: 最大重试次数
        delay: 重试间隔（秒）
    """
    if not os.path.exists(file_path):
        return

    for attempt in range(max_retries):
        try:
            os.unlink(file_path)
            logger.debug(f"临时文件已删除: {file_path}")
            return
        except PermissionError as e:
            if attempt < max_retries - 1:
                logger.debug(f"删除临时文件失败（尝试 {attempt + 1}/{max_retries}），等待后重试: {e}")
                time.sleep(delay)
            else:
                logger.warning(f"无法删除临时文件（已重试{max_retries}次），文件将由系统清理: {file_path}")
        except Exception as e:
            logger.warning(f"删除临时文件时发生异常: {e}")
            break


class PDFProcessor:
    """PDF 处理器类"""

    def __init__(self, enable_cache: bool = True, image_model=None):
        self.enable_cache = enable_cache
        self.cache = _pdf_cache if enable_cache else {}
        self.image_model = image_model

    def extract_text(
            self,
            pdf_data: bytes,
            filename: str = "unknown.pdf",
            enable_multimodal: bool | None = None,
    ) -> str:
        """从PDF字节数据中提取文本

        Args:
            pdf_data: PDF 原始字节。
            filename: 文件名（用于日志/缓存key）。
            enable_multimodal: 是否启用多模态解析。
                None  → 由 settings.ENABLE_PDF_MULTIMODAL 决定（默认行为）。
                True  → 强制使用豆包多模态模型解析图片。
                False → 强制只做文本提取（不调用视觉模型）。
        """
        return extract_pdf_text(
            pdf_data,
            filename,
            self.cache if self.enable_cache else None,
            enable_multimodal=enable_multimodal,
            image_model=self.image_model,
        )

    def clear_cache(self):
        """清空缓存"""
        if self.enable_cache:
            self.cache.clear()

    def get_cache_stats(self) -> dict:
        """获取缓存统计信息"""
        return {
            "cache_enabled": self.enable_cache,
            "cached_files": len(self.cache) if self.enable_cache else 0,
            "cache_keys": list(self.cache.keys()) if self.enable_cache else []
        }


def _pdf_has_images(pdf_data: bytes) -> bool:
    """检测PDF文件是否包含图片。
    
    Args:
        pdf_data: PDF 原始字节。
        
    Returns:
        True 如果PDF包含图片，否则 False。
    """
    import fitz  # PyMuPDF
    try:
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        for page_num in range(len(doc)):
            page = doc[page_num]
            images = page.get_images(full=True)
            if images:
                doc.close()
                return True
        doc.close()
        return False
    except Exception as e:
        logger.warning(f"检测PDF图片失败: {e}")
        return False


def extract_pdf_text(
        pdf_data: bytes,
        filename: str = "unknown.pdf",
        cache: Optional[dict] = None,
        enable_multimodal: Optional[bool] = None,
        image_model=None,
) -> str:
    """
    从PDF字节数据中提取文本，使用缓存避免重复解析

    Args:
        pdf_data: PDF 原始字节。
        filename: 文件名（用于日志/缓存key）。
        cache: 可选的缓存字典。
        enable_multimodal: 是否启用多模态解析。
            None  → 自动检测PDF是否包含图片，有图片则启用多模态。
            True  → 强制多模态（豆包视觉模型）。
            False → 强制纯文本提取。
    """
    if enable_multimodal is None:
        use_multimodal = _pdf_has_images(pdf_data)
        if use_multimodal:
            logger.info(f"自动检测到PDF包含图片，启用多模态解析: {filename}")
        else:
            logger.info(f"PDF未检测到图片，使用纯文本提取: {filename}")
    else:
        use_multimodal = enable_multimodal is True

    pdf_hash = hashlib.md5(pdf_data).hexdigest()
    cache_key = f"{filename}_{pdf_hash}"

    if cache is not None and cache_key in cache:
        logger.info(f"从缓存中获取内容: {filename}")
        return cache[cache_key]

    _, ext = os.path.splitext(filename)
    if not ext:
        ext = '.pdf'

    temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    try:
        temp_file.write(pdf_data)
        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_file_path = temp_file.name
    finally:
        temp_file.close()

    if ext.lower() in [".doc", ".docx"]:
        try:
            logger.info(f"使用 python-docx 解析Word文档: {filename}")
            import docx
            doc = docx.Document(temp_file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text for cell in row.cells]
                    full_text.append(" | ".join(row_data))
            text_content = "\n".join(full_text)

            if not text_content.strip():
                text_content = "Word文件解析后文本为空"
            else:
                logger.info(f"Word 解析成功，内容长度: {len(text_content)} 字符")

            if cache is not None:
                cache[cache_key] = text_content
                logger.info(f"内容已缓存: {filename}")

            return text_content
        except Exception as e:
            logger.warning(f"Word 解析失败: {e}")
            if ext.lower() == ".doc":
                text_content = f"不支持老旧的 .doc 格式或解析失败，请在本地转存为 .docx 格式后再上传重试。（错误信息: {str(e)}）"
            else:
                text_content = f"Word文件处理出错: {str(e)}"

            if cache is not None:
                cache[cache_key] = text_content
            return text_content
        finally:
            _safe_delete_temp_file(temp_file_path)

    try:
        logger.info(f"使用 多模态解析器 解析文件: {filename}，多模态={use_multimodal}")
        if use_multimodal and LLMImageBlobParser is None:
            logger.warning(
                "langchain-community is not installed; falling back to text-only PDF parsing: %s",
                filename,
            )
            use_multimodal = False

        if use_multimodal:
            if image_model is None:
                logger.warning("多模态模型未配置，回退为纯文本解析: %s", filename)
                use_multimodal = False

        if use_multimodal:
            image_parser = LLMImageBlobParser(
                model=image_model,
                prompt=settings.image_parser_prompt
            )

            loader = PyMuPDF4LLMLoader(
                temp_file_path,
                mode="single",
                extract_images=True,
                images_parser=image_parser,
                table_strategy="lines"
            )
        else:
            loader = PyMuPDF4LLMLoader(
                temp_file_path,
                mode="single",
                table_strategy="lines"
            )
        documents = loader.load()

        if documents:
            text_content = documents[0].page_content
            logger.info(f"PyMuPDF4LLM 解析成功，内容长度: {len(text_content)} 字符")
        else:
            text_content = "PDF文件解析后内容为空"

        if cache is not None:
            cache[cache_key] = text_content
            logger.info(f"PDF内容已缓存: {filename}")

        return text_content
    except Exception as e:
        logger.warning(f"PyMuPDF4LLM 解析失败: {e}")

        if use_multimodal:
            logger.warning("PDF 多模态解析失败，降级为纯文本解析: %s", filename)
            try:
                fallback_loader = PyMuPDF4LLMLoader(
                    temp_file_path,
                    mode="single",
                    table_strategy="lines"
                )
                fallback_documents = fallback_loader.load()
                if fallback_documents:
                    text_content = fallback_documents[0].page_content
                    if text_content.strip():
                        text_content += (
                            "\n\n[提示：PDF 内图片的多模态解析失败，已降级为纯文本解析；"
                            "如需识别图片内容，请检查图片解析模型账号余额或关闭/重新配置多模态解析。]"
                        )
                    else:
                        text_content = "PDF文件纯文本解析后内容为空；图片多模态解析失败，请检查图片解析模型账号余额或关闭/重新配置多模态解析。"
                else:
                    text_content = "PDF文件纯文本解析后内容为空；图片多模态解析失败，请检查图片解析模型账号余额或关闭/重新配置多模态解析。"

                if cache is not None:
                    cache[cache_key] = text_content
                    logger.info(f"PDF降级解析内容已缓存: {filename}")
                return text_content
            except Exception as fallback_error:
                logger.error("PDF 纯文本降级解析也失败: %s", fallback_error)
                return f"PDF文件处理出错: 多模态解析失败（{str(e)}），纯文本降级解析也失败（{str(fallback_error)}）"

        logger.error(f"PDF文本提取失败: {e}")
        return f"PDF文件处理出错: {str(e)}"
    finally:
        _safe_delete_temp_file(temp_file_path)
