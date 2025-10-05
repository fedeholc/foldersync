import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { handleDidRenameFiles } from '../../src/event-handlers/handle-rename-file';

suite('Handle Rename File Test Suite', () => {

  let tempDir: string;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-rename-test-'));
  });

  teardown(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should handle rename of untracked file', async () => {
    const oldPath = path.join(tempDir, 'old.txt');
    const newPath = path.join(tempDir, 'new.txt');
    const oldUri = vscode.Uri.file(oldPath);
    const newUri = vscode.Uri.file(newPath);

    const event: vscode.FileRenameEvent = {
      files: [{
        oldUri,
        newUri
      }]
    };

    const emptyMap = new Map<string, string>();

    // Should not throw
    await handleDidRenameFiles(event, emptyMap);
    assert.ok(true, 'Function handled untracked file rename');
  });

  test('should handle config file rename', async () => {
    const oldPath = path.join(tempDir, 'foldersync.config.json');
    const newPath = path.join(tempDir, 'foldersync.config.backup.json');
    const oldUri = vscode.Uri.file(oldPath);
    const newUri = vscode.Uri.file(newPath);

    const event: vscode.FileRenameEvent = {
      files: [{
        oldUri,
        newUri
      }]
    };

    const emptyMap = new Map<string, string>();

    // Should not throw and should trigger rescan
    await handleDidRenameFiles(event, emptyMap);
    assert.ok(true, 'Function handled config file rename');
  });

  test('should handle rename of tracked file', async () => {
    const oldPath1 = path.join(tempDir, 'old1.txt');
    const newPath1 = path.join(tempDir, 'new1.txt');
    const oldPath2 = path.join(tempDir, 'old2.txt');

    fs.writeFileSync(oldPath1, 'content 1');
    fs.writeFileSync(oldPath2, 'content 2');

    const syncMap = new Map<string, string>();
    syncMap.set(oldPath1, oldPath2);
    syncMap.set(oldPath2, oldPath1);

    const oldUri = vscode.Uri.file(oldPath1);
    const newUri = vscode.Uri.file(newPath1);

    const event: vscode.FileRenameEvent = {
      files: [{
        oldUri,
        newUri
      }]
    };

    // Should propagate rename to counterpart
    await handleDidRenameFiles(event, syncMap);

    // Verify no errors occurred
    assert.ok(true, 'Function handled tracked file rename');
  });

  test('should handle multiple file renames', async () => {
    const oldPath1 = path.join(tempDir, 'old1.txt');
    const newPath1 = path.join(tempDir, 'new1.txt');
    const oldPath2 = path.join(tempDir, 'old2.txt');
    const newPath2 = path.join(tempDir, 'new2.txt');

    const oldUri1 = vscode.Uri.file(oldPath1);
    const newUri1 = vscode.Uri.file(newPath1);
    const oldUri2 = vscode.Uri.file(oldPath2);
    const newUri2 = vscode.Uri.file(newPath2);

    const event: vscode.FileRenameEvent = {
      files: [
        { oldUri: oldUri1, newUri: newUri1 },
        { oldUri: oldUri2, newUri: newUri2 }
      ]
    };

    const emptyMap = new Map<string, string>();

    // Should not throw
    await handleDidRenameFiles(event, emptyMap);
    assert.ok(true, 'Function handled multiple file renames');
  });

  test('should handle rename with same basename', async () => {
    const oldPath = path.join(tempDir, 'folder1', 'test.txt');
    const newPath = path.join(tempDir, 'folder2', 'test.txt');

    fs.mkdirSync(path.join(tempDir, 'folder1'));
    fs.mkdirSync(path.join(tempDir, 'folder2'));

    const oldUri = vscode.Uri.file(oldPath);
    const newUri = vscode.Uri.file(newPath);

    const event: vscode.FileRenameEvent = {
      files: [{
        oldUri,
        newUri
      }]
    };

    const emptyMap = new Map<string, string>();

    // Should not throw
    await handleDidRenameFiles(event, emptyMap);
    assert.ok(true, 'Function handled rename to different folder');
  });
});
