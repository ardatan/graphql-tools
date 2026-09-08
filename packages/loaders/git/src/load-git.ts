import { execFile, execFileSync } from 'child_process';
import unixify from 'unixify';

type PartialInput = { ref: string };
type Input = PartialInput & { path: string };

const createLoadError = (error: any) => new Error('Unable to load file from git: ' + error);
const createShowCommand = ({ ref, path }: Input): string[] => {
  return ['show', `${ref}:${path}`];
};

const createTreeError = (error: Error) =>
  new Error('Unable to load the file tree from git: ' + error);
const createTreeCommand = ({ ref }: PartialInput): string[] => {
  return ['ls-tree', '-r', '--name-only', ref];
};

/**
 * @internal
 */
export function parseGitTreeOutput(stdout: string): string[] {
  // Git always emits LF; do not use os.EOL (CRLF on Windows) or the tree
  // collapses to a single unusable entry and micromatch matches nothing.
  // Do not trim entries — git pathnames can legally have leading/trailing spaces.
  return stdout
    .split(/\r?\n/)
    .filter(line => line.length > 0)
    .map(line => unixify(line));
}

/**
 * @internal
 */
export async function readTreeAtRef(ref: string): Promise<string[] | never> {
  try {
    return await new Promise((resolve, reject) => {
      execFile(
        'git',
        createTreeCommand({ ref }),
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(parseGitTreeOutput(stdout));
          }
        },
      );
    });
  } catch (error: any) {
    throw createTreeError(error);
  }
}

/**
 * @internal
 */
export function readTreeAtRefSync(ref: string): string[] | never {
  try {
    return parseGitTreeOutput(
      execFileSync('git', createTreeCommand({ ref }), { encoding: 'utf-8' }),
    );
  } catch (error: any) {
    throw createTreeError(error);
  }
}

/**
 * @internal
 */
export async function loadFromGit(input: Input): Promise<string | never> {
  try {
    return await new Promise((resolve, reject) => {
      execFile(
        'git',
        createShowCommand(input),
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        },
      );
    });
  } catch (error: any) {
    throw createLoadError(error);
  }
}

/**
 * @internal
 */
export function loadFromGitSync(input: Input): string | never {
  try {
    return execFileSync('git', createShowCommand(input), { encoding: 'utf-8' });
  } catch (error: any) {
    throw createLoadError(error);
  }
}
