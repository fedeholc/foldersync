import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { handleDidCreateFiles } from '../../src/event-handlers/handle-create-file';

suite('Handle Create File Test Suite', () => {

  let tempDir: string;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-create-test-'));
  });

  teardown(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should detect config file creation', async () => {
    const configPath = path.join(tempDir, 'foldersync.config.json');
    const uri = vscode.Uri.file(configPath);

    const event: vscode.FileCreateEvent = {
      files: [uri]
    };

    // Should not throw
    await handleDidCreateFiles(event);
    assert.ok(true, 'Function handled config file creation');
  });

  test('should detect workspace file creation', async () => {
    const workspacePath = path.join(tempDir, 'test.code-workspace');
    const uri = vscode.Uri.file(workspacePath);

    const event: vscode.FileCreateEvent = {
      files: [uri]
    };

    // Should not throw
    await handleDidCreateFiles(event);
    assert.ok(true, 'Function handled workspace file creation');
  });

  test('should handle multiple file creation', async () => {
    const file1Path = path.join(tempDir, 'file1.txt');
    const file2Path = path.join(tempDir, 'file2.txt');
    const uri1 = vscode.Uri.file(file1Path);
    const uri2 = vscode.Uri.file(file2Path);

    const event: vscode.FileCreateEvent = {
      files: [uri1, uri2]
    };

    // Should not throw
    await handleDidCreateFiles(event);
    assert.ok(true, 'Function handled multiple file creation');
  });

  test('should handle empty file creation event', async () => {
    const event: vscode.FileCreateEvent = {
      files: []
    };

    // Should not throw
    await handleDidCreateFiles(event);
    assert.ok(true, 'Function handled empty event');
  });
});
