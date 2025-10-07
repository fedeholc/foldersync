import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { initialSyncLatest } from '../../src/event-handlers/initial-sync';

suite('Initial Sync Test Suite', () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-initialsync-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should skip creating missing destination directory (only A exists)', async () => {
    const folderA = path.join(tempDir, 'a');
    const folderB = path.join(tempDir, 'b'); // will not create
    fs.mkdirSync(folderA);
    const fileA = path.join(folderA, 'file.txt');
    fs.writeFileSync(fileA, 'content A');

    const map = new Map<string, string>();
    const fileB = path.join(folderB, 'file.txt');
    map.set(fileA, fileB); // logical pair
    map.set(fileB, fileA);

    await initialSyncLatest(map);

    assert.ok(!fs.existsSync(folderB), 'Destination folder should not be created');
  });

  test('should skip when updating older file if target directory missing', async () => {
    const folderA = path.join(tempDir, 'a');
    const folderB = path.join(tempDir, 'b');
    fs.mkdirSync(folderA);
    fs.mkdirSync(folderB);

    const fileOld = path.join(folderA, 'old.txt');
    const fileNew = path.join(folderB, 'old.txt');
    fs.writeFileSync(fileOld, 'old');
    fs.writeFileSync(fileNew, 'newer');

    // Remove folderA to simulate missing target directory for copy back
    fs.rmSync(folderA, { recursive: true, force: true });

    const map = new Map<string, string>();
    map.set(fileOld, fileNew);
    map.set(fileNew, fileOld);

    await initialSyncLatest(map);

    // Since folderA is gone, no recreation and no fileOld should exist
    assert.ok(!fs.existsSync(fileOld));
  });
});
