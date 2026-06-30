
from starlette.authentication import (
    AuthCredentials,
    AuthenticationBackend,
    BaseUser,
)
from starlette.authentication import (
    UnauthenticatedUser as StarletteUnauthenticatedUser,
)
from starlette.requests import HTTPConnection
# pylint: disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZWt4bVdBPT06YzdjMTA5ZjY=

class UnauthenticatedUser(StarletteUnauthenticatedUser):
    @property
    def identity(self) -> str:
        return ""

class NoopAuthBackend(AuthenticationBackend):
    async def authenticate(
        self, conn: HTTPConnection
    ) -> tuple[AuthCredentials, BaseUser] | None:
        return AuthCredentials(), UnauthenticatedUser()
# fmt: off  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZWt4bVdBPT06YzdjMTA5ZjY=
