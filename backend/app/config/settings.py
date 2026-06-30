"""
应用配置管理

使用 Pydantic Settings 管理应用配置，支持环境变量和 .env 文件
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# 指向项目根目录的 .env（与 start_server_postgres.py 共用）
_ROOT_ENV = Path(__file__).resolve().parent.parent.parent.parent / ".env"

class Settings(BaseSettings):
    """应用配置类"""

    model_config = SettingsConfigDict(
        env_file=str(_ROOT_ENV),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
# type: ignore  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2YmpVNGFBPT06ZTFmMjc4N2M=
    
    # 应用基础配置
    app_name: str = "测试管理系统"
    app_version: str = "1.0.0"
    app_port: int = 8001
    debug: bool = False
    api_prefix: str = "/api/v2"
    
    # PostgreSQL 数据库配置
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "ai_test_management"
    
    @property
    def postgres_url(self) -> str:
        """获取 PostgreSQL 连接 URL"""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    @property
    def postgres_sync_url(self) -> str:
        """获取 PostgreSQL 同步连接 URL（用于 Alembic）"""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    # MongoDB 配置
    mongodb_host: str = "82.157.253.242"
    mongodb_port: int = 27017
    mongodb_user: Optional[str] = "mongodb"
    mongodb_password: Optional[str] = "mongodb"
    mongodb_db: str = "ai_test_management"
    
    @property
    def mongodb_url(self) -> str:
        """获取 MongoDB 连接 URL"""
        if self.mongodb_user and self.mongodb_password:
            return (
                f"mongodb://{self.mongodb_user}:{self.mongodb_password}"
                f"@{self.mongodb_host}:{self.mongodb_port}"
            )
        return f"mongodb://{self.mongodb_host}:{self.mongodb_port}"
    
    # 速率限制配置
    rate_limit_requests: int = 300  # 每分钟最大请求数
    rate_limit_window: int = 60  # 时间窗口（秒）
    
    # 分页配置
    pagination_default_size: int = 30
    pagination_max_size: int = 300

    @property
    def default_page_size(self) -> int:
        """获取默认分页大小（别名）"""
        return self.pagination_default_size

    @property
    def max_page_size(self) -> int:
        """获取最大分页大小（别名）"""
        return self.pagination_max_size
    
    # CORS 配置
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]
# type: ignore  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2YmpVNGFBPT06ZTFmMjc4N2M=

    # JWT 配置（用于认证）
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # 默认测试用户配置（开发环境使用）
    default_user_id: str = "00000000-0000-0000-0000-000000000001"
    default_user_email: str = "admin@test.com"
    default_user_name: str = "管理员"

    # MinIO 对象存储配置
    minio_endpoint: str = "82.157.253.242:19001"
    minio_access_key: str = "minio"
    minio_secret_key: str = "tDmN7BEAbkEXLK2L"
    minio_bucket: str = "test-management"
    minio_secure: bool = False  # 是否使用 HTTPS
    minio_region: Optional[str] = None

    # 附件配置
    attachment_max_size: int = 50 * 1024 * 1024  # 50 MB
    attachment_allowed_types: list[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "application/zip", "application/x-rar-compressed",
        "text/plain", "text/csv",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
# type: ignore  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2YmpVNGFBPT06ZTFmMjc4N2M=

    # PDF 解析配置
    enable_pdf_multimodal: bool = False  # 是否启用 PDF 多模态图片解析（需要配置 DOUBAO_API_KEY）

    # 大模型配置
    # DeepSeek 文本模型（用于 ChatDeepSeek）
    llm_model: str = "deepseek-chat"
    deepseek_api_key: Optional[str] = None
    llm_api_base: str = "https://api.deepseek.com"
    # 思考模式开关：v4-pro 默认 enabled，非思考模式需显式 disabled
    llm_thinking_enabled: bool = False
    # 单次模型回复最大 token（DeepSeek-Chat 上限 8192）
    llm_max_tokens: int = 8192

    # 图片解析模型（OpenAI 兼容接口，用于 ChatOpenAI）
    image_parser_api_base: Optional[str] = None
    image_parser_api_key: Optional[str] = None
    image_parser_model: Optional[str] = None
    # PDF 多模态处理提示词
    image_parser_prompt: str = """你是一个专业的文档图像解析助手。请将图像内容完整转换为结构化文本：

## 任务要求
1. **文字提取**：完整提取所有可见文本，包括标题、正文、注释、页眉页脚
2. **结构还原**：保留原始层级关系（章节、列表、表格、代码块）
3. **视觉描述**：对图表、流程图、截图等补充必要的视觉说明
4. **语义标注**：标注关键信息（如字段名、按钮标签、错误提示等）

## 输出格式
- 使用标准 Markdown 格式
- 表格用 | 分隔，代码块标注语言类型
- 无需解释性文字，直接输出内容
- 开头和结尾不要添加 ```markdown 标记"""

    # 性能测试工作目录配置
    perf_workspace_root: str = "backend/app/agents/perf/workspace"
    perf_mcp_root: str = "backend/mcp/perf"
    perf_yaml_tests: str = "backend/app/agents/perf/yaml-tests"
    perf_skills_root: str = "backend/app/agents/perf/agent_skills"

    # 接口测试工作目录配置
    api_workspace_root: str
    # api_mcp_root: str = "backend/mcp/api"
    api_skills_root: str

    # Web 测试工作目录配置
    web_mcp_workspace_root: str
    web_mcp_root: str
    web_mcp_skills_root: str

    # Web CLI 测试工作目录配置
    web_cli_workspace_root: str = "backend/workspace/web_cli"
    web_cli_skills_root: str = ".agents/skills"

    # Web Chrome 测试工作目录配置
    web_chrome_workspace_root: str = "backend/workspace/web_chrome"
    web_chrome_mcp_root: str = "backend/mcp/web_chrome"
    web_chrome_skills_root: str = ".agents/skills"

    # 测试用例工作目录配置
    testcase_workspace_root: str = "backend/workspace/testcase"
    testcase_skills_root: str = ".agents/skills"

    # RAG / LightRAG configuration
    rag_base_url: str = "http://localhost:9621"
    rag_mcp_url: str = "http://localhost:8008/sse"
    rag_mcp_port: int = 8008
    rag_api_key: Optional[str] = None
    rag_username: Optional[str] = "admin"
    rag_password: Optional[str] = "admin123"
    rag_space_id: str = "cmp_space"
    rag_timeout: float = 120.0

    # 渗透测试工作目录配置
    security_workspace_root: str = "backend/workspace/security"
    security_skills_root: str = ".agents/skills"

@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()

# type: ignore  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2YmpVNGFBPT06ZTFmMjc4N2M=

settings = get_settings()

