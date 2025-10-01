import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from './types';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspaceSettings, handleDidCreateFiles, handleOnDidSaveTextDocument, normalizeFilesToSync } from './helpers';
import { SyncPanel } from './panel';
import {FsTreeProvider, SyncTreeProvider } from './syncTree';

export let allFilesToSync: SettingsFilesToSync = [];
export let syncTreeProvider: SyncTreeProvider | null = null;
export let fsTree: fsTreeElement[] = [];
export let fsTreeProvider: FsTreeProvider | null = null;

export const output = vscode.window.createOutputChannel(APP_NAME);

export async function activate(context: vscode.ExtensionContext) {
	// Use an OutputChannel for non-intrusive logging
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Register tree view provider and create a TreeView so we can react to visibility changes
	//syncTreeProvider = new SyncTreeProvider(allFilesToSync);
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

	const saveNewFileListener = vscode.workspace.onDidCreateFiles(handleDidCreateFiles);
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
	let { allFilesToSync, fsTree } = await getFilesToSyncFromWorkspaceSettings(output);

	output.appendLine(`fstree to sync from workspace settings: ${JSON.stringify(fsTree)}`);

	//VER aún no estoy trayendo el configFsTree de getFilesToSyncFromConfigFiles
	// estoy armando el fstree a continuación, pero en algún momento voy a tener que hacerlo dentro para poder dividir por config files también
	const { allFilesToSync: filesFromConfig, fsTree: configFsTree } = await getFilesToSyncFromConfigFiles(output);
	if (filesFromConfig) {
		allFilesToSync.push(...filesFromConfig);
	}
	const fsTreeFromConfig: fsTreeElement = {
		name: 'from config files',
		type: 'container',
		children: filesFromConfig.map(pair => ({ name: `${pair[0]} <-> ${pair[1]}`, type: 'pair' }))
	};
	fsTree.push(fsTreeFromConfig);

	output.appendLine(`fstree fstree final: ${JSON.stringify(fsTree)}`);

}

export type fsTreeElement = {
	name: string;
	type: 'pair' | 'container';
	children?: fsTreeElement[];
};