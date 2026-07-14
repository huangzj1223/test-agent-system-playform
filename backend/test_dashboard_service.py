import unittest

from app.services.dashboard_service import calculate_pass_rate


class DashboardServiceHelpersTest(unittest.TestCase):
    def test_calculate_pass_rate_uses_executed_results_only(self) -> None:
        self.assertEqual(
            calculate_pass_rate(passed=8, failed=2, blocked=1),
            73,
        )
        self.assertIsNone(
            calculate_pass_rate(passed=0, failed=0, blocked=0),
        )


if __name__ == "__main__":
    unittest.main()
