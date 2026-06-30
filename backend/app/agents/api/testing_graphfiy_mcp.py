# import asyncio
#
# from langchain_mcp_adapters.client import MultiServerMCPClient
#
# client = MultiServerMCPClient({
#     "graphify": {
#         "command": "python",
#         "args": ["-m", "graphify.serve", r"C:\Users\65132\Desktop\3\vue-element-admin-master\graphify-out\graph.json"],
#         "transport": "stdio",
#     }
# })
# tools = asyncio.run(client.get_tools())
# print(tools)
