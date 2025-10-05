// Simple shared flag to avoid reacting to file operations we trigger ourselves
export let internalFileOperation = false;

export function runAsInternal<T>(fn: () => Promise<T>): Promise<T> {
  internalFileOperation = true;
  return fn().finally(() => { internalFileOperation = false; });
}
