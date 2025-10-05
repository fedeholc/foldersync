import * as vscode from 'vscode';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspaceSettings, handleDidCreateFiles, handleOnDidSaveTextDocument } from './helpers';
import { FsTreeProvider, } from './syncTree';
import { APP_NAME, FsTreeElement, FilePairArray } from './types';

// TODO probar usar un Map en lugar de un array para allFilesToSync para evitar duplicados y para mejorar performance en búsquedas

export type FilePairMap = Map<string, string>;
export let allFilesToSync: FilePairMap = new Map();
export let fsTree: FsTreeElement[] = [];
export let fsTreeProvider: FsTreeProvider | null = null;


export const output = vscode.window.createOutputChannel(APP_NAME);

export async function activate(context: vscode.ExtensionContext) {

	output.appendLine('foldersync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Register tree view provider and create a TreeView so we can react to visibility changes

	fsTreeProvider = new FsTreeProvider(fsTree);
	const treeView = vscode.window.createTreeView('foldersync.syncView', { treeDataProvider: fsTreeProvider });
	context.subscriptions.push(treeView);

	// Register command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('foldersync.refreshView', () => fsTreeProvider?.refresh()));

	// Register command to reveal the tree view
	context.subscriptions.push(vscode.commands.registerCommand('foldersync.revealView', async () => {
		await vscode.commands.executeCommand('workbench.view.explorer');
	}));



	// Listen for file save events
	const saveListener = vscode.workspace.onDidSaveTextDocument((document) => handleOnDidSaveTextDocument(document, allFilesToSync));
	context.subscriptions.push(saveListener);

	// Listen for new file creation events
	const saveNewFileListener = vscode.workspace.onDidCreateFiles(handleDidCreateFiles);
	context.subscriptions.push(saveNewFileListener);


	// Update tree provider after startup tasks resolved
	fsTreeProvider?.setTree(fsTree);
}

// This method is called when your extension is deactivated
export function deactivate() { }


export async function runStartupTasks(output: vscode.OutputChannel) {

	output.appendLine('Running startup tasks...');
	const { allFilesToSync: filesFromWorkspace, fsTree: workspaceFsTree } = await getFilesToSyncFromWorkspaceSettings(output);



	if (workspaceFsTree) {
		fsTree.push(workspaceFsTree);
	}


	//TODO: hay que hacer que cuando busca las folders si no existe no las excluya, sino que las incluya pero ver cómo, para mostrar el error.
	const { allFilesToSync: filesFromConfig, fsTree: configFsTree } = await getFilesToSyncFromConfigFiles(output);


	if (configFsTree) {
		fsTree.push(configFsTree);
	}

	allFilesToSync = new Map<string, string>([...filesFromWorkspace, ...filesFromConfig]);
	output.appendLine(`Total files to sync: ${allFilesToSync.size}`);
	fsTreeProvider?.setTree(fsTree);
}

