export const projectResourceLabels: Record<string, string> = {
  folders: "文件夹",
  test_cases: "测试用例",
  api_endpoints: "API 接口",
  api_tests: "API 测试脚本",
  api_test_runs: "API 测试运行",
  web_functions: "Web 功能",
  web_sub_functions: "Web 子功能",
  web_tests: "Web 测试脚本",
  web_test_runs: "Web 测试运行",
  scenario_tests: "场景测试",
  scenario_runs: "场景运行",
  test_plans: "测试计划",
  test_runs: "测试运行",
  test_run_schedules: "运行计划",
  test_run_script_jobs: "运行任务",
  failure_analyses: "失败分析",
  failure_loops: "自动修复闭环",
  pentests: "渗透测试",
  pentest_reports: "渗透测试报告",
  pentest_vulnerabilities: "漏洞记录",
  attachments: "附件与成果物",
};

export function canConfirmProjectDeletion(
  projectName: string,
  confirmation: string,
): boolean {
  return projectName.length > 0 && confirmation === projectName;
}
