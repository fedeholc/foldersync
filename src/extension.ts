import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from './types';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspaceSettings, handleOnDidSaveTextDocument, normalizeFilesToSync } from './helpers';
import { SyncPanel } from './panel';
import { SyncTreeProvider } from './syncTree';

let allFilesToSync: SettingsFilesToSync = [];
let syncTreeProvider: SyncTreeProvider | null = null;


export async function activate(context: vscode.ExtensionContext) {
	// Use an OutputChannel for non-intrusive logging
	const output = vscode.window.createOutputChannel(APP_NAME);
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Register tree view provider in the explorer view
	syncTreeProvider = new SyncTreeProvider(allFilesToSync);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('filesync.syncView', syncTreeProvider));

	// Register command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.refreshView', () => syncTreeProvider?.refresh()));

	// Register command to reveal the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.revealView', async () => {
		await vscode.commands.executeCommand('workbench.view.explorer');
		// optionally focus selection
	}));

	// Listen for file save events and update panel when appropriate
	const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
		await handleOnDidSaveTextDocument(document, output, allFilesToSync);
		if (SyncPanel.currentPanel) {
			SyncPanel.currentPanel.update(allFilesToSync);
		}
		// Update tree provider when files change
		syncTreeProvider?.setPairs(allFilesToSync);
	});
	context.subscriptions.push(saveListener);

	// Register existing helloWorld command
	const disposable = vscode.commands.registerCommand('filesync.helloWorld', async () => {
		vscode.window.showInformationMessage('Hello World from filesync!');
	});
	context.subscriptions.push(disposable);

	// Register command to show the sync panel
	const panelDisposable = vscode.commands.registerCommand('filesync.showSyncPanel', async () => {
		const panel = SyncPanel.createOrShow(context);
		panel.update(allFilesToSync);
	});
	context.subscriptions.push(panelDisposable);

	// If the panel is open, update it with current data
	if (SyncPanel.currentPanel) {
		SyncPanel.currentPanel.update(allFilesToSync);
	}

	// Update tree provider after startup tasks resolved
	syncTreeProvider?.setPairs(allFilesToSync);
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
