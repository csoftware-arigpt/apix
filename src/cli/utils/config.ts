import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ApixConfig {
  baseUrl: string;
  authType: string;
  authEnvVar: string;
  specPath: string;
  generatedAt: string;
}

const CONFIG_FILE = 'apix.config.json';

export async function writeConfig(dir: string, config: ApixConfig): Promise<void> {
  const path = join(dir, CONFIG_FILE);
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function readConfig(dir: string): Promise<ApixConfig> {
  const path = join(dir, CONFIG_FILE);
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as ApixConfig;
}
