import math
import sys
from pathlib import Path
from typing import List, Tuple, Union

sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI, status  # noqa: E402

from model import TIME_UNITS, Config, FunctionProfile, ScriptTest  # noqa: E402

CONFIG_PATH: Path = Path(".lprof/settings.json")


def format_timing(time: float) -> Tuple[str, str]:
    """Format timings into an easier to read format.

    This function scales each timing so that is is in nanoseconds if the timing is less
    than a microsecond, microseconds if the timing is less than a millisecond but more
    than a nanosecond, etc.

    Args:
        time (float): Time in seconds.

    Returns:
        Tuple[str, str]: An integer value and associated unit value.
    """
    out_val = ""
    out_unit = ""

    if time == 0:
        return "0.0", TIME_UNITS[1e-6]

    for scale, unit in TIME_UNITS.items():
        if unit == "ns":
            continue
        value = time / scale
        if value > 0 and value < 1000:
            if unit in [TIME_UNITS[1e-6], TIME_UNITS[1e-9]]:
                out_val = str(f"{value:.0f}")
            else:
                out_val = str(str(f"{value:.1f}"))
            out_unit = unit
            break

    if "" in [out_val, out_unit]:
        out_val = str(str(f"{value:.1f}"))
        out_unit = "s"

    return out_val, out_unit


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


@app.post("/run/script", status_code=status.HTTP_202_ACCEPTED)
async def run_script(fileUri: Path) -> None:
    """Run all registered profiling scripts."""
    config = Config.load_config(CONFIG_PATH)

    config.scripts = []
    config.add_script(fileUri)

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
        times = [t.time * t.unit for t in fp.lines]  # time in seconds
        total_time = sum(times)
        max_time = (
            1.0 if not total_time else math.log(max(times) * 1e6)
        )  # max time in microseconds

        output.append(
            (
                fp.function_line,
                None,
                f"total time: {''.join(format_timing(total_time))}",
            )
        )

        for line in fp.lines:
            output.append(
                (
                    line.line,
                    line.time
                    if not line.time
                    else math.log(line.time * line.unit * 1e6) / max_time,
                    f"{line.count} call{'s' if line.count > 1 else ''}, "
                    + f"{''.join(format_timing(line.time * line.unit))}",
                )
            )

    return output


@app.post("/function/register", status_code=status.HTTP_202_ACCEPTED)
async def register_function(fileUri: Path, function: str) -> None:
    """Register a function for profiling."""
    config = Config.load_config(CONFIG_PATH)

    config.add_function(fileUri, function)

    config.update_config(CONFIG_PATH)


@app.post("/function/unregister", status_code=status.HTTP_202_ACCEPTED)
async def unregister_function(fileUri: Path, function: str) -> None:
    """Remove a function from the list of functions to profile."""
    config = Config.load_config(CONFIG_PATH)

    config.remove_function(fileUri, function)

    config.update_config(CONFIG_PATH)


if __name__ == "__main__":

    import uvicorn

    uvicorn.run("extension:app", host="127.0.0.1", port=9001, log_level="info")
