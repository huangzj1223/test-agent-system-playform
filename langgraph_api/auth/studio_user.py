
from langgraph_sdk.auth.types import StudioUser as StudioUserBase
from starlette.authentication import BaseUser
# pylint: disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WVdwVGFnPT06YzJhOGJkMTU=

class StudioUser(StudioUserBase, BaseUser):
    """StudioUser class."""

    def dict(self):
        return {
            "kind": "StudioUser",
            "is_authenticated": self.is_authenticated,
            "display_name": self.display_name,
            "identity": self.identity,
            "permissions": self.permissions,
        }
# type: ignore  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WVdwVGFnPT06YzJhOGJkMTU=
