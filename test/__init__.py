from unittest import TestSuite

from .test_profile import TestProfile

# Tests should be added here to be automatically configured in the load_tests function
test_cases = (TestProfile,)


def load_tests(loader, tests, pattern):
    """Load tests."""
    suite = TestSuite()
    for test_class in test_cases:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    return suite
