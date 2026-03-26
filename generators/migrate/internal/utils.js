import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export const getJHipsterVersion = () => {
  const packageJson = join(fileURLToPath(new URL('../../../package.json', import.meta.url)));
  return JSON.parse(readFileSync(packageJson).toString()).version;
};
