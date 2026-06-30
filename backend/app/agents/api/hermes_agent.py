"""通用对话代理 — 供前端 chat_agent 使用。"""

import os

from deepagents import create_deep_agent as create_agent
from langchain.chat_models import init_chat_model
from langchain_openai import ChatOpenAI

SYSTEM_PROMPT = """# 智能测试助手

你是 AI 测试管理平台的对话助手，帮助用户解答测试相关疑问、梳理需求与使用说明。
回答应简洁、准确；不确定时明确说明，不要编造功能或接口。"""


def _create_llm():
    """优先使用 HERMES_* 自定义端点，否则回退到 DeepSeek。"""
    api_base = os.getenv("HERMES_API_BASE")
    api_key = os.getenv("HERMES_API_KEY")
    model = os.getenv("HERMES_MODEL", "hermes-agent")

    if api_base and api_key:
        return ChatOpenAI(
            api_key=api_key,
            base_url=api_base,
            model=model,
        )
    return init_chat_model("deepseek:deepseek-chat")


llm = _create_llm()

agent = create_agent(
    model=llm,
    tools=[],
    system_prompt=SYSTEM_PROMPT,
)
