import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { normalizeFolders, getNormalizedFilesAndFsTreeFromFolders } from '../../src/helpers/helpers';
import { FsTreeElement } from '../../src/types/types';

suite('Tree IDs uniqueness', () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-tree-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('pair children across different folder pairs have unique ids', async () => {
    // Create two folder pairs under temporary directories
    const folderA1 = path.join(tempDir, 'a1');
    const folderB1 = path.join(tempDir, 'b1');
    const folderA2 = path.join(tempDir, 'a2');
    const folderB2 = path.join(tempDir, 'b2');

    fs.mkdirSync(folderA1, { recursive: true });
    fs.mkdirSync(folderB1, { recursive: true });
    fs.mkdirSync(folderA2, { recursive: true });
    fs.mkdirSync(folderB2, { recursive: true });

    // Create same relative file in both pairs
    const rel = 'src/index.ts';
    const file1 = path.join(folderA1, rel);
    const file2 = path.join(folderB1, rel);
    const file3 = path.join(folderA2, rel);
    const file4 = path.join(folderB2, rel);

    fs.mkdirSync(path.dirname(file1), { recursive: true });
    fs.mkdirSync(path.dirname(file2), { recursive: true });
    fs.mkdirSync(path.dirname(file3), { recursive: true });
    fs.mkdirSync(path.dirname(file4), { recursive: true });

    fs.writeFileSync(file1, 'console.log(1);');
    fs.writeFileSync(file2, 'console.log(2);');
    fs.writeFileSync(file3, 'console.log(3);');
    fs.writeFileSync(file4, 'console.log(4);');

    // Build normalized folders array
    const folders: [string, string][] = [[folderA1, folderB1], [folderA2, folderB2]];

    // call the exported internal function to generate fsTree
    const { normalizedFiles, fsTree } = await getNormalizedFilesAndFsTreeFromFolders(folders as any, { appendLine: () => { } } as any);

    // Collect all pair child ids
    const collectIds = (nodes: FsTreeElement[]): string[] => {
      const ids: string[] = [];
      for (const n of nodes) {
        if (n.id) { ids.push(n.id); }
        if (n.children) { ids.push(...collectIds(n.children)); }
      }
      return ids;
    };

    const ids = collectIds(fsTree as FsTreeElement[]);

    // Ensure there are ids and they are unique
    assert.ok(ids.length > 0, 'No ids found in generated tree');
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, `Found duplicate ids: ${ids.join(',')}`);
  });
});
