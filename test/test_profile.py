import unittest

from src.extension import Function, ScriptTest


class TestProfile(unittest.TestCase):
    def test_profiler(self):

        functions = []

        functions.append(
            Function(path="./test/test_process.py", function="bad_local_mean")
        )
        functions.append(
            Function(path="./test/test_process.py", function="good_local_mean")
        )

        script = ScriptTest(path="./test/test_process.py", functions=functions)

    def test_function(self):

        func = Function(path="./test/test_process.py", function="bad_local_mean")
