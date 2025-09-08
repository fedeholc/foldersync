import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from './types';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspaceSettings, handleOnDidSaveTextDocument, normalizeFilesToSync } from './helpers';

let allFilesToSync: SettingsFilesToSync = [];


export async function activate(context: vscode.ExtensionContext) {
	// Use an OutputChannel for non-intrusive logging
	const output = vscode.window.createOutputChannel(APP_NAME);
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Listen for file save events
	const saveListener = vscode.workspace.onDidSaveTextDocument((document) => handleOnDidSaveTextDocument(document, output, allFilesToSync));
	context.subscriptions.push(saveListener);

	// Register the command as before
	const disposable = vscode.commands.registerCommand('filesync.helloWorld', async () => {
		vscode.window.showInformationMessage('Hello World from filesync!');
		//runStartupTasks(output);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }




async function runStartupTasks(output: vscode.OutputChannel) {

	allFilesToSync = await getFilesToSyncFromWorkspaceSettings() || [];

	const filesFromConfig = await getFilesToSyncFromConfigFiles(output);
	if (filesFromConfig) {
		allFilesToSync.push(...filesFromConfig);
	}

}
