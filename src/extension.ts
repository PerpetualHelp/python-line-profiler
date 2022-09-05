import fetch from "node-fetch";
import { spawn } from "child_process";
import * as vscode from "vscode";
import { IProposedExtensionAPI } from "./dependencies/vscode-python";

let pyProcess;
var decorations: vscode.TextEditorDecorationType[] = [];
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

  console.debug(
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
    console.debug(`${prefix}: ${JSON.stringify(data)}`);
  }
}

async function registerScript(fileUri: vscode.Uri) {
  const prefix = `${extName}.registerScript`;
  console.info(`${prefix}: Running...`);
  console.debug(`${prefix}: ${JSON.stringify({ fileUri: fileUri.fsPath })}`);

  const response = await fetch(
    `http://127.0.0.1:9001/script/register?fileUri=${fileUri.fsPath}`,
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

async function unregisterScript(fileUri: vscode.Uri) {
  const prefix = `${extName}.unregisterScript`;
  console.info(`${prefix}: Running...`);
  console.debug(`${prefix}: ${JSON.stringify({ fileUri: fileUri.fsPath })}`);

  const response = await fetch(
    `http://127.0.0.1:9001/script/unregister?fileUri=${fileUri.fsPath}`,
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

async function runAllScripts() {
  const prefix = `${extName}.runAllScripts`;
  console.info(`${prefix}: Running...`);

  const response = await fetch(`http://127.0.0.1:9001/run/all`, {
    method: "POST",
    headers: { contentType: "application/json" },
  });

  if (response.status !== 202) {
    console.error(`${prefix}: Response status - ${await response.status}`);
    console.error(`${prefix}: There was an error. ${await response.text()}`);
  } else {
    const data = await response.json();
    console.debug(`${prefix}: ${JSON.stringify(data)}`);
  }

  await loadProfiles(vscode.window.visibleTextEditors);
}

async function loadProfiles(editors: readonly vscode.TextEditor[]) {
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
      let decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(255,255,0,0.1)",
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
      let decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(100,0,0,${line[1]})`,
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

export async function activate(context: vscode.ExtensionContext) {
  const prefix = `${extName}.activate`;
  console.info(`${prefix}: Running...`);

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

    // api.environment.onDidActiveEnvironmentChanged((listener) => {
    //   this.pydoctestAnalyzer.configuration.pythonInterpreterPath =
    //     listener.path;
    // });

    pyProcess = spawn(pyEnv, [context.extensionPath + "/out/extension.py"]);
    pyProcess.stderr.on("data", (data) => {
      let mes = data.toString().trim();
      console.error(mes);
    });
    pyProcess.stdout.on("data", (data) => {
      let mes = data.toString().trim();
      console.log(mes);
    });
  } else {
    console.log(`${prefix}: ms-python is not installed. Aborting activation.`);
  }

  if (vscode.workspace.workspaceFolders) {
    let fileUri = vscode.workspace.workspaceFolders[0].uri;
    try {
      // TODO: This should be updated. This just waits 2 seconds for the backend to startup.
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
    vscode.commands.registerCommand(
      "vscode-line-profiler.registerScript",
      registerScript
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-line-profiler.unregisterScript",
      unregisterScript
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-line-profiler.runAllScripts",
      () => {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Python Line Profiler: Running profile...",
            cancellable: false,
          },
          runAllScripts
        );
      }
    )
  );

  vscode.window.onDidChangeVisibleTextEditors(loadProfiles);

  await loadProfiles(vscode.window.visibleTextEditors);
}

// this method is called when your extension is deactivated
export async function deactivate() {}
