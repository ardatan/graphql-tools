import { execFile, execFileSync } from 'child_process';

type Input = { ref: string; path: string };

const createLoadError = (error: any) => new Error('Unable to load file from git: ' + error);
const createCommand = ({ ref, path }: Input): string[] => {
  return ['show', `${ref}:${path}`];
};

/**
 * @internal
 */
export async function loadFromGit(input: Input): Promise<string | never> {
  try {
    return await new Promise((resolve, reject) => {
      execFile('git', createCommand(input), { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  } catch (error) {
    throw createLoadError(error);
  }
}

/**
 * @internal
 */
export function loadFromGitSync(input: Input): string | never {
  try {
    return execFileSync('git', createCommand(input), { encoding: 'utf-8' });
  } catch (error) {
    throw createLoadError(error);
  }
}
