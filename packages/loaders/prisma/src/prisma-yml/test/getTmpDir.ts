import * as os from 'os';
// eslint-disable-next-line
// @ts-ignore
import cuid from 'scuid';
import * as path from 'path';
import * as fs from 'fs-extra';

export const getTmpDir = () => {
  const dir = path.join(os.tmpdir(), cuid() + '/');
  fs.mkdirpSync(dir);
  return dir;
};
