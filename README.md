<p align="center">
<a href=https://marketplace.visualstudio.com/items?itemName=perpetualhelp.python-line-profiler><img src=https://vsmarketplacebadge.apphb.com/version/perpetualhelp.python-line-profiler.svg?style=flat-square></a>
<a href=https://marketplace.visualstudio.com/items?itemName=perpetualhelp.python-line-profiler><img src=https://vsmarketplacebadge.apphb.com/installs/perpetualhelp.python-line-profiler.svg?style=flat-square></a>
<a href=https://marketplace.visualstudio.com/items?itemName=perpetualhelp.python-line-profiler><img src=https://vsmarketplacebadge.apphb.com/rating/perpetualhelp.python-line-profiler.svg?style=flat-square></a>
<a href="https://opensource.org/licenses/MIT"><img alt="Code style: black" src="https://img.shields.io/badge/License-MIT-red?style=flat-square"></a>
<a href="https://github.com/psf/black"><img alt="Code style: black" src="https://img.shields.io/badge/code%20style-black-000000?style=flat-square"></a>
<br>
<a href="https://liberapay.com/nicholas-schaub/donate"><img src="https://img.shields.io/liberapay/receives/nicholas-schaub.svg?style=flat-square&logo=liberapay"></a>
<a href="https://www.paypal.com/donate/?business=BJ5E2X66MKSAL&no_recurring=0&currency_code=USD"><img alt="Paypal Donate" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif"/></a>
</p>

# python-line-profiler (v0.4.0)

`python-line-profiler` is a vscode extension to configure and run [line_profiler](https://github.com/pyutils/line_profiler#installation), then visualize the results in the editor.

![example](https://github.com/PerpetualHelp/python-line-profiler/raw/master/images/highlights.jpg)

This is a very buggy beta. If you run into a problem, look at the [known issues](#known-issues) first. If your issue still isn't resolved, or you have an outstanding question, submit an [issue](https://github.com/PerpetualHelp/python-line-profiler/issues)

If you find this useful and would like to see continued development, buy me a beverage by hitting the donate button at the top.

## Contents

1. [How to use](#features)
2. [Installation and Requirements](#installation-and-requirements)
3. [Extension Settings](#extension-settings)
3. [Known Issues](#known-issues)
4. [Donate](#funding)

## Features

To use `python-line-profiler`:
1. Highlight a function in the editor, right click and choose `Python Line Profiler: Register Function`

<p align=center><img src=https://github.com/PerpetualHelp/python-line-profiler/raw/master/images/register_function.jpg></p>

2. In the file explorer, select a script to profile the registered function, right click and choose `Python Line Profiler: Run Script`

<p align=center><img src=https://github.com/PerpetualHelp/python-line-profiler/raw/master/images/run_script.jpg></p>

3. Once the script is done running, results will be displayed as text decorations showing the number of times each line was called along with total run times. Each line is highlighted in red, with brighter red indicating longer run times relative to other lines.

In the above example, line 92 is the brightest and therefore the most time consuming line of code.

A test script can be used to profile the code if it uses `unittest`.

## Installation and Requirements

This extension requires that Python 3.7+ is installed. It is recommended that the vscode Python extension (ms-python) is installed.

One important thing to note is taht this extension installs libraries into the Python environment configured for the workspace. This is required since it runs scripts under the hood for profiling. It is expected that all the required packages for running a script have been installed into the configured environment. However, to run the code a few packages are needed and will be installed into the environment:
1. fastapi
2. line-profiler

To ensure dependency conflicts are not injected into the environment, specific versions are not pinned.

## Extension Settings

`python.profile.lineColorOn: true` - Turn the line colors on (`true`, default) or off (`false`).

`python.profile.lineColor: "100,0,0"` - A 3-tuple RGB value. Default is `"100,0,0"`.

## Known Issues

This is a very buggy beta. There are probably a lot of issues. Known issues are:
1. Registering multiple functions with the same name with only show visualizations on one of the functions
2. Visualization seem to disappear when multiple scripts are shown side by side when switching tabs.
3. `pytest` files cannot be used as test scripts (probably).
4. No other testing packages can be used either.
5. Running a script that also contains a profiling function, then switching to using a different script, returns no results.


Possible issues based on the current code. If you run into these issues, please open an [issue](https://github.com/PerpetualHelp/python-line-profiler/issues):
1. Import aliasing (`import numpy as np`) could cause issues.
2. Relative imports with more than one level of namespace packages will likely cause problems.

## Release Notes

This is a buggy beta. If you're trying it out, give us some feedback in the [issues](https://github.com/PerpetualHelp/python-line-profiler/issues)!

## Funding

Donations are appreciated to support the continued development of this project and future projects like it. A recurring donation can be set up using Libra Pay by clicking on the button below.

<a href="https://liberapay.com/nicholas-schaub/donate"><img src="https://img.shields.io/liberapay/receives/nicholas-schaub.svg?style=flat-square&logo=liberapay"></a>
