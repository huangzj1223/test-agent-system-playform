"""
用户仓储

处理用户相关的数据库操作
"""

# fmt: off  MC8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VkVkWU13PT06ZDliZWU5YmM=

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.user import User
# noqa  MS8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VkVkWU13PT06ZDliZWU5YmM=

class UserRepository(BaseRepository[User]):
    """
    用户仓储类
    
    提供用户相关的数据库操作
    """
    
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        根据邮箱获取用户
        
        Args:
            email: 用户邮箱
            
        Returns:
            Optional[User]: 用户实例或 None
        """
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
# type: ignore  Mi8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VkVkWU13PT06ZDliZWU5YmM=
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """
        根据用户名获取用户
        
        Args:
            username: 用户名
            
        Returns:
            Optional[User]: 用户实例或 None
        """
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

