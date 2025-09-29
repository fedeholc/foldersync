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

	// Register tree view provider and create a TreeView so we can react to visibility changes
	syncTreeProvider = new SyncTreeProvider(allFilesToSync);
	const treeView = vscode.window.createTreeView('filesync.syncView', { treeDataProvider: syncTreeProvider });
	context.subscriptions.push(treeView);

	// Register command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.refreshView', () => syncTreeProvider?.refresh()));

	// Register command to reveal the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.revealView', async () => {
		await vscode.commands.executeCommand('workbench.view.explorer');
		// optionally focus selection
	}));

	// When the tree view becomes visible (user clicks the Activity Bar icon), open the webview panel as well
	const visibilityDisposable = treeView.onDidChangeVisibility((e) => {
		if (e.visible) {
			const syncPanel = SyncPanel.createOrShow(context);
			syncPanel.update(allFilesToSync);
		}
	});
	context.subscriptions.push(visibilityDisposable);

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

	const saveNewFileListener = vscode.workspace.onDidCreateFiles(async (event) => {
		// Check if any of the created files is a config file
		if (event.files.some(file => file.path.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || file.path.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`))) {
			output.appendLine('Detected creation of a new config file. Re-running startup tasks...');
			await runStartupTasks(output);
			if (SyncPanel.currentPanel) {
				SyncPanel.currentPanel.update(allFilesToSync);
			}
			// Update tree provider when files change
			syncTreeProvider?.setPairs(allFilesToSync);
		}

		// Check if any of the created files is a workspace settings file
		if (event.files.some(file => file.path.endsWith('.code-workspace'))) {
			output.appendLine('Detected creation of a new workspace settings file. Re-running startup tasks...');
			await runStartupTasks(output);
			if (SyncPanel.currentPanel) {
				SyncPanel.currentPanel.update(allFilesToSync);
			}
			// Update tree provider when files change
			syncTreeProvider?.setPairs(allFilesToSync);
		}

		// check if any of the created files is in a folder that is being synced
		const foldersToSync = allFilesToSync.map(pair => pair[0].substring(0, pair[0].lastIndexOf('/')));
		if (event.files.some(file => foldersToSync.some(folder => file.path.startsWith(folder)))) {
			output.appendLine('Detected creation of a new file in a synced folder. Re-running startup tasks...');
			await runStartupTasks(output);
			if (SyncPanel.currentPanel) {
				SyncPanel.currentPanel.update(allFilesToSync);
			}
			// Update tree provider when files change
			syncTreeProvider?.setPairs(allFilesToSync);
		}
	});
	context.subscriptions.push(saveNewFileListener);


	// Register command to show the sync panel
	const panelDisposable = vscode.commands.registerCommand('filesync.showSyncPanel', async () => {
		const syncPanel = SyncPanel.createOrShow(context);
		syncPanel.update(allFilesToSync);
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


export async function runStartupTasks(output: vscode.OutputChannel) {

	output.appendLine('Running startup tasks...');
	allFilesToSync = await getFilesToSyncFromWorkspaceSettings(output) || [];

	const filesFromConfig = await getFilesToSyncFromConfigFiles(output);
	if (filesFromConfig) {
		allFilesToSync.push(...filesFromConfig);
	}

}
