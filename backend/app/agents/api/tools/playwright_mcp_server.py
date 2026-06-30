import asyncio

from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient(
        {
            "playwright-api": {
                "transport": "stdio",  # Local subprocess communication
                "command": "npx",
                "args": ["-y", "@executeautomation/playwright-mcp-server"],
            },
            "mcp-server-chart": {
                "transport": "stdio",
                "command": "npx",
                "args": ["-y", "@antv/mcp-server-chart"]
            }
        }
    )

playwright_api_tools = asyncio.run(client.get_tools())
# 打印每个工具名称，过滤不需要的工具
# for tool in playwright_api_tools:
#     print(tool.name)


