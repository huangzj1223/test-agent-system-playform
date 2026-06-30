
import os
# type: ignore  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VERkd1VnPT06NzViZjk0ZTQ=

from langgraph.version import __version__

# Only gate features on the major.minor version; Lets you ignore the rc/alpha/etc. releases anyway
LANGGRAPH_PY_MINOR = tuple(map(int, __version__.split(".")[:2]))

OMIT_PENDING_SENDS = LANGGRAPH_PY_MINOR >= (0, 5)
USE_RUNTIME_CONTEXT_API = LANGGRAPH_PY_MINOR >= (0, 6)
USE_NEW_INTERRUPTS = LANGGRAPH_PY_MINOR >= (0, 6)
USE_DURABILITY = LANGGRAPH_PY_MINOR >= (0, 6)
# fmt: off  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VERkd1VnPT06NzViZjk0ZTQ=

# Feature flag for new gRPC-based persistence layer
FF_USE_CORE_API = os.getenv("FF_USE_CORE_API", "false").lower() in (
    "true",
    "1",
    "yes",
)
# Feature flag for using the JS native API
FF_USE_JS_API = os.getenv("FF_USE_JS_API", "false").lower() in (
    "true",
    "1",
    "yes",
)
