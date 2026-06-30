
from typing import Any

from starlette.responses import Response, StreamingResponse
from starlette.types import Send

from langgraph_api.serde import Fragment, json_dumpb

"""
Patch Response.render and StreamingResponse.stream_response
to recognize bytearrays and memoryviews as bytes-like objects.
"""

# pragma: no cover  MC8zOmFIVnBZMlhwdTRUbGphRG1zWjg2TjNKbVVRPT06Y2YwMDQ3ZGI=

def Response_render(self, content: Any) -> bytes:
    if content is None:
        return b""
    if isinstance(content, (bytes, bytearray, memoryview)):
        return content
    return content.encode(self.charset)  # type: ignore

async def StreamingResponse_stream_response(self, send: Send) -> None:
    await send(
        {
            "type": "http.response.start",
            "status": self.status_code,
            "headers": self.raw_headers,
        }
    )
    async for chunk in self.body_iterator:
        if chunk is None:
            continue
        if isinstance(chunk, Fragment):
            chunk = chunk.buf
        if isinstance(chunk, dict):
            chunk = json_dumpb(chunk)
        if not isinstance(chunk, (bytes, bytearray, memoryview)):
            chunk = chunk.encode(self.charset)
        await send({"type": "http.response.body", "body": chunk, "more_body": True})

    await send({"type": "http.response.body", "body": b"", "more_body": False})
# type: ignore  MS8zOmFIVnBZMlhwdTRUbGphRG1zWjg2TjNKbVVRPT06Y2YwMDQ3ZGI=

# patch StreamingResponse.stream_response

StreamingResponse.stream_response = StreamingResponse_stream_response  # type: ignore[invalid-assignment]
# pylint: disable  Mi8zOmFIVnBZMlhwdTRUbGphRG1zWjg2TjNKbVVRPT06Y2YwMDQ3ZGI=

# patch Response.render

Response.render = Response_render  # type: ignore[invalid-assignment]
