import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from './types';
import { getFilesToSyncFromWorkspaceSettings, handleOnDidSaveTextDocument, normalizeFilesToSync } from './helpers';

let allFilesToSync: SettingsFilesToSync = [];



export async function activate(context: vscode.ExtensionContext) {
	// Use an OutputChannel for non-intrusive logging
	const output = vscode.window.createOutputChannel(APP_NAME);
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);


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


export async function getFilesToSyncFromConfigFiles(output: vscode.OutputChannel): Promise<SettingsFilesToSync | null> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const configFileName = DEFAULT_CONFIG_FILE_NAME;
	const normalizedFilesToSync: SettingsFilesToSync = [];
	if (workspaceFolders && workspaceFolders.length > 0) {

		for (const folder of workspaceFolders) {
			const folderUri = folder.uri;
			const fileUri = vscode.Uri.joinPath(folderUri, configFileName);

			try {
				const jsonFileData = await vscode.workspace.fs.readFile(fileUri);

				const fileData = JSON.parse(jsonFileData.toString());

				let filesToSync: SettingsFilesToSync = [];

				if (Array.isArray(fileData.filesToSync)) {
					filesToSync = fileData.filesToSync;
				}

				// normalize and add to allFilesToSync
				normalizedFilesToSync.push(...normalizeFilesToSync(fileData.filesToSync, fileUri));
			} catch (err) {
				output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
			}
		};
		return normalizedFilesToSync;



	} else {
		output.appendLine('No workspace folder open');
		return null;
	}
}

async function runStartupTasks(output: vscode.OutputChannel) {

	allFilesToSync = await getFilesToSyncFromWorkspaceSettings() || [];

	const filesFromConfig = await getFilesToSyncFromConfigFiles(output);
	if (filesFromConfig) {
		allFilesToSync.push(...filesFromConfig);
	}

}
