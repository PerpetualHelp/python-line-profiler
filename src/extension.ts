// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import fetch from 'node-fetch';

import * as vscode from 'vscode';

async function registerFunction() {
	let selection = vscode.window.activeTextEditor?.selection;
	var text = vscode.window.activeTextEditor?.document.getText(selection);
	var fileUri = vscode.window.activeTextEditor?.document.fileName;
	vscode.window.showInformationMessage(`Registering function: ${String(fileUri)} - ${String(text)}`);

	console.log(`registerFunction.fileUri: ${JSON.stringify({'fileUri': String(fileUri)})}`);
	
	const params = new URLSearchParams();
	params.append('fileUri', String(fileUri));
	
	const response = await fetch(`http://127.0.0.1:9001/function/register?fileUri=${String(fileUri)}&function=${text}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	console.log(`registerFunction: ${JSON.stringify(data)}`);
}

async function unregisterFunction() {
	let selection = vscode.window.activeTextEditor?.selection;
	var text = vscode.window.activeTextEditor?.document.getText(selection);
	var fileUri = vscode.window.activeTextEditor?.document.fileName;
	vscode.window.showInformationMessage(`Registering function: ${String(fileUri)} - ${String(text)}`);

	console.log(`unregisterFunction.fileUri: ${JSON.stringify({'fileUri': String(fileUri)})}`);
	
	const params = new URLSearchParams();
	params.append('fileUri', String(fileUri));
	
	const response = await fetch(`http://127.0.0.1:9001/function/unregister?fileUri=${String(fileUri)}&function=${text}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	console.log(`unregisterFunction: ${JSON.stringify(data)}`);
}

async function registerScript(fileUri: vscode.Uri) {
	vscode.window.showInformationMessage(`Registering script: ${fileUri.fsPath}`);
	console.log(`registerScript.fileUri: ${JSON.stringify({'fileUri': fileUri.fsPath})}`);
	
	const params = new URLSearchParams();
	params.append('fileUri', fileUri.fsPath);
	
	const response = await fetch(`http://127.0.0.1:9001/script/register?fileUri=${fileUri.fsPath}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	console.log(`registerScript: ${JSON.stringify(data)}`);

	// if (~response.ok) {
	// 	vscode.window.showErrorMessage("There was an error registering the script.");
	// 	console.log(response.)
	// }

	// vscode.window.showInformationMessage(`Registered!`);
}

async function unregisterScript(fileUri: vscode.Uri) {
	vscode.window.showInformationMessage(`Registering script: ${fileUri.fsPath}`);
	console.log(`registerScript.fileUri: ${JSON.stringify({'fileUri': fileUri.fsPath})}`);
	
	const params = new URLSearchParams();
	params.append('fileUri', fileUri.fsPath);
	
	const response = await fetch(`http://127.0.0.1:9001/script/unregister?fileUri=${fileUri.fsPath}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	console.log(`registerScript: ${JSON.stringify(data)}`);

	// if (~response.ok) {
	// 	vscode.window.showErrorMessage("There was an error registering the script.");
	// 	console.log(response.)
	// }

	// vscode.window.showInformationMessage(`Registered!`);
}

async function runAllScripts() {
	
	const response = await fetch(`http://127.0.0.1:9001/run/all`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	console.log(`registerScript: ${JSON.stringify(data)}`);

	// if (~response.ok) {
	// 	vscode.window.showErrorMessage("There was an error registering the script.");
	// 	console.log(response.)
	// }

	// vscode.window.showInformationMessage(`Registered!`);
}

async function loadProfiles(editors: readonly vscode.TextEditor[]) {

	if (editors.length === 0) {
		return;
	}

	let editor = editors[0];
	let fileUri = editor.document.uri;
	
	const response = await fetch(`http://127.0.0.1:9001/function/profile?fileUri=${fileUri.fsPath}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}
	});
	const data = await response.json();

	let functionDecorations: vscode.DecorationOptions[] = [];

	console.log(`loadProfiles: ${JSON.stringify(data)}`);

	const functionDecoratorType = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255,255,0,0.1)',
		isWholeLine: true
	});

	for (let line of data) {
		let range = new vscode.Range(new vscode.Position(line[0]-1,0),new vscode.Position(line[0]-1,88));
		let hoverMessage = line[2];
		if (line[1] === null) {
			functionDecorations.push({range,hoverMessage});
			editor.setDecorations(functionDecoratorType,functionDecorations);
		} else {
			console.log(`rgba(0,0,255,${line[1].toFixed(1)}`);
			editor.setDecorations(vscode.window.createTextEditorDecorationType({
				backgroundColor: `rgba(100,0,0,${line[1]})`,
				isWholeLine: true,
			}),[{
				range,
				hoverMessage,
				renderOptions: {
					after: {
						contentText: "(" + hoverMessage + ")",
						color: "rgba(255,255,255,0.4)",
						margin: "0px 0px 0px 25px"
					}
			  }}]);
		}
	}

	// if (~response.ok) {
	// 	vscode.window.showErrorMessage("There was an error registering the script.");
	// 	console.log(response.)
	// }

	// vscode.window.showInformationMessage(`Registered!`);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('vscode-line-profiler: activating...');

	if (vscode.workspace.workspaceFolders) {
		let fileUri = vscode.workspace.workspaceFolders[0].uri;
		const response = await fetch(`http://127.0.0.1:9001/config/path?fileUri=${fileUri.fsPath}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'}
		});
		const data = await response.json();
		console.log(`vscode-line-proviler: Setting config path - ${JSON.stringify(data)}`);
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-line-profiler.registerFunction', registerFunction)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-line-profiler.unregisterFunction', unregisterFunction)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-line-profiler.registerScript', registerScript)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-line-profiler.unregisterScript', unregisterScript)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-line-profiler.runAllScripts', runAllScripts)
	);

	vscode.window.onDidChangeVisibleTextEditors(loadProfiles);
}

// this method is called when your extension is deactivated
export async function deactivate() {}
