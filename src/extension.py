import importlib.util
import inspect
import math
from pathlib import Path
from types import FunctionType, ModuleType
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import FastAPI, status
from line_profiler.line_profiler import LineProfiler
from pydantic import BaseModel, validator
from pydantic.fields import PrivateAttr

TIME_UNITS = {10**-9: "ns", 10**-6: "μs", 10**-3: "ms", 1: "s"}

CONFIG_PATH: Path = Path(".lprof/settings.json")


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    return "".join(
        part.capitalize() if i > 0 else part for i, part in enumerate(string.split("_"))
    )


class BaseConfig(BaseModel):
    """Don't permit extra attributes in any object."""

    class Config:  # NOQA: D106

        # Bug: We cannot allow "forbid" because it creates a validation error
        # https://github.com/samuelcolvin/pydantic/issues/3468
        # extra = "forbid"
        allow_population_by_field_name = True
        alias_generator = to_camel
        arbitrary_types_allowed = True
        underscore_attrs_are_private = True


class Script(BaseConfig):
    """Path for a script to execute."""

    path: Path
    unit_test: bool = False
    _script: str = PrivateAttr()

    @validator("path", pre=True)
    def exists(cls, v: Union[str, Path]) -> Path:
        """Check if the script exists."""
        assert Path(v).exists()

        return Path(v)

    @validator("unit_test", always=True)
    def is_test(cls, v: bool, values: Dict[str, Any]) -> bool:
        """Check if the script is a unit test."""
        if v:
            return v

        with open(values["path"], "r") as fr:

            for line in fr:

                if line.strip():
                    if "unittest" in line:
                        return True
                    if "import" not in line:
                        break
        return False


class Module(Script):
    """Module definition and processing."""

    module: Optional[str] = None
    _reload: bool = True
    _module: ModuleType = PrivateAttr()
    _spec: Any = PrivateAttr()

    def __init__(self, **data: Any):
        """Initialize a module.

        TODO: Make this logic better. Very clunky right now.

        """
        super().__init__(**data)

        if self.module is None:

            # Specify the full module name
            self.module = self.path.name.replace(".py", "")
            paths = [self.path.parent.absolute()]
            while "__init__.py" in [f.name for f in paths[-1].iterdir()]:
                self.module = paths[-1].name + "." + self.module
                paths.append(paths[-1].parent.absolute())

        spec = importlib.util.spec_from_file_location(self.module, self.path)
        if spec is not None:
            self._module = importlib.util.module_from_spec(spec)
            if spec.loader is not None:
                spec.loader.exec_module(self._module)
            else:
                raise ValueError(f"Could not find loader for module: {self.module}")
        else:
            raise ValueError(f"Could not find module: {self.module}")


class Function(Module):
    """Function definition and ingestion."""

    function: str

    class Config:  # noqa: D106
        arbitrary_types_allowed = True

    def get_function(self) -> FunctionType:
        """Get the function signature."""
        function = [
            func
            for name, func in inspect.getmembers(self._module)
            if name == self.function
        ].pop()
        assert inspect.isfunction(function), f"Could not find function: {self.function}"

        return function


class LineProfile(BaseConfig):
    """Single line profile parse."""

    line: int
    count: int
    time: Union[int, float]
    unit: float = 10**-6


class FunctionProfile(Function):
    """Function profile parse."""

    function_line: int
    lines: List[LineProfile]


class ScriptTest(Script):
    """Configuration for running a script for profiling."""

    functions: List[Function]
    script: Optional[str] = None

    def run(self) -> List[FunctionProfile]:
        """Run the script, return the profile of all functions."""
        with open(self.path, "r") as reader:
            self.script = reader.read()

        import sys

        # append the script path so that relative imports work
        if self.unit_test:
            sys.path.append(str(self.path.parent.parent.absolute()))
        else:
            sys.path.append(str(self.path.parent.absolute()))

        profiler = LineProfiler(*[f.get_function() for f in self.functions])

        # Reload modules to ensure latest changes are loaded
        import __main__

        main_dict = __main__.__dict__

        for f in self.functions:
            # Reload the functions module if the function is directly imported
            if f.function in main_dict.keys():
                module = inspect.getmodule(main_dict[f.function])
                if module is None:
                    raise ValueError(
                        f"Could not find module for function: {f.function}"
                    )
                importlib.reload(module)

            # Reload the module if only the module is imported
            elif f.module in main_dict.keys():
                module = main_dict[f.module]
                if module is None:
                    raise ValueError(
                        f"Could not find module for function: {f.function}"
                    )
                importlib.reload(module)

            # Reload the module if a parent module is imported
            # TODO: Make this logic better. It is incomplete.
            elif (
                len(
                    set([p.name for p in f.path.parents][:-1]).intersection(
                        main_dict.keys()
                    )
                )
                > 0
            ):
                for m in set([p.name for p in f.path.parents][:-1]).intersection(
                    main_dict.keys()
                ):
                    module = main_dict[m]

                    # If a namespace module, reload the subpackages
                    if "__path__" in dir(module):
                        for d in dir(module):
                            m = getattr(module, d)
                            directory = dir(m)
                            if (
                                "__package__" in directory
                                and "__path__" not in directory
                            ):
                                if not isinstance(m, Module):
                                    raise ValueError(
                                        "Could not find module for function: "
                                        + f"{f.function}"
                                    )
                                importlib.reload(m)

                    # If not a namespace module, just reload the module
                    else:
                        if not isinstance(module, Module):
                            raise ValueError(
                                f"Could not find module for function: {f.function}"
                            )
                        importlib.reload(module)

        profiler.run(self.script)

        funcs = []
        time_unit = profiler.get_stats().unit
        for (path, fline, function), timings in profiler.get_stats().timings.items():

            lines = [
                LineProfile(line=t[0], count=t[1], time=t[2], unit=time_unit)
                for t in timings
            ]

            funcs.append(
                FunctionProfile(
                    path=path, function_line=fline, function=function, lines=lines
                )
            )

        (profiler.get_stats().timings.items())

        sys.path.pop()

        return funcs


class Config(BaseConfig):
    """Configuration for scripts and functions for profiling."""

    scripts: List[Script] = []
    functions: List[Function] = []

    def script_index(self, path: Path) -> Optional[int]:
        """Get the list index of the script."""
        for i, script in enumerate(self.scripts):
            if script.path.absolute() == path:
                return i

        return None

    def function_index(self, path: Path, function: str) -> Optional[int]:
        """Get the list index of the function."""
        for i, f in enumerate(self.functions):
            if f.path.absolute() == path and f.function == function:
                return i

        return None

    def remove_function(self, path: Path, function: str) -> None:
        """Remove a function from the list of functions to profile."""
        index = self.function_index(path, function)

        if index is not None:
            self.functions.pop(index)

    def remove_script(self, path: Path) -> None:
        """Remove a script from the list of scripts used for profiling."""
        index = self.script_index(path)

        if index is not None:
            self.scripts.pop(index)

    def add_function(self, path: Path, function: str) -> None:
        """Add a function to the list of functions to profile."""
        if self.function_index(path, function) is not None:
            return

        self.functions.append(Function(path=path, function=function))

    def add_script(self, path: Path) -> None:
        """Add a script to the list of scripts used for profiling."""
        if self.script_index(path) is not None:
            return

        self.scripts.append(Script(path=path))

    def update_config(self) -> None:
        """Save the current configuration, overwriting the old configuration."""
        CONFIG_PATH.parent.mkdir(exist_ok=True)

        with open(CONFIG_PATH, "w") as writer:
            writer.write(self.json(indent=2))

    @classmethod
    def load_config(cls) -> "Config":
        """Load and return the configuration."""
        if CONFIG_PATH.exists():
            return cls.parse_file(CONFIG_PATH)
        else:
            return cls()


"""
API Setup
"""

app = FastAPI(
    title="vscode-line-profiler",
    description="API for processing tabular data for visualization.",
)


@app.post("/config/path", status_code=status.HTTP_202_ACCEPTED)
async def config_path(fileUri: Path) -> None:
    """Set the configuration path."""
    global CONFIG_PATH

    CONFIG_PATH = fileUri.joinpath(".lprof/settings.json")


@app.post("/run/all", status_code=status.HTTP_202_ACCEPTED)
async def run_all_scripts() -> None:
    """Run all registered profiling scripts."""
    config = Config.load_config()

    for script in config.scripts:
        script_test = ScriptTest(functions=config.functions, **script.dict())
        func_profile = script_test.run()

        for profile in func_profile:
            with open(CONFIG_PATH.with_name(profile.function + ".json"), "w") as fw:
                fw.write(profile.json(indent=2))


@app.post("/function/profile", status_code=status.HTTP_202_ACCEPTED)
async def function_profile(
    fileUri: Path,
) -> List[Tuple[int, Union[None, float], str]]:
    """Return function profiles for all functions in the specified script."""
    output: List[Tuple[int, Union[None, float], str]] = []

    for path in Path(CONFIG_PATH.parent).iterdir():
        if path.name == "settings.json":
            continue

        fp = FunctionProfile.parse_file(path)

        if fp.path != fileUri:
            continue

        # calculate the total execution time
        times = [t.time for t in fp.lines]
        total_time = sum(times)
        max_time = math.log10(max(times))

        output.append((fp.function_line, None, f"{total_time*10**-6:.6f}s"))

        for line in fp.lines:
            output.append(
                (
                    line.line,
                    math.log10(line.time) / max_time,
                    f"{line.time}{TIME_UNITS[line.unit]}",
                )
            )

    return output


@app.post("/function/register", status_code=status.HTTP_202_ACCEPTED)
async def register_function(fileUri: Path, function: str) -> None:
    """Register a function for profiling."""
    config = Config.load_config()

    config.add_function(fileUri, function)

    config.update_config()


@app.post("/function/unregister", status_code=status.HTTP_202_ACCEPTED)
async def unregister_function(fileUri: Path, function: str) -> None:
    """Remove a function from the list of functions to profile."""
    config = Config.load_config()

    config.remove_function(fileUri, function)

    config.update_config()


@app.post("/script/register", status_code=status.HTTP_202_ACCEPTED)
async def register_script(fileUri: Path) -> None:
    """Register a script to be run for profiling."""
    config = Config.load_config()

    config.add_script(fileUri)

    config.update_config()


@app.post("/script/unregister", status_code=status.HTTP_202_ACCEPTED)
async def unregister_script(fileUri: Path) -> None:
    """Remove a script from the list of scripts used for profiling."""
    config = Config.load_config()

    config.remove_script(fileUri)

    config.update_config()


if __name__ == "__main__":

    import uvicorn

    uvicorn.run("extension:app", host="127.0.0.1", port=9001, log_level="info")
