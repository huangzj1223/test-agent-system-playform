"""
项目服务

处理项目相关的业务逻辑
"""

from dataclasses import dataclass
import re
from typing import Optional
from urllib.parse import unquote, urlparse
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
# noqa  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2TkZKWFF3PT06MWU3ZjNkYTE=

from app.models.project import Project
from app.models.attachment import Attachment
from app.models.api_endpoint import APIEndpoint
from app.models.api_test import APITest, APITestRun
from app.models.failure_analysis import TestFailureAnalysis
from app.models.folder import Folder
from app.models.loop import TestFailureLoopRun
from app.models.pentest import Pentest, PentestReport, PentestVulnerability
from app.models.test_case import TestCase
from app.models.test_plan import TestPlan
from app.models.test_run import TestRun, TestRunSchedule, TestRunScriptJob
from app.models.test_scenario import ScenarioRun, TestScenario
from app.models.web_function import WebFunction, WebSubFunction
from app.models.web_test import WebTest, WebTestRun
from app.repositories.project_repo import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectDeletionImpact,
    ProjectDeletionResult,
    ProjectInfo,
    ProjectUpdate,
)
from app.schemas.common import LinkInfo
from app.utils.exceptions import BadRequestException, NotFoundException, ConflictException
from app.utils.identifier import generate_project_identifier
from app.config.settings import settings
from app.config.minio_client import MinIOClient


@dataclass
class ProjectDeletionInventory:
    counts: dict[str, int]
    object_names: list[str]


def normalize_storage_object_name(value: str | None) -> str | None:
    """Convert stored MinIO URLs to object names and ignore absolute local paths."""
    if not value:
        return None
    candidate = value.strip()
    if not candidate or candidate.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", candidate):
        return None
    if candidate.startswith(("http://", "https://")):
        path = unquote(urlparse(candidate).path).lstrip("/")
        bucket_prefix = f"{settings.minio_bucket}/"
        return path[len(bucket_prefix):] if path.startswith(bucket_prefix) else path or None
    return candidate.replace("\\", "/")


PROJECT_RESOURCE_MODELS = (
    ("folders", Folder),
    ("test_cases", TestCase),
    ("api_endpoints", APIEndpoint),
    ("api_tests", APITest),
    ("api_test_runs", APITestRun),
    ("web_functions", WebFunction),
    ("web_sub_functions", WebSubFunction),
    ("web_tests", WebTest),
    ("web_test_runs", WebTestRun),
    ("scenario_tests", TestScenario),
    ("scenario_runs", ScenarioRun),
    ("test_plans", TestPlan),
    ("test_runs", TestRun),
    ("test_run_schedules", TestRunSchedule),
    ("failure_analyses", TestFailureAnalysis),
    ("failure_loops", TestFailureLoopRun),
    ("pentests", Pentest),
    ("pentest_reports", PentestReport),
    ("pentest_vulnerabilities", PentestVulnerability),
    ("attachments", Attachment),
)

class ProjectService:
    """
    项目服务类
    
    处理项目相关的业务逻辑
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ProjectRepository(session)
# pragma: no cover  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2TkZKWFF3PT06MWU3ZjNkYTE=
    
    async def get_projects(
        self,
        offset: int = 0,
        limit: int = 30,
    ) -> tuple[list[ProjectInfo], int]:
        """
        获取项目列表
        
        Args:
            offset: 偏移量
            limit: 限制数量
            
        Returns:
            tuple: (项目列表, 总数)
        """
        projects_data = await self.repo.get_all_with_counts(offset, limit)
        total = await self.repo.count()
        
        result = []
        for data in projects_data:
            project = data["project"]
            info = ProjectInfo(
                identifier=project.identifier,
                name=project.name,
                description=project.description,
                created_at=project.created_at,
                created_by=project.creator.email if project.creator else "",
                updated_at=project.updated_at,
                team_id=[t.id for t in project.teams] if project.teams else None,
                test_cases_count=data["test_cases_count"],
                folders_count=data["folders_count"],
                links=LinkInfo(
                    self=f"{settings.api_prefix}/projects/{project.identifier}",
                ),
            )
            result.append(info)
        
        return result, total
    
    async def get_project(self, project_identifier: str) -> ProjectInfo:
        """
        获取项目详情
        
        Args:
            project_identifier: 项目标识符
            
        Returns:
            ProjectInfo: 项目信息
            
        Raises:
            NotFoundException: 项目不存在
        """
        project = await self.repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(
                resource_type="项目",
                resource_id=project_identifier
            )
        
        # 获取统计信息
        data = await self.repo.get_all_with_counts(0, 1)
        tc_count = 0
        folder_count = 0
        for d in data:
            if d["project"].id == project.id:
                tc_count = d["test_cases_count"]
                folder_count = d["folders_count"]
                break
        
        return ProjectInfo(
            identifier=project.identifier,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
            created_by=project.creator.email if project.creator else "",
            updated_at=project.updated_at,
            team_id=[t.id for t in project.teams] if project.teams else None,
            test_cases_count=tc_count,
            folders_count=folder_count,
            links=LinkInfo(
                self=f"{settings.api_prefix}/projects/{project.identifier}",
                folders=f"{settings.api_prefix}/projects/{project.identifier}/folders",
                test_cases=f"{settings.api_prefix}/projects/{project.identifier}/test-cases",
            ),
        )
    
    async def create_project(
        self,
        data: ProjectCreate,
        created_by: UUID,
    ) -> ProjectInfo:
        """
        创建项目
        
        Args:
            data: 创建项目数据
            created_by: 创建者 ID
            
        Returns:
            ProjectInfo: 创建的项目信息
        """
        # 生成项目标识符
        sequence = await self.repo.get_next_sequence()
        identifier = generate_project_identifier(sequence)
        
        # 确保标识符唯一
        while await self.repo.identifier_exists(identifier):
            sequence += 1
            identifier = generate_project_identifier(sequence)
# pragma: no cover  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2TkZKWFF3PT06MWU3ZjNkYTE=
        
        # 创建项目
        project = await self.repo.create(
            identifier=identifier,
            name=data.name,
            description=data.description,
            created_by=created_by,
        )
        
        return ProjectInfo(
            identifier=project.identifier,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
            created_by="",  # 需要查询用户邮箱
            team_id=data.team_id,
            test_cases_count=0,
            folders_count=0,
        )
    
    async def update_project(
        self,
        project_identifier: str,
        data: ProjectUpdate,
    ) -> ProjectInfo:
        """
        更新项目

        Args:
            project_identifier: 项目标识符
            data: 更新数据

        Returns:
            ProjectInfo: 更新后的项目信息

        Raises:
            NotFoundException: 项目不存在
        """
        project = await self.repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(
                resource_type="项目",
                resource_id=project_identifier
            )

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field != "team_id" and hasattr(project, field):
                setattr(project, field, value)

        # 刷新获取更新后的数据
        await self.session.flush()
        await self.session.refresh(project)
# pylint: disable  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2TkZKWFF3PT06MWU3ZjNkYTE=

        return ProjectInfo(
            identifier=project.identifier,
            name=project.name,
            description=project.description,
            created_at=project.created_at,
            created_by=project.creator.email if project.creator else "",
            updated_at=project.updated_at,
            team_id=[t.id for t in project.teams] if project.teams else None,
            test_cases_count=0,
            folders_count=0,
            links=LinkInfo(
                self=f"{settings.api_prefix}/projects/{project.identifier}",
                folders=f"{settings.api_prefix}/projects/{project.identifier}/folders",
                test_cases=f"{settings.api_prefix}/projects/{project.identifier}/test-cases",
            ),
        )

    async def get_deletion_impact(
        self,
        project_identifier: str,
    ) -> ProjectDeletionImpact:
        project = await self.repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(resource_type="项目", resource_id=project_identifier)

        inventory = await self._get_deletion_inventory(project.id)
        return ProjectDeletionImpact(
            project_identifier=project.identifier,
            project_name=project.name,
            resources=inventory.counts,
            total_records=sum(inventory.counts.values()),
            stored_objects=len(inventory.object_names),
        )

    async def _get_deletion_inventory(self, project_id: UUID) -> ProjectDeletionInventory:
        counts: dict[str, int] = {}
        for key, model in PROJECT_RESOURCE_MODELS:
            result = await self.session.execute(
                select(func.count()).select_from(model).where(model.project_id == project_id)
            )
            counts[key] = int(result.scalar_one() or 0)

        script_jobs = await self.session.execute(
            select(func.count())
            .select_from(TestRunScriptJob)
            .join(TestRun, TestRun.id == TestRunScriptJob.test_run_id)
            .where(TestRun.project_id == project_id)
        )
        counts["test_run_script_jobs"] = int(script_jobs.scalar_one() or 0)

        attachments = await self.session.execute(
            select(Attachment.object_name).where(Attachment.project_id == project_id)
        )
        object_names = list(attachments.scalars().all())

        storage_path_queries = (
            select(APITest.schema_path).where(APITest.project_id == project_id),
            select(APITest.script_path).where(APITest.project_id == project_id),
            select(APITestRun.report_path).where(APITestRun.project_id == project_id),
            select(WebTest.script_path).where(WebTest.project_id == project_id),
            select(WebTestRun.report_path).where(WebTestRun.project_id == project_id),
            select(WebTestRun.screenshots_path).where(WebTestRun.project_id == project_id),
            select(ScenarioRun.report_path).where(ScenarioRun.project_id == project_id),
            select(PentestReport.file_path).where(PentestReport.project_id == project_id),
            select(TestRunScriptJob.report_path)
            .join(TestRun, TestRun.id == TestRunScriptJob.test_run_id)
            .where(TestRun.project_id == project_id),
        )
        for statement in storage_path_queries:
            values = await self.session.execute(statement)
            object_names.extend(value for value in values.scalars().all() if value)

        normalized_objects = [
            normalized
            for value in object_names
            if (normalized := normalize_storage_object_name(value)) is not None
        ]
        return ProjectDeletionInventory(
            counts=counts,
            object_names=list(dict.fromkeys(normalized_objects)),
        )

    async def delete_project(
        self,
        project_identifier: str,
        confirmation: str,
    ) -> ProjectDeletionResult:
        """
        删除项目

        Args:
            project_identifier: 项目标识符

        Returns:
            str: 删除成功消息
        """
        project = await self.repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(
                resource_type="项目",
                resource_id=project_identifier
            )

        if confirmation != project.name:
            raise BadRequestException("确认项目名称与目标项目不一致")

        inventory = await self._get_deletion_inventory(project.id)
        MinIOClient.delete_files(inventory.object_names)
        await self.repo.delete(project)
        return ProjectDeletionResult(
            project_identifier=project_identifier,
            message=f"项目 {project_identifier} 及其关联数据已永久删除",
            deleted_records=sum(inventory.counts.values()),
            deleted_objects=len(inventory.object_names),
        )

