import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// eslint-disable-next-line
// @ts-ignore
import cuid from 'scuid';

export const getTmpDir = () => {
  const dir = path.join(os.tmpdir(), cuid() + '/');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
