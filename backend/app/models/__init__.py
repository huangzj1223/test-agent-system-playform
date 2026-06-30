"""
SQLAlchemy 数据库模型模块

定义所有 PostgreSQL 数据库表的 ORM 模型
"""

# type: ignore  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2Ym0wM2RnPT06YjYzMDQxOTg=

from .base import Base, TimestampMixin, UUIDMixin
from .user import User
from .team import Team, ProjectTeam
from .project import Project
from .folder import Folder
from .folder_type import FolderType
from .test_case import TestCase, TestStep, Tag, TestCaseTag
from .test_run import TestRun, TestRunTestCase, TestRunScriptJob, TestRunSchedule
from .test_result import TestResult, TestStepResult
from .attachment import Attachment, AttachmentEntityType
from .configuration import Configuration
from .test_plan import TestPlan
from .api_test import APITest, APITestRun, APITestResult
from .api_endpoint import APIEndpoint
from .web_test import WebTest, WebTestRun, WebTestResult
from .web_function import WebFunction, WebSubFunction
from .test_scenario import (
    TestScenario,
    ScenarioStep,
    StepDataMapping,
    ScenarioVariable,
    ScenarioRun,
    ScenarioStepResult,
)
from .pentest import Pentest, PentestReport, PentestVulnerability
# fmt: off  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2Ym0wM2RnPT06YjYzMDQxOTg=

# 枚举类型从 schemas.enums 导入，避免重复定义
from ..schemas.enums import TestPlanStatus, TestPlanActiveState
# fmt: off  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2Ym0wM2RnPT06YjYzMDQxOTg=

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDMixin",
    "User",
    "Team",
    "ProjectTeam",
    "Project",
    "Folder",
    "FolderType",
    "TestCase",
    "TestStep",
    "Tag",
    "TestCaseTag",
    "TestRun",
    "TestRunTestCase",
    "TestRunScriptJob",
    "TestRunSchedule",
    "TestResult",
    "TestStepResult",
    "Attachment",
    "AttachmentEntityType",
    "Configuration",
    "TestPlan",
    "TestPlanStatus",
    "TestPlanActiveState",
    "APITest",
    "APITestRun",
    "APITestResult",
    "APIEndpoint",
    "WebTest",
    "WebTestRun",
    "WebTestResult",
    "WebFunction",
    "WebSubFunction",
    "TestScenario",
    "ScenarioStep",
    "StepDataMapping",
    "ScenarioVariable",
    "ScenarioRun",
    "ScenarioStepResult",
    "Pentest",
    "PentestReport",
    "PentestVulnerability",
]

# pragma: no cover  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2Ym0wM2RnPT06YjYzMDQxOTg=
