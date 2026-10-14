import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
export const localUrl = process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5173/';
export function artifact(name) {
  const directory = resolve(process.env.FRANKENTOWER_ARTIFACT_DIR ?? 'test-results');
  const path = join(directory, name);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
export async function launchBrowser() {
  const executablePath = process.env.FRANKENTOWER_BROWSER_EXECUTABLE;
  const channel = process.env.FRANKENTOWER_BROWSER_CHANNEL;
  if (executablePath && channel)
    throw new Error('Select either a browser executable or channel, not both.');
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : channel ? { channel } : {}),
  });
}
