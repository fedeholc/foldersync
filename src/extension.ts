import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from './types';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspaceSettings, handleDidCreateFiles, handleOnDidSaveTextDocument, normalizeFilesToSync } from './helpers';
import { FsTreeProvider, } from './syncTree';
import { config } from 'node:process';

export let allFilesToSync: SettingsFilesToSync = [];
export let fsTree: fsTreeElement[] = [];
export let fsTreeProvider: FsTreeProvider | null = null;

export const output = vscode.window.createOutputChannel(APP_NAME);

export async function activate(context: vscode.ExtensionContext) {

	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Register tree view provider and create a TreeView so we can react to visibility changes

	fsTreeProvider = new FsTreeProvider(fsTree);
	const treeView = vscode.window.createTreeView('filesync.syncView', { treeDataProvider: fsTreeProvider });
	context.subscriptions.push(treeView);

	// Register command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.refreshView', () => fsTreeProvider?.refresh()));

	// Register command to reveal the tree view
	context.subscriptions.push(vscode.commands.registerCommand('filesync.revealView', async () => {
		await vscode.commands.executeCommand('workbench.view.explorer');
	}));



	// Listen for file save events
	const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {

		// main logic to handle file save
		await handleOnDidSaveTextDocument(document, output, allFilesToSync);


		// Update tree provider
		fsTreeProvider?.setTree(fsTree);
	});
	context.subscriptions.push(saveListener);

	// Listen for new file creation events
	const saveNewFileListener = vscode.workspace.onDidCreateFiles(handleDidCreateFiles);
	context.subscriptions.push(saveNewFileListener);


	// Update tree provider after startup tasks resolved
	fsTreeProvider?.setTree(fsTree);
	output.appendLine(`\n\n\n\nfsTree	post task: ${JSON.stringify(fsTree)}`);
}

// This method is called when your extension is deactivated
export function deactivate() { }


export async function runStartupTasks(output: vscode.OutputChannel) {

	output.appendLine('Running startup tasks...');
	({ allFilesToSync, fsTree } = await getFilesToSyncFromWorkspaceSettings(output));

	output.appendLine(`fstree to sync from workspace settings: ${JSON.stringify(fsTree)}`);


	//TODO: hay que hacer que cuando busca las folders si no existe no las excluya, sino que las incluya pero ver cómo, para mostrar el error.
	const { allFilesToSync: filesFromConfig, fsTree: configFsTree } = await getFilesToSyncFromConfigFiles(output);
	output.appendLine(`fstree to sync from config files: ${JSON.stringify(configFsTree)}`);
	if (filesFromConfig) {
		allFilesToSync.push(...filesFromConfig);
	}

	if (configFsTree) {
		fsTree.push(configFsTree);
	}
	output.appendLine(`\n\nfstree fstree final: ${JSON.stringify(fsTree)}`);

	fsTreeProvider?.setTree(fsTree);
}

export type fsTreeElement = {
	name: string;
	type: 'pair' | 'container' | "folder" | 'folder-error';
	children?: fsTreeElement[];
};