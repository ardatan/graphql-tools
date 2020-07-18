import { exec, execSync } from 'child_process';

type Input = { ref: string; path: string };

const createLoadError = (error: any) => new Error('Unable to load file from git: ' + error);
const createCommand = ({ ref, path }: Input) => {
  return `git show ${ref}:${path}`;
};

/**
 * @internal
 */
export async function loadFromGit(input: Input): Promise<string | never> {
  try {
    return await new Promise((resolve, reject) => {
      exec(createCommand(input), { encoding: 'utf-8' }, (error, stdout) => {
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
    return execSync(createCommand(input), { encoding: 'utf-8' });
  } catch (error) {
    throw createLoadError(error);
  }
}
