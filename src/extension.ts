// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed


const APP_NAME = 'filesync' as const;

const SETTINGS_NAMES = {
	globalEnabled: 'globalEnabled',
	filesToSync: 'filesToSync'
} as const;

const DEFAULT_CONFIG_FILE_NAME = 'filesync.config.json' as const;

type SettingsFilesToSync = [string, string][];
type Settings = {
	[SETTINGS_NAMES.globalEnabled]: boolean;
	[SETTINGS_NAMES.filesToSync]: SettingsFilesToSync;
}

export function activate(context: vscode.ExtensionContext) {


	// Use an OutputChannel for non-intrusive logging
	const output = vscode.window.createOutputChannel(APP_NAME);
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	runStartupTasks(output);

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
	const workspaceFolders = vscode.workspace.workspaceFolders;

	const filesToSyncFromWorkspace: SettingsFilesToSync = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.filesToSync) || [];

	output.appendLine(`Workspace Configuration filesToSync: ${JSON.stringify(filesToSyncFromWorkspace)}`);

	filesToSyncFromWorkspace?.forEach((file) => {
		output.appendLine(`Syncing file: ${file[0]} with ${file[1]}`);
	});

	const configFileName = DEFAULT_CONFIG_FILE_NAME;

	if (workspaceFolders && workspaceFolders.length > 0) {
		output.appendLine(`Workspace folders: ${JSON.stringify(workspaceFolders)}`);

		let filesToSyncFromConfigFiles: SettingsFilesToSync = [];


		for (const folder of workspaceFolders) {
			const folderUri = folder.uri;
			const fileUri = vscode.Uri.joinPath(folderUri, configFileName);

			try {
				const data = await vscode.workspace.fs.readFile(fileUri);

				const json = JSON.parse(data.toString());
				output.appendLine(`Read from ${configFileName} in folder ${folder.name}: ${JSON.stringify(json)}`);
				if (Array.isArray(json.filesToSync)) {
					filesToSyncFromConfigFiles.push(...json.filesToSync);
				}
			} catch (err) {
				output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
			}
		};

		output.appendLine(`Final accumulated filesToSync from config files: ${JSON.stringify(filesToSyncFromConfigFiles)}`);

		const allFilesToSync = [...filesToSyncFromWorkspace, ...filesToSyncFromConfigFiles];
		output.appendLine(`All files to sync: ${JSON.stringify(allFilesToSync)}`);
		// Additionally, read from the

		/* 	const folderUri = workspaceFolders[0].uri;
			const fileUri = vscode.Uri.joinPath(folderUri, configFileName);
			vscode.workspace.fs.readFile(fileUri).then((data) => {
				const json = JSON.parse(data.toString());
				output.appendLine(`Read from ${configFileName}: ${JSON.stringify(json)}`);
			}, (err) => {
				output.appendLine(`Error reading ${configFileName}: ${err}`);
			}); */
	} else {
		output.appendLine('No workspace folder open');
	}
}
