import fetch from "node-fetch";
import { spawn, execSync } from "child_process";
import * as vscode from "vscode";
import { IProposedExtensionAPI } from "./dependencies/vscode-python";

var childControllers: AbortController[] = [];
var decorations: vscode.TextEditorDecorationType[] = [];
let isInitialized: boolean = false;
let extensionPath = "/";
const extName = "python-line-profiler";

/**
 * Registers a function for profiling.
 *
 */
async function registerFunction() {
  const prefix = `${extName}.registerFunction`;
  console.info(`${prefix}: Running...`);

  // Get vscode selection
  let selection = vscode.window.activeTextEditor?.selection;
  var text = vscode.window.activeTextEditor?.document.getText(selection);
  var fileUri = vscode.window.activeTextEditor?.document.fileName;

  console.debug(
    `${prefix}.fileUri: ${JSON.stringify({
      fileUri: String(fileUri),
    })}`
  );

  const response = await fetch(
    `http://127.0.0.1:9001/function/register?fileUri=${String(
      fileUri
    )}&function=${text}`,
    {
      method: "POST",
      headers: { contentType: "application/json" },
    }
  );

  if (response.status !== 202) {
    console.error(`${prefix}: Response status - ${await response.status}`);
    console.error(`${prefix}: There was an error. ${await response.text()}`);
  } else {
    const data = await response.json();
    console.debug(`${prefix}: ${JSON.stringify(data)}`);
  }
}

/**
 * Unregister a function for profiling.
 *
 */
async function unregisterFunction() {
  const prefix = `${extName}.unregisterFunction`;
  console.info(`${prefix}: Running...`);

  let selection = vscode.window.activeTextEditor?.selection;
  var text = vscode.window.activeTextEditor?.document.getText(selection);
  var fileUri = vscode.window.activeTextEditor?.document.fileName;

  console.info(
    `${prefix}: ${JSON.stringify({
      fileUri: String(fileUri),
    })}`
  );

  const response = await fetch(
    `http://127.0.0.1:9001/function/unregister?fileUri=${String(
      fileUri
    )}&function=${text}`,
    {
      method: "POST",
      headers: { contentType: "application/json" },
    }
  );

  if (response.status !== 202) {
    console.error(`${prefix}: Response status - ${await response.status}`);
    console.error(`${prefix}: There was an error. ${await response.text()}`);
  } else {
    const data = await response.json();
    console.info(`${prefix}: ${JSON.stringify(data)}`);
  }
}

async function runScript(fileUri: vscode.Uri) {
  const prefix = `${extName}.runScript`;
  console.info(`${prefix}: Running...`);

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Python Line Profiler: Running profile...",
      cancellable: false,
    },
    async (progress) => {
      const response = await fetch(
        `http://127.0.0.1:9001/run/script?fileUri=${fileUri.fsPath}`,
        {
          method: "POST",
          headers: { contentType: "application/json" },
        }
      );

      if (response.status !== 202) {
        console.error(`${prefix}: Response status - ${response.status}`);
        console.error(
          `${prefix}: There was an error. ${await response.text()}`
        );
      } else {
        const data = await response.json();
        console.debug(`${prefix}: ${JSON.stringify(data)}`);
      }

      await loadProfiles(vscode.window.visibleTextEditors);
    }
  );
}

async function loadProfiles(editors: readonly vscode.TextEditor[]) {
  // Load settings
  let config = vscode.workspace.getConfiguration("python.profile");
  let colorOn = config.has("lineColorOn") ? config.get("lineColorOn") : true;
  let lineColor = config.has("lineColor") ? config.get("lineColor") : "100,0,0";

  const prefix = `${extName}.loadProfiles`;
  console.info(`${prefix}: Running...`);

  if (editors.length === 0) {
    return;
  }

  let editor = editors[0];
  let fileUri = editor.document.uri;

  // Clear the previous set of decorations
  for (let decoration of decorations) {
    decoration.dispose();
  }
  decorations = [];

  console.debug(
    `${prefix}.fileUri: ${JSON.stringify({
      fileUri: String(fileUri),
    })}`
  );

  const response = await fetch(
    `http://127.0.0.1:9001/function/profile?fileUri=${fileUri.fsPath}`,
    {
      method: "POST",
      headers: { contentType: "application/json" },
    }
  );

  if (response.status !== 202) {
    console.error(`${prefix}: There was an error.`);
  }

  const data = await response.json();
  console.debug(`${prefix}: ${JSON.stringify(data)}`);

  for (let line of data) {
    let range = new vscode.Range(
      new vscode.Position(line[0] - 1, 0),
      new vscode.Position(line[0] - 1, 88)
    );
    let hoverMessage = line[2];
    if (line[1] === null) {
      let color = "rgba(255,255,0,0.1)";
      false;
      let decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: color,
        isWholeLine: true,
      });
      decorations.push(decoration);
      editor.setDecorations(decoration, [
        {
          range,
          hoverMessage,
          renderOptions: {
            after: {
              contentText: "(" + hoverMessage + ")",
              color: "rgba(255,255,255,0.4)",
              margin: "0px 0px 0px 25px",
            },
          },
        },
      ]);
    } else {
      let color = `rgba(${lineColor},${line[1]})`;
      if (!colorOn) {
        color = `rgba(100,0,0,0.0)`;
      }
      let decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: color,
        isWholeLine: true,
      });
      decorations.push(decoration);
      editor.setDecorations(decoration, [
        {
          range,
          hoverMessage,
          renderOptions: {
            after: {
              contentText: "(" + hoverMessage + ")",
              color: "rgba(255,255,255,0.4)",
              margin: "0px 0px 0px 25px",
            },
          },
        },
      ]);
    }
  }
}

export async function initializePython() {
  const prefix = `${extName}.initializePython`;
  console.info(`${prefix}: Running...`);

  // Send the kill signal to existing processes
  if (childControllers.length > 0) {
    childControllers[childControllers.length - 1].abort();
  }

  // Create a new abort signal
  let childController = new AbortController();
  let { signal } = childController;
  childControllers.push(childController);

  // Check if python-extension is active and if we have a path from there
  const extension = vscode.extensions.getExtension("ms-python.python");
  if (extension) {
    let pyEnv: string = "";
    if (!extension.isActive) {
      await extension.activate();
    }
    const api: IProposedExtensionAPI =
      extension.exports as IProposedExtensionAPI;
    if (api.environment) {
      const path = await api.environment.getActiveEnvironmentPath();
      if (path) {
        pyEnv = path.path;
      } else {
        console.error(
          "No Python environment path is set. Set the environment path."
        );
      }
    } else {
      console.error("Could not find a Python environment.");
    }

    console.log(
      `${prefix}: ` +
        execSync(
          pyEnv + " -m pip install -r " + extensionPath + "/requirements.txt"
        )
    );
    let pyProcess = spawn(pyEnv, [extensionPath + "/out/extension.py"], {
      signal,
    });
    pyProcess.stderr.on("data", (data) => {
      let mes = data.toString().trim();
      if (mes.indexOf("INFO:     Application startup complete.")) {
        isInitialized = true;
      }
      console.error(mes);
    });
    pyProcess.stdout.on("data", (data) => {
      let mes = data.toString().trim();
      console.log(mes);
    });
  } else {
    console.log(`${prefix}: ms-python is not installed. Aborting activation.`);
  }
  console.info(`${prefix}: Waiting for server to start...`);
  while (!isInitialized) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.info(`${prefix}: Server started.`);
}

export async function activate(context: vscode.ExtensionContext) {
  const prefix = `${extName}.activate`;
  console.info(`${prefix}: Running...`);

  extensionPath = context.extensionPath;

  const extension = vscode.extensions.getExtension("ms-python.python");
  if (extension) {
    if (!extension.isActive) {
      await extension.activate();
    }
    const api: IProposedExtensionAPI =
      extension.exports as IProposedExtensionAPI;

    api.environment.onDidActiveEnvironmentChanged(async (listener) => {
      await initializePython();
    });
  } else {
    console.log(`${prefix}: ms-python is not installed. Aborting activation.`);
    throw Error("ms-python is not installed.");
  }

  await initializePython();

  if (vscode.workspace.workspaceFolders) {
    let fileUri = vscode.workspace.workspaceFolders[0].uri;
    try {
      const response = await fetch(
        `http://127.0.0.1:9001/config/path?fileUri=${fileUri.fsPath}`,
        {
          method: "POST",
          headers: { contentType: "application/json" },
        }
      );

      //TODO: Add inresponse check
    } catch (e) {
      if (typeof e === "string") {
        console.error(prefix + ": " + e.toUpperCase());
      } else if (e instanceof Error) {
        console.error(prefix + ": " + e.message);
      }
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-line-profiler.registerFunction",
      registerFunction
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-line-profiler.unregisterFunction",
      unregisterFunction
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-line-profiler.runScript", runScript)
  );

  vscode.window.onDidChangeVisibleTextEditors(loadProfiles);

  await loadProfiles(vscode.window.visibleTextEditors);
}

// this method is called when your extension is deactivated
export async function deactivate() {
  for (let childController of childControllers) {
    childController.abort();
  }
}
