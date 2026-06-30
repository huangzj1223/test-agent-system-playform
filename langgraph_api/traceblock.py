
import os
from urllib.parse import urlparse

from requests.sessions import Session

_HOST = "api.smith.langchain.com"
_PATH_PREFIX = "/runs"
# pylint: disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2YjFvM01nPT06MzhjMzNkY2E=

def patch_requests():
    if os.getenv("LANGSMITH_DISABLE_SAAS_RUNS") != "true":
        return
    _orig = Session.request
# pragma: no cover  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2YjFvM01nPT06MzhjMzNkY2E=

    def _guard(self, method, url, *a, **kw):
        if method.upper() == "POST":
            u = urlparse(url)
            if u.hostname == _HOST and _PATH_PREFIX in u.path:
                raise RuntimeError(f"POST to {url} blocked by policy")
        return _orig(self, method, url, *a, **kw)

    Session.request = _guard  # type: ignore[invalid-assignment]
