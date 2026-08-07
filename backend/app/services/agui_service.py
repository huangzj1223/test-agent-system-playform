"""AG-UI compatible event stream service."""

import asyncio
import inspect
import json
from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

from app.services.agent_execution_service import (
    AgentExecutionError,
    resolve_bridge_agent,
    sanitize_agent_context,
)


class AgUiService:
    """Generate AG-UI SSE events and persist the conversation."""

    def __init__(
        self,
        conversation_service,
        memory_service=None,
        tool_service=None,
        skill_service=None,
        model_chat_service=None,
        agent_execution_service=None,
        agent_run_service=None,
        agent_progress_interval: float = 15.0,
    ):
        self.conversation_service = conversation_service
        self.memory_service = memory_service
        self.tool_service = tool_service
        self.skill_service = skill_service
        self.model_chat_service = model_chat_service
        self.agent_execution_service = agent_execution_service
        self.agent_run_service = agent_run_service
        self.agent_progress_interval = agent_progress_interval

    async def _maybe_await(self, value):
        if inspect.isawaitable(value):
            return await value
        return value

    @staticmethod
    def _sse(event: dict) -> str:
        return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    async def run_events(
        self,
        user_id: UUID,
        conversation_id: UUID | None,
        messages: list[dict],
        tools: list[dict] | None = None,
        provider_id: UUID | None = None,
        model_id: str | None = None,
        forwarded_props: dict | None = None,
    ) -> AsyncGenerator[str, None]:
        user_message = next((item for item in reversed(messages) if item.get("role") == "user"), None)
        prompt = (user_message or {}).get("content", "")
        title = prompt[:40] or "新会话"
        actual_conversation_id = await self._maybe_await(
            self.conversation_service.ensure_conversation(
                user_id=user_id,
                conversation_id=conversation_id,
                title=title,
            )
        )

        run_id = str(uuid4())
        yield self._sse({"type": "RUN_STARTED", "runId": run_id, "conversationId": str(actual_conversation_id)})

        if user_message:
            await self._maybe_await(
                self.conversation_service.save_message(
                    conversation_id=actual_conversation_id,
                    role="user",
                    content=prompt,
                )
            )

        memory_context = ""
        if self.memory_service:
            memory_context = await self._maybe_await(
                self.memory_service.build_context(
                    user_id=user_id,
                    session_id=str(actual_conversation_id),
                    max_chars=20000,
                )
            )

        runtime_tools = tools or []
        if self.tool_service and not runtime_tools:
            registered = await self._maybe_await(self.tool_service.list_tools(user_id=user_id, enabled_only=True))
            runtime_tools = [{"name": item.name, "enabled": item.enabled} for item in registered]

        assistant_text = ""
        response_chunks: list[str] = []
        tool_result = self._try_run_local_tool(prompt, runtime_tools)
        tool_calls = []
        if tool_result:
            tool_call_id = f"tool-{uuid4()}"
            tool_calls.append({"id": tool_call_id, "name": tool_result["name"], "args": tool_result["args"]})
            yield self._sse({"type": "TOOL_CALL_START", "toolCallId": tool_call_id, "toolName": tool_result["name"]})
            yield self._sse(
                {
                    "type": "TOOL_CALL_ARGS",
                    "toolCallId": tool_call_id,
                    "delta": json.dumps(tool_result["args"], ensure_ascii=False),
                }
            )
            yield self._sse({"type": "TOOL_CALL_END", "toolCallId": tool_call_id})
            yield self._sse({"type": "TOOL_RESULT", "toolCallId": tool_call_id, "result": tool_result["result"]})
            if self.tool_service:
                await self._maybe_await(
                    self.tool_service.record_call(
                        user_id=user_id,
                        conversation_id=actual_conversation_id,
                        tool_name=tool_result["name"],
                        arguments=tool_result["args"],
                        result=tool_result["result"],
                        status="success",
                    )
                )
            assistant_text = f"工具 {tool_result['name']} 执行完成：{tool_result['result']}"
        elif self.skill_service:
            matched_skill = await self._maybe_await(self.skill_service.route_intent(user_id, prompt))
            if matched_skill:
                if self.agent_execution_service:
                    agent_name = resolve_bridge_agent(matched_skill)
                    safe_context = sanitize_agent_context(forwarded_props)
                    agent_run = None
                    if self.agent_run_service:
                        agent_run = await self._maybe_await(
                            self.agent_run_service.prepare_run(
                                user_id=user_id,
                                conversation_id=actual_conversation_id,
                                skill=matched_skill,
                                agent_name=agent_name,
                                prompt=prompt,
                                context=safe_context,
                            )
                        )

                    execution_id = str(agent_run.id if agent_run else uuid4())
                    if agent_run and agent_run.status == "pending_approval":
                        assistant_text = "This action is waiting for your approval."
                        yield self._sse(
                            {
                                "type": "ACTION_REQUIRES_APPROVAL",
                                "agentRunId": execution_id,
                                "agentName": agent_name,
                                "skillName": matched_skill.label,
                                "riskLevel": agent_run.risk_level,
                                "summary": prompt[:500],
                            }
                        )
                    elif agent_run and agent_run.status == "failed":
                        assistant_text = agent_run.error or "This action is blocked."
                        yield self._sse(
                            {
                                "type": "AGENT_RUN_BLOCKED",
                                "agentRunId": execution_id,
                                "agentName": agent_name,
                                "riskLevel": agent_run.risk_level,
                                "message": assistant_text,
                            }
                        )
                    else:
                        yield self._sse(
                            {
                                "type": "AGENT_RUN_STARTED",
                                "agentRunId": execution_id,
                                "agentName": agent_name,
                                "skillName": matched_skill.label,
                            }
                        )
                        try:
                            execution_task = asyncio.create_task(
                                self.agent_execution_service.execute(
                                    agent_name,
                                    prompt,
                                    context=safe_context,
                                    timeout_seconds=600,
                                )
                            )
                            progress_count = 0
                            try:
                                while True:
                                    try:
                                        result = await asyncio.wait_for(
                                            asyncio.shield(execution_task),
                                            timeout=self.agent_progress_interval,
                                        )
                                        break
                                    except TimeoutError:
                                        progress_count += 1
                                        yield self._sse(
                                            {
                                                "type": "AGENT_RUN_PROGRESS",
                                                "agentRunId": execution_id,
                                                "agentName": agent_name,
                                                "elapsedSeconds": round(
                                                    progress_count * self.agent_progress_interval,
                                                    1,
                                                ),
                                                "message": "智能体仍在执行",
                                            }
                                        )
                            finally:
                                if not execution_task.done():
                                    execution_task.cancel()
                            assistant_text = result.content
                            if agent_run:
                                await self._maybe_await(
                                    self.agent_run_service.mark_succeeded(agent_run.id, result.content, result.raw)
                                )
                            yield self._sse(
                                {
                                    "type": "AGENT_RUN_FINISHED",
                                    "agentRunId": execution_id,
                                    "agentName": agent_name,
                                }
                            )
                        except AgentExecutionError as exc:
                            assistant_text = str(exc)
                            if agent_run:
                                await self._maybe_await(self.agent_run_service.mark_failed(agent_run.id, str(exc)))
                            yield self._sse(
                                {
                                    "type": "AGENT_RUN_ERROR",
                                    "agentRunId": execution_id,
                                    "agentName": agent_name,
                                    "message": str(exc),
                                }
                            )
                else:
                    assistant_text = f"已路由到技能：{matched_skill.label}（{matched_skill.entrypoint}）"

        if assistant_text:
            response_chunks = [assistant_text]
        elif self.model_chat_service:
            async for delta in self.model_chat_service.stream_reply(
                messages=messages,
                memory_context=memory_context,
                provider_id=provider_id,
                model_id=model_id,
            ):
                response_chunks.append(delta)
            assistant_text = "".join(response_chunks)
        else:
            assistant_text = self._build_assistant_text(prompt, memory_context)
            response_chunks = [assistant_text]

        message_id = f"msg-{uuid4()}"
        yield self._sse({"type": "TEXT_MESSAGE_START", "messageId": message_id, "role": "assistant"})
        for delta in response_chunks:
            yield self._sse({"type": "TEXT_MESSAGE_CONTENT", "messageId": message_id, "delta": delta})
        yield self._sse({"type": "TEXT_MESSAGE_END", "messageId": message_id})
        await self._maybe_await(
            self.conversation_service.save_message(
                conversation_id=actual_conversation_id,
                role="assistant",
                content=assistant_text,
                tool_calls=tool_calls,
            )
        )
        yield self._sse({"type": "RUN_FINISHED", "runId": run_id, "conversationId": str(actual_conversation_id)})

    @staticmethod
    def _build_assistant_text(prompt: str, memory_context: str = "") -> str:
        if not prompt.strip():
            return "请先输入要处理的测试任务。"
        if memory_context:
            return f"已读取记忆上下文，收到：{prompt}"
        return f"已收到：{prompt}"

    @staticmethod
    def _try_run_local_tool(prompt: str, tools: list[dict]) -> dict | None:
        names = {str(tool.get("name")) for tool in tools}
        if "echo" not in names:
            return None
        marker = "/tool echo"
        if marker not in prompt:
            return None
        text = prompt.split(marker, 1)[1].strip() or "ok"
        return {"name": "echo", "args": {"text": text}, "result": text}


AguiService = AgUiService
