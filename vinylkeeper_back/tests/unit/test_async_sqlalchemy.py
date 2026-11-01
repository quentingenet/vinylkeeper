"""The async engine runs its sync work in greenlets.

SQLAlchemy 2.1 no longer installs greenlet by itself: without the `asyncio` extra in
pyproject.toml, every query of the API fails at runtime while the imports still work.
"""
from sqlalchemy.util import greenlet_spawn


async def test_greenlet_bridge_is_installed():
    assert await greenlet_spawn(lambda: 42) == 42
