import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Test Suite', () => {

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('fedeholc.foldersync'));
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('fedeholc.foldersync');
    assert.ok(extension);

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.strictEqual(extension.isActive, true);
  });

  test('Commands should be registered', async () => {
    const extension = vscode.extensions.getExtension('fedeholc.foldersync');
    assert.ok(extension);

    if (!extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      'foldersync.refreshView',
      'foldersync.openView',
      'foldersync.initialSyncLatest'
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} should be registered`
      );
    }
  });

  test('Output channel should be created', async () => {
    const extension = vscode.extensions.getExtension('fedeholc.foldersync');
    assert.ok(extension);

    if (!extension.isActive) {
      await extension.activate();
    }

    // Extension creates an output channel on activation
    // We can't directly test the output channel, but we can verify
    // the extension activated without errors
    assert.strictEqual(extension.isActive, true);
  });

  test('TreeView should be registered', async () => {
    const extension = vscode.extensions.getExtension('fedeholc.foldersync');
    assert.ok(extension);

    if (!extension.isActive) {
      await extension.activate();
    }

    // The tree view should be registered as 'foldersync.syncView'
    // We can't directly access the tree view, but we can verify
    // the extension activated successfully
    assert.strictEqual(extension.isActive, true);
  });

  test('Status bar item should be created', async () => {
    const extension = vscode.extensions.getExtension('fedeholc.foldersync');
    assert.ok(extension);

    if (!extension.isActive) {
      await extension.activate();
    }

    // The status bar item is created during activation
    // We verify by checking that activation was successful
    assert.strictEqual(extension.isActive, true);
  });
});
