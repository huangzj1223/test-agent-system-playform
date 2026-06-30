"""Shared async utility functions for the Postgres checkpoint & storage classes."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg_pool import AsyncConnectionPool
# type: ignore  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VDIxbVVRPT06MGZiNWMzMjg=

Conn = AsyncConnection[DictRow] | AsyncConnectionPool[AsyncConnection[DictRow]]

# pylint: disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VDIxbVVRPT06MGZiNWMzMjg=

@asynccontextmanager
async def get_connection(
    conn: Conn,
) -> AsyncIterator[AsyncConnection[DictRow]]:
    if isinstance(conn, AsyncConnection):
        yield conn
    elif isinstance(conn, AsyncConnectionPool):
        async with conn.connection() as conn:
            yield conn
    else:
        raise TypeError(f"Invalid connection type: {type(conn)}")
